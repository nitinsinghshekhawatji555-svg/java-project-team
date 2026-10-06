'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { 
  Wrench, Fuel, Search, Navigation, AlertTriangle, Star, 
  MapPin,  ChevronRight, X, Compass
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizeGeoPoint, formatDistance } from '@/lib/utils'
import toast from 'react-hot-toast'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import OverpassFuelLayer from '@/components/map/OverpassFuelLayer'
import MechanicClusterLayer from '@/components/map/MechanicClusterLayer'
import { useFuelLayer } from '@/hooks/useFuelLayer'

import FullBleedMapShell from '@/components/map/FullBleedMapShell'
import CoachMark from '@/components/onboarding/coach-mark'
import { useOnboarding } from '@/hooks/useOnboarding'

// Dynamic imports for Leaflet components (SSR-safe)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-[#F6F2E7]"><Spinner /></div> }
)
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })

function MapLifecycleHandler({ containerRef, onMapReady }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    if (!map) return

    if (onMapReady) {
      onMapReady(map)
    }

    map.whenReady(() => {
      map.invalidateSize()
    })
    map.invalidateSize()

    const container = containerRef?.current || (typeof map.getContainer === 'function' ? map.getContainer() : null)
    if (!container || typeof ResizeObserver === 'undefined') return

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [map, containerRef, onMapReady])

  return null
}

