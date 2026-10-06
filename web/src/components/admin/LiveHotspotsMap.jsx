'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import { Wrench, Phone, AlertTriangle, User, ShieldCheck } from 'lucide-react'

import 'leaflet/dist/leaflet.css'
import Badge from '@/components/ui/Badge'

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div style={{ height: '30rem' }} className="animate-pulse bg-slate-100 rounded-xl" /> }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
)

// Map Bounds Auto-Fit Component
function FitBounds({ positions }) {
  const mapHook = useMap()
  useEffect(() => {
    if (mapHook && positions.length > 0) {
      const L = require('leaflet')
      const bounds = L.latLngBounds(positions)
      mapHook.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [mapHook, positions])
  return null
}

function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (isNaN(lat) || isNaN(lng)) return false
  if (lat === 0 && lng === 0) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return true
}

// Robust parsing utility targeting multiple relational database string patterns
function extractCoords(obj) {
  if (!obj) return null
  
  // If it's a coordinate array directly [lng, lat]
  if (obj.coordinates && Array.isArray(obj.coordinates) && obj.coordinates.length === 2) {
    const lat = Number(obj.coordinates[1])
    const lng = Number(obj.coordinates[0])
    if (isValidCoordinate(lat, lng)) return { lat, lng }
  }
  
  // Otherwise check properties of the object itself
  const lat = Number(obj.latitude || obj.lat || obj.incident_lat || obj.current_location?.coordinates?.[1] || obj.current_location?.lat || obj.incident_location?.coordinates?.[1] || obj.incident_location?.lat)
  const lng = Number(obj.longitude || obj.lng || obj.incident_lng || obj.current_location?.coordinates?.[0] || obj.current_location?.lng || obj.incident_location?.coordinates?.[0] || obj.incident_location?.lng)

  if (isValidCoordinate(lat, lng)) {
    return { lat, lng }
  }
  return null
}

export default function LiveHotspotsMap({ mechanics = [], activeIncidents = [] }) {
  const defaultPosition = [5.6037, -0.1870] // Accra Operations Baseline Hub Center Coordinates
  const [liveLocations, setLiveLocations] = useState({})
  const [liveIncidents, setLiveIncidents] = useState(activeIncidents)
  const [onlineMechanics, setOnlineMechanics] = useState({})
  const [liveMechanics, setLiveMechanics] = useState(mechanics)
  const [strandedDriverIcon, setStrandedDriverIcon] = useState(null)
  const [yellowMechanicIcon, setYellowMechanicIcon] = useState(null)
  const [dispatchedMechanicIcon, setDispatchedMechanicIcon] = useState(null)

  useEffect(() => {
    const L = require('leaflet')
    delete L.Icon.Default.prototype._getIconUrl

    const baseLayout = {
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }

    const stranded = new L.Icon({
      ...baseLayout,
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    })

    const yellow = new L.Icon({
      ...baseLayout,
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
      iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    })

    const dispatched = new L.Icon({
      ...baseLayout,
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    })

    Promise.resolve().then(() => {
      setStrandedDriverIcon(stranded)
      setYellowMechanicIcon(yellow)
      setDispatchedMechanicIcon(dispatched)
    })
  }, [])

  const allPositions = useMemo(() => {
    const pos = []
    
    // Add driver locations
    liveIncidents?.forEach((incident) => {
      const coords = extractCoords(incident.incident_location) || 
                     (incident.incident_lat && incident.incident_lng ? { lat: Number(incident.incident_lat), lng: Number(incident.incident_lng) } : null)
      if (coords) pos.push([coords.lat, coords.lng])
    })

    // Add mechanic locations
    liveMechanics?.forEach((m) => {
      const isOnline = m.is_available === true || m.is_online === true || m.status === 'online'
      if (isOnline) {
        const liveLoc = liveLocations[m.user_id]
        const coords = liveLoc || extractCoords(m.current_location)
        if (coords) pos.push([coords.lat, coords.lng])
      }
    })

    return pos
  }, [liveIncidents, liveMechanics, liveLocations])

  useEffect(() => {
    Promise.resolve().then(() => {
      setLiveMechanics((prev) => {
        const mergedMap = new Map()
        
        // Keep currently online mechanics from prev state to prevent disappearing on parent polling
        prev.forEach((m) => {
          const isOnline = m.is_available === true || m.is_online === true || m.status === 'online'
          if (isOnline) {
            mergedMap.set(m.user_id, m)
          }
        })

        // Overlay/merge with newly polled mechanics list
        mechanics.forEach((m) => {
          mergedMap.set(m.user_id, m)
        })

        return Array.from(mergedMap.values())
      })
    })
  }, [mechanics])

  useEffect(() => {
    const { createClient } = require('@/lib/supabase/client')
    const supabase = createClient()

    const channel = supabase
      .channel('admin-mechanic-profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mechanic_profiles' },
        async (payload) => {
          const updated = payload.new || payload.old
          if (!updated) return

          const isOnline = updated.is_available === true || updated.is_online === true || updated.status === 'online'

          if (isOnline) {
            // Fetch profile nested details
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone, avatar_url')
              .eq('id', updated.user_id)
              .maybeSingle()

            const newMech = {
              ...updated,
              profiles: profile
            }

            setLiveMechanics((prev) => {
              const exists = prev.some((m) => m.user_id === updated.user_id)
              if (exists) {
                return prev.map((m) => m.user_id === updated.user_id ? newMech : m)
              } else {
                return [...prev, newMech]
              }
            })
          } else {
            // Remove offline mechanics immediately
            setLiveMechanics((prev) => prev.filter((m) => m.user_id !== updated.user_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Keep liveIncidents synced with parent activeIncidents props
  useEffect(() => {
    Promise.resolve().then(() => {
      setLiveIncidents(activeIncidents)
    })
  }, [activeIncidents])

  // 1. Subscribe to INSERT and UPDATE events on rescue_requests to render driver pins instantly
  useEffect(() => {
    const { createClient } = require('@/lib/supabase/client')
    const supabase = createClient()

    const channel = supabase
      .channel('admin-requests-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rescue_requests' },
        (payload) => {
          const newRequest = payload.new
          const isActive = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(newRequest.status)
          if (!isActive) return

          setLiveIncidents((prev) => {
            if (prev.some((req) => req.id === newRequest.id)) return prev
            return [newRequest, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rescue_requests' },
        (payload) => {
          const updatedRequest = payload.new
          const isActive = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(updatedRequest.status)

          setLiveIncidents((prev) => {
            if (isActive) {
              if (prev.some((req) => req.id === updatedRequest.id)) {
                return prev.map((req) => req.id === updatedRequest.id ? { ...req, ...updatedRequest } : req)
              } else {
                return [updatedRequest, ...prev]
              }
            } else {
              return prev.filter((req) => req.id !== updatedRequest.id)
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 2. Subscribe to Supabase Presence to track online mechanics immediately
  useEffect(() => {
    const { createClient } = require('@/lib/supabase/client')
    const supabase = createClient()
    const channel = supabase.channel('mechanic-presence')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const keys = Object.keys(state)
        const onlineMap = {}
        keys.forEach((key) => {
          onlineMap[key] = true
        })
        setOnlineMechanics(onlineMap)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 3. Subscribe to the standby online-mechanics broadcast channel
  useEffect(() => {
    const { createClient } = require('@/lib/supabase/client')
    const supabase = createClient()
    const channel = supabase
      .channel('online-mechanics')
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const { mechanicId, latitude, longitude } = payload.payload
        setLiveLocations((prev) => ({
          ...prev,
          [mechanicId]: { lat: latitude, lng: longitude }
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 4. Dynamically subscribe to active job channels (location-${requestId}) for fanned-out assigned locations
  useEffect(() => {
    if (!liveIncidents || liveIncidents.length === 0) return

    const { createClient } = require('@/lib/supabase/client')
    const supabase = createClient()
    const activeChannels = []

    liveIncidents.forEach((incident) => {
      if (!['accepted', 'en_route', 'arrived', 'in_progress'].includes(incident.status)) return

      const ch = supabase
        .channel(`location-${incident.id}`)
        .on('broadcast', { event: 'location_update' }, (payload) => {
          const { mechanicId, latitude, longitude } = payload.payload
          setLiveLocations((prev) => ({
            ...prev,
            [mechanicId]: { lat: latitude, lng: longitude }
          }))
        })
      
      ch.subscribe()
      activeChannels.push(ch)
    })

    return () => {
      activeChannels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [liveIncidents])

  return (
    <div className="w-full h-full min-h-[30rem] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 z-10 relative">
      <MapContainer 
        center={defaultPosition} 
        zoom={12} 
        scrollWheelZoom={true}
        className="w-full h-full min-h-[30rem]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic map auto-bounds fit component */}
        <FitBounds positions={allPositions} />

        {/* ======================= LAYER 1: STRANDED DRIVERS & SECTOR INCIDENTS ======================= */}
        {liveIncidents?.map((incident) => {
          const driverCoords = extractCoords(incident.incident_location) || 
                               (incident.incident_lat && incident.incident_lng ? { lat: Number(incident.incident_lat), lng: Number(incident.incident_lng) } : null)
          
          if (!driverCoords || !strandedDriverIcon) return null

          return (
            <Marker 
              key={`incident-${incident.id}`} 
              position={[driverCoords.lat, driverCoords.lng]} 
              icon={strandedDriverIcon}
            >
              <Popup>
                <div className="p-1 min-w-[170px] font-sans">
                  <h4 className="font-black text-sm text-red-600 m-0 flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle size={13} /> Breakdown Alert
                  </h4>
                  <p className="font-bold text-slate-800 text-xs mt-1.5 mb-0 capitalize">
                    {incident.service_type?.replace('_', ' ')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-0 leading-normal">
                    {incident.problem_description || 'Awaiting structural relief vectors.'}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Badge variant={incident.status} label={incident.status} />
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: ...{incident.id?.slice(-4)}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* ======================= LAYER 2: FIELD SERVICE MECHANICS (FLATTENED) ======================= */}
        {liveMechanics?.map((m) => {
          const activeAssignment = liveIncidents.find(
            (inc) => inc.mechanic_id === m.user_id && ['accepted', 'en_route', 'arrived', 'in_progress'].includes(inc.status)
          )

          const isOnline = m.is_available === true || m.is_online === true || m.status === 'online'

          // Only show if available (online)
          if (!isOnline) return null

          const liveLoc = liveLocations[m.user_id]
          const mechCoords = liveLoc || extractCoords(m.current_location)
          if (!mechCoords || !dispatchedMechanicIcon || !yellowMechanicIcon) return null

          return (
            <Marker 
              key={`mech-marker-${m.user_id}`} 
              position={[mechCoords.lat, mechCoords.lng]} 
              icon={activeAssignment ? dispatchedMechanicIcon : yellowMechanicIcon}
            >
              <Popup>
                <div className="p-1.5 min-w-[190px] font-sans text-xs">
                  <h4 className="font-black text-sm text-slate-900 m-0 flex items-center gap-1.5 uppercase">
                    <Wrench size={13} className={activeAssignment ? "text-emerald-500" : "text-amber-500"} /> 
                    {m.business_name || 'Independent Specialist'}
                  </h4>
                  <div className="mt-2 space-y-1 text-slate-600 font-medium">
                    <p className="m-0"><strong className="text-slate-400 font-bold uppercase text-[9px] tracking-wide block">Name</strong> {m.user?.full_name || m.profiles?.full_name || 'Vetted Specialist'}</p>
                    <p className="m-0"><strong className="text-slate-400 font-bold uppercase text-[9px] tracking-wide block">Phone</strong> {m.user?.phone || m.profiles?.phone || '—'}</p>
                    <p className="m-0">
                      <strong className="text-slate-400 font-bold uppercase text-[9px] tracking-wide block">Live Status</strong>
                      {activeAssignment ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          In Active Rescue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online & Available
                        </span>
                      )}
                    </p>
                    <p className="m-0"><strong className="text-slate-400 font-bold uppercase text-[9px] tracking-wide block">Last Located</strong> {m.updated_at ? new Date(m.updated_at).toLocaleTimeString() : 'Just now'}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {(m.user?.phone || m.profiles?.phone) && (
                      <a 
                        href={`tel:${m.user?.phone || m.profiles?.phone}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 no-underline"
                      >
                        <Phone size={10} /> Call Mechanic
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* ======================= LAYER 3: ROUTING VECTOR PASSES (SEPARATE FLATTENED STREAM) ======================= */}
        {mechanics?.map((m) => {
          const liveLoc = liveLocations[m.user_id]
          const mechCoords = liveLoc || extractCoords(m.current_location)
          if (!mechCoords) return null

          const activeAssignment = liveIncidents.find(
            (inc) => inc.mechanic_id === m.user_id && ['accepted', 'en_route', 'arrived', 'in_progress'].includes(inc.status)
          )
          if (!activeAssignment) return null

          const driverCoords = extractCoords(activeAssignment.incident_location) || 
                               (activeAssignment.incident_lat && activeAssignment.incident_lng ? { lat: Number(activeAssignment.incident_lat), lng: Number(activeAssignment.incident_lng) } : null)
          
          if (!driverCoords) return null

          return (
            <Polyline 
              key={`route-trail-${m.user_id}`} 
              positions={[
                [mechCoords.lat, mechCoords.lng],
                [driverCoords.lat, driverCoords.lng]
              ]} 
              color="#10b981" 
              weight={3}
              dashArray="6, 10" 
            />
          )
        })}
      </MapContainer>
    </div>
  )
}