function MapController({ center, zoom, onViewportChange }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  const debounceRef = useRef(null)
  const isInitializedRef = useRef(false)

  // Smoothly center the map when user location or initial position changes
  useEffect(() => {
    if (map && center && center[0] && center[1]) {
      if (!isInitializedRef.current) {
        map.setView(center, zoom || map.getZoom() || 13)
        isInitializedRef.current = true
      }
    }
  }, [map, center, zoom])

  useEffect(() => {
    if (!map || !onViewportChange) return

    const handleMoveEnd = () => {
      try {
        const bounds = map.getBounds()
        const mapCenter = map.getCenter()
        if (bounds && mapCenter && bounds.isValid && bounds.isValid()) {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            onViewportChange(bounds, mapCenter)
          }, 400)
        }
      } catch (e) {
        console.warn('Viewport bounds not yet initialized:', e)
      }
    }

    // Trigger after map ready
    map.whenReady(() => {
      handleMoveEnd()
    })

    map.on('moveend', handleMoveEnd)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      map.off('moveend', handleMoveEnd)
    }
  }, [map, onViewportChange])

  return null
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function DriverExploreMap() {
  const router = useRouter()
  const { shouldShow: showSkipCoachMark, dismiss: dismissSkipCoachMark } = useOnboarding('driver_skip_hint_v1')
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [mechanics, setMechanics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRecentering, setIsRecentering] = useState(false)
  
  // Filter controls
  const [searchQuery, setSearchQuery] = useState('')
  const [showMechanics, setShowMechanics] = useState(true)
  const [showFuelStations, toggleFuelStations, , isHydrated] = useFuelLayer()
  const [availabilityFilter, setAvailabilityFilter] = useState('all') // 'all', 'online', 'offline'

  // User location
  const [userLocation, setUserLocation] = useState([5.6037, -0.1870]) // Default: Accra
  const [hasUserLocation, setHasUserLocation] = useState(false)

  // Selected mechanic for inspection drawer
  const [selectedMechanic, setSelectedMechanic] = useState(null)

  // Leaflet icons
  const [onlineIcon, setOnlineIcon] = useState(null)
  const [offlineIcon, setOfflineIcon] = useState(null)
  const [userIcon, setUserIcon] = useState(null)

  // Setup Leaflet marker icons
  useEffect(() => {
    if (typeof window === 'undefined') return
    const L = require('leaflet')
    delete L.Icon.Default.prototype._getIconUrl

    const online = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    const offline = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    const usr = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    setOnlineIcon(online)
    setOfflineIcon(offline)
    setUserIcon(usr)
  }, [])

  // Get current user GPS location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude]
          setUserLocation(coords)
          setHasUserLocation(true)
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(coords, 13)
          }
        },
        (err) => {
          console.warn('[EXPLORE] User geolocation fallback to Accra:', err.message)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // Recenter on user's current GPS location with error handling and live map flyTo
  const handleRecenter = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Location unavailable - enable location access')
      return
    }

    setIsRecentering(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsRecentering(false)
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(coords)
        setHasUserLocation(true)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 15, {
            animate: true,
            duration: 1.2,
          })
        }
      },
      (err) => {
        setIsRecentering(false)
        console.warn('[EXPLORE RECENTER ERROR]:', err)
        toast.error('Location unavailable - enable location access')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }, [])

  // State for zoom out limit warning (e.g. > 30km radius)
  const [zoomTooLow, setZoomTooLow] = useState(false)
  const MAX_RADIUS_KM = 30

  // Fetch approved mechanics and resolve marker rules constrained by viewport bounds
  const fetchApprovedMechanics = useCallback(async (bounds, center) => {
    if (!bounds || !center) return

    const south = bounds.getSouth()
    const west = bounds.getWest()
    const north = bounds.getNorth()
    const east = bounds.getEast()

    // Calculate viewport diagonal radius in km
    const radiusKm = calculateDistanceKm(center.lat, center.lng, north, east)

    if (radiusKm && radiusKm > MAX_RADIUS_KM) {
      setZoomTooLow(true)
      setMechanics([])
      setLoading(false)
      return
    }

    setZoomTooLow(false)
    setLoading(true)
    setError(null)
    const supabase = createClient()

    try {
      /**
       * Marker Query Rules:
       * 1. WHERE verification_status = 'approved' only (unverified/pending never appear)
       * 2. Query mechanic_profiles with exact confirmed column names:
       *    is_available, current_location, base_location, base_location_label, show_base_location_offline
       * 3. Bounds-constrained with padding (15%) to avoid edge pops
       */
      const latPadding = Math.abs(north - south) * 0.15
      const lngPadding = Math.abs(east - west) * 0.15
      const minLat = south - latPadding
      const maxLat = north + latPadding
      const minLng = west - lngPadding
      const maxLng = east + lngPadding

      const { data, error: fetchErr } = await supabase
        .from('mechanic_profiles')
        .select(`
          user_id,
          business_name,
          years_experience,
          specializations,
          rating_avg,
          rating_count,
          is_available,
          location_label,
          service_mode,
          current_location,
          base_location,
          base_location_label,
          show_base_location_offline,
          verification_status
        `)
        .eq('verification_status', 'approved')

      if (fetchErr) throw fetchErr

      // Process and apply strict marker filtering & bounds containment rules
      const validMechanics = []

      for (const m of (data || [])) {
        const isOnline = m.is_available === true

        if (isOnline) {
          // Rule: If online (is_available = true), render marker at current_location
          if (m.current_location) {
            const coords = normalizeGeoPoint(m.current_location)
            if (coords && coords[0] && coords[1]) {
              const [lat, lng] = coords
              if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
                validMechanics.push({
                  ...m,
                  statusMode: 'online',
                  markerCoordinates: coords,
                  displayLocationLabel: m.location_label || 'Current GPS Location',
                })
              }
            }
          }
        } else {
          // Rule: If offline (is_available = false), ONLY render if base_location is non-null AND show_base_location_offline is true
          if (m.show_base_location_offline === true && m.base_location) {
            const coords = normalizeGeoPoint(m.base_location)
            if (coords && coords[0] && coords[1]) {
              const [lat, lng] = coords
              if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
                validMechanics.push({
                  ...m,
                  statusMode: 'offline',
                  markerCoordinates: coords,
                  displayLocationLabel: m.base_location_label || m.location_label || 'Workshop / Base',
                })
              }
            }
          }
        }
      }

      setMechanics(validMechanics)
    } catch (err) {
      console.error('[MAP DISCOVERY FETCH ERROR]:', err)
      setError(err.message || 'Failed to load mechanics')
    } finally {
      setLoading(false)
    }
  }, [])

  // Filtered mechanics based on search & availability filters
  const visibleMechanics = useMemo(() => {
    if (!showMechanics) return []
    return mechanics.filter((m) => {
      // Availability filter
      if (availabilityFilter === 'online' && m.statusMode !== 'online') return false
      if (availabilityFilter === 'offline' && m.statusMode !== 'offline') return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = m.business_name?.toLowerCase().includes(q)
        const matchLoc = m.displayLocationLabel?.toLowerCase().includes(q)
        const matchSpecs = Array.isArray(m.specializations)
          ? m.specializations.some((s) => s.toLowerCase().includes(q))
          : typeof m.specializations === 'string' && m.specializations.toLowerCase().includes(q)
        return matchName || matchLoc || matchSpecs
      }

      return true
    })
  }, [mechanics, showMechanics, availabilityFilter, searchQuery])

  // Selected mechanic distance
  const selectedDistance = useMemo(() => {
    if (!selectedMechanic?.markerCoordinates || !userLocation) return null
    return calculateDistanceKm(
      userLocation[0],
      userLocation[1],
      selectedMechanic.markerCoordinates[0],
      selectedMechanic.markerCoordinates[1]
    )
  }, [selectedMechanic, userLocation])

  const topControls = (
    <>
      {/* Search Input Box */}
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-[#DCCDA9] shadow-lg">
        <Search size={18} className="text-[#7C6B44] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mechanics, skills, locations..."
          className="w-full bg-transparent text-xs font-semibold text-[#1F1B10] placeholder-[#7C6B44]/60 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Layer Filters (Mechanics vs Fuel Stations) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setShowMechanics(!showMechanics)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide border transition-all cursor-pointer shadow-sm shrink-0 ${
            showMechanics
              ? 'bg-[#1F1B10] text-white border-[#1F1B10]'
              : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Wrench size={13} className={showMechanics ? 'text-amber-400' : 'text-slate-500'} />
          <span>
            {visibleMechanics.length > 0
              ? `Mechanics (${visibleMechanics.length})`
              : loading
              ? 'Searching mechanics...'
              : 'Mechanics'}
          </span>
        </button>

        {isHydrated && (
          <button
            onClick={() => toggleFuelStations()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide border transition-all cursor-pointer shadow-sm shrink-0 ${
              showFuelStations
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Fuel size={13} className={showFuelStations ? 'text-amber-200' : 'text-amber-600'} />
            <span>Fuel Stations</span>
          </button>
        )}

        {showMechanics && (
          <div className="flex items-center bg-white/90 border border-slate-200 rounded-full p-0.5 shadow-sm shrink-0">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                availabilityFilter === 'all' ? 'bg-[#1F1B10] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAvailabilityFilter('online')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                availabilityFilter === 'online' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </button>
            <button
              onClick={() => setAvailabilityFilter('offline')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                availabilityFilter === 'offline' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline Bases
            </button>
          </div>
        )}
      </div>

      {/* Zoom Out / Radius Cap Warning Banner */}
      {zoomTooLow && (
        <div className="bg-amber-500 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md border border-amber-400 flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle size={15} className="text-slate-950 shrink-0" />
          <span>Map view too wide. Zoom in to see nearby mechanics and fuel stations.</span>
        </div>
      )}
    </>
  )

  const actionControls = (
    <>
      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        disabled={isRecentering}
        className="h-11 w-11 bg-white/95 text-slate-700 rounded-2xl border border-[#DCCDA9] shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        title="Re-center on my location"
        aria-label="Re-center on my location"
      >
        <Compass size={22} className={`text-[#7C6B44] ${isRecentering ? 'animate-spin' : ''}`} />
      </button>

      {/* Skip to Request Button (Pill Action) */}
      <button
        type="button"
        data-tour="driver-skip-btn"
        onClick={() => router.push('/dashboard/driver/request')}
        className="h-11 px-4 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider shadow-xl flex items-center justify-center gap-1.5 hover:bg-black/75 hover:border-white/30 active:scale-95 transition-all cursor-pointer"
        aria-label="Skip to request assistance"
      >
        <span>Skip</span>
        <ChevronRight size={16} className="text-white/80" />
      </button>
    </>
  )

  const bottomDrawer = selectedMechanic ? (
    <div className="bg-white rounded-3xl border border-[#DCCDA9] shadow-2xl overflow-hidden transition-all animate-in slide-in-from-bottom-6 duration-300">
      {/* Drawer Header Handle & Close */}
      <div className="relative px-5 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between bg-[#FFF9EF]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#1F1B10] flex items-center justify-center text-amber-400 shrink-0 font-black text-base shadow-sm">
            {selectedMechanic.business_name?.[0] || 'M'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#1F1B10]">
                {selectedMechanic.business_name || 'Certified Mechanic'}
              </h3>
              <Badge
                variant={selectedMechanic.statusMode === 'online' ? 'success' : 'default'}
                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5"
              >
                {selectedMechanic.statusMode === 'online' ? (
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="text-slate-600">Base / Offline</span>
                )}
              </Badge>
            </div>
            <p className="text-xs text-[#7C6B44] flex items-center gap-1.5 mt-0.5">
              <MapPin size={12} className="text-[#7C6B44]" />
              {selectedMechanic.displayLocationLabel}
            </p>
          </div>
        </div>

        <button
          onClick={() => setSelectedMechanic(null)}
          className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Body: Metrics & Specializations */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rating</span>
            <p className="text-sm font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              {selectedMechanic.rating_avg ? Number(selectedMechanic.rating_avg).toFixed(1) : '5.0'}
              <span className="text-[10px] font-medium text-slate-400">({selectedMechanic.rating_count || 0})</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Distance</span>
            <p className="text-sm font-black text-slate-800 mt-0.5">
              {selectedDistance !== null ? formatDistance(selectedDistance) : 'Nearby'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Experience</span>
            <p className="text-sm font-black text-slate-800 mt-0.5">
              {selectedMechanic.years_experience ? `${selectedMechanic.years_experience} yrs` : 'Certified'}
            </p>
          </div>
        </div>

        {/* Specializations list */}
        {selectedMechanic.specializations && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Specialized In
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(selectedMechanic.specializations)
                ? selectedMechanic.specializations
                : typeof selectedMechanic.specializations === 'string'
                ? selectedMechanic.specializations.split(',')
                : []
              ).map((spec, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/60 text-[11px] font-bold"
                >
                  {typeof spec === 'string' ? spec.trim() : spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Drawer Dual Actions: Directions & Request Assistance */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const [lat, lng] = selectedMechanic.markerCoordinates
              const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
            className="h-12 rounded-2xl border-2 border-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            Directions Only
          </Button>

          <Button
            type="button"
            onClick={() => {
              router.push(`/driver/request?mechanicId=${selectedMechanic.user_id}`)
            }}
            className="h-12 rounded-2xl bg-primary hover:bg-primary-hover text-[#1F1B10] font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            Request Assistance
          </Button>
        </div>

      </div>
    </div>
  ) : null

  return (
    <FullBleedMapShell
      topOverlay={topControls}
      controlOverlay={actionControls}
      bottomOverlay={bottomDrawer}
    >
      <div ref={mapContainerRef} className="h-full w-full">
        <MapContainer
          center={userLocation}
          zoom={13}
          minZoom={3}
          maxZoom={19}
          style={{ height: '100%', width: '100%', minHeight: '100%' }}
          zoomControl={false}
          className="h-full w-full"
        >
          <MapLifecycleHandler 
            containerRef={mapContainerRef} 
            onMapReady={(map) => { mapInstanceRef.current = map }}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            minZoom={3}
          />

        <MapController 
          center={userLocation} 
          onViewportChange={fetchApprovedMechanics}
        />

        {/* User Location Marker */}
        {userIcon && (
          <Marker position={userLocation} icon={userIcon} />
        )}

        {/* Clustered Mechanic Markers Layer */}
        {showMechanics && (
          <MechanicClusterLayer
            mechanics={visibleMechanics}
            onlineIcon={onlineIcon}
            offlineIcon={offlineIcon}
            onSelectMechanic={(m) => setSelectedMechanic(m)}
          />
        )}

        {/* Clustered Overpass Live Fuel/EV Layer */}
        <OverpassFuelLayer isActive={isHydrated && showFuelStations} />
      </MapContainer>
      </div>

      <CoachMark
        targetSelector='[data-tour="driver-skip-btn"]'
        title="Quick Skip"
        message="In a hurry? Tap 'Skip' to go straight to the request form without waiting for the map."
        isOpen={showSkipCoachMark}
        onDismiss={() => dismissSkipCoachMark('driver_skip_hint_v1')}
      />
    </FullBleedMapShell>
  )
}
