'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useMap } from 'react-leaflet' 
import { useWatchMechanicLocation } from '@/hooks/useMechanicLocation'
import { useFuelLayer } from '@/hooks/useFuelLayer'
import OverpassFuelLayer from '@/components/map/OverpassFuelLayer'
import { Fuel, AlertTriangle } from 'lucide-react'

function MapLifecycleHandler({ containerRef }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

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
  }, [map, containerRef])

  return null
}

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div style={{ height: '420px' }} className="animate-pulse bg-slate-100 rounded-xl" /> }
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

function FitBounds({ positions }) {
  const mapHook = useMap()
  useEffect(() => {
    if (mapHook && positions.length > 0) {
      const L = require('leaflet')
      const bounds = L.latLngBounds(positions)
      mapHook.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [mapHook, positions])
  return null
}

function normalizePoint(point) {
  if (!point) return null
  
  let lat = NaN
  let lng = NaN

  if (typeof point.latitude !== 'undefined' && typeof point.longitude !== 'undefined') {
    lat = parseFloat(point.latitude)
    lng = parseFloat(point.longitude)
  } else if (typeof point.lat !== 'undefined' && typeof point.lng !== 'undefined') {
    lat = parseFloat(point.lat)
    lng = parseFloat(point.lng)
  } else if (point.coordinates && Array.isArray(point.coordinates) && point.coordinates.length === 2) {
    lat = parseFloat(point.coordinates[1])
    lng = parseFloat(point.coordinates[0])
  }

  if (isNaN(lat) || isNaN(lng)) return null
  return { lat, lng }
}

export default function RescueMap({
  request,
  driverLocation,
  mechanicLocation,
  incomingJobs = [],
  isRadarMode = false,
  height = '360px',
  userRole = 'driver',
  isOnline = false,
  showFooter = true,
  className = '',
}) {
  const activeRequestId = request && ['accepted', 'en_route', 'arrived', 'in_progress'].includes(request.status) ? request.id : null
  const { mechanicLocation: watchedLoc } = useWatchMechanicLocation(activeRequestId)

  const profileData = request?.mechanic?.mechanic_profiles?.[0] || request?.mechanic?.mechanic_profiles || request?.assignedMechanic?.mechanic_profiles?.[0] || request?.assignedMechanic?.mechanic_profiles
  const serviceMode = profileData?.service_mode || 'mobile'
  const isFixed = serviceMode === 'fixed_location'
  const staticShopLocation = isFixed ? profileData?.current_location : null

  const finalMechanicLocation = mechanicLocation || (userRole === 'driver' ? watchedLoc : null) || staticShopLocation

  const driver = normalizePoint(driverLocation) || normalizePoint(request?.incident_location)
  const mechanic = normalizePoint(finalMechanicLocation)

  const [driverIcon, setDriverIcon] = useState(null)
  const [mechanicIcon, setMechanicIcon] = useState(null)
  const [strandedIcon, setStrandedIcon] = useState(null)
  const [showFuelStations, , , isHydrated] = useFuelLayer()

  useEffect(() => {
    const L = require('leaflet')
    delete L.Icon.Default.prototype._getIconUrl
    const drv = new L.Icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
    const mech = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
    const strnd = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
    Promise.resolve().then(() => {
      setDriverIcon(drv)
      setMechanicIcon(mech)
      setStrandedIcon(strnd)
    })
  }, [])

  // ==========================================
  // Declarative boundary rules definition
  // ==========================================
  let showDriverMarker = false
  let showMechanicMarker = false
  let showPolyline = false
  let showIncomingDistressPins = false

  if (userRole === 'driver') {
    showDriverMarker = !!driver
    showMechanicMarker = !!(activeRequestId && mechanic)
    showPolyline = !!(activeRequestId && driver && mechanic)
  } else if (userRole === 'mechanic') {
    if (isOnline) {
      if (isRadarMode) {
        showDriverMarker = false
        showMechanicMarker = !!mechanic
        showPolyline = false
        showIncomingDistressPins = true
      } else {
        // Active Dispatch
        showDriverMarker = !!driver
        showMechanicMarker = !!mechanic
        showPolyline = !!(driver && mechanic)
      }
    } else {
      // Offline: isolated mechanic
      showDriverMarker = false
      showMechanicMarker = !!mechanic
      showPolyline = false
    }
  } else {
    // Admin / Default
    showDriverMarker = !!driver
    showMechanicMarker = !!mechanic
    showPolyline = !!(driver && mechanic)
  }

  const mapCenter = useMemo(() => {
    if (userRole === 'driver') {
      if (driver?.lat && driver?.lng) return [driver.lat, driver.lng]
    } else if (userRole === 'mechanic') {
      if (mechanic?.lat && mechanic?.lng) return [mechanic.lat, mechanic.lng]
    }
    if (driver?.lat && driver?.lng) return [driver.lat, driver.lng]
    if (mechanic?.lat && mechanic?.lng) return [mechanic.lat, mechanic.lng]
    return [5.6037, -0.1870]
  }, [userRole, driver, mechanic])

  const positions = useMemo(() => {
    const pos = []
    if (showDriverMarker && driver?.lat && driver?.lng) {
      pos.push([driver.lat, driver.lng])
    }
    if (showMechanicMarker && mechanic?.lat && mechanic?.lng) {
      pos.push([mechanic.lat, mechanic.lng])
    }
    if (showIncomingDistressPins && incomingJobs && incomingJobs.length > 0) {
      incomingJobs.forEach((job) => {
        const coords = normalizePoint(job.incident_location)
        if (coords?.lat && coords?.lng) pos.push([coords.lat, coords.lng])
      })
    }
    return pos
  }, [showDriverMarker, showMechanicMarker, showIncomingDistressPins, driver, mechanic, incomingJobs])

  const routePositions = useMemo(() => {
    if (!showPolyline || !driver || !mechanic) return []
    return [[driver.lat, driver.lng], [mechanic.lat, mechanic.lng]]
  }, [showPolyline, driver, mechanic])

  const containerRef = useRef(null)

  return (
    <div ref={containerRef} className={`w-full h-full relative flex flex-col justify-between ${className}`} style={{ minHeight: showFooter ? height : '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        maxZoom={19}
        minZoom={3}
        style={{ height: '100%', width: '100%', flex: '1 1 auto' }}
        className="relative z-0 h-full w-full"
      >
        <MapLifecycleHandler containerRef={containerRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <FitBounds positions={positions} />

        {showDriverMarker && driver && driverIcon && (
          <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
            <Popup>
              <div className="p-1 min-w-[120px]">
                <p className="font-bold text-red-600 text-xs uppercase tracking-wider">Driver Position</p>
                <p className="font-semibold text-sm mt-1">{request?.vehicle_make || 'Vehicle Breakdown'}</p>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">{driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {showMechanicMarker && mechanic && mechanicIcon && (
          <Marker position={[mechanic.lat, mechanic.lng]} icon={mechanicIcon}>
            <Popup>
              <div className="p-1 min-w-[120px]">
                <p className="font-bold text-blue-600 text-xs uppercase tracking-wider">
                  {isFixed ? 'Workshop Base' : 'Mechanic Location'}
                </p>
                <p className="font-semibold text-sm mt-1">
                  {isFixed ? 'Fixed Location' : 'Active'}
                </p>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">{mechanic.lat.toFixed(4)}, {mechanic.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {showIncomingDistressPins && incomingJobs && incomingJobs.map((job) => {
          const jobCoords = normalizePoint(job.incident_location)
          if (!jobCoords || !strandedIcon) return null
          return (
            <Marker 
              key={`incoming-job-${job.id}`} 
              position={[jobCoords.lat, jobCoords.lng]} 
              icon={strandedIcon}
            >
              <Popup>
                <div className="p-1 min-w-[170px] font-sans">
                  <h4 className="font-bold text-sm text-red-600 m-0 uppercase tracking-wide flex items-center gap-1">
                    Breakdown Alert
                  </h4>
                  <p className="font-bold text-slate-800 text-xs mt-1.5 mb-0 capitalize">
                    {job.service_type?.replace('_', ' ')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-2 leading-normal">
                    {job.problem_description || 'Awaiting assistance.'}
                  </p>
                  <a
                    href={`/dashboard/mechanic/job/${job.id}`}
                    className="block w-full text-center py-1.5 rounded bg-slate-900 text-white font-bold text-[10px] uppercase hover:bg-slate-800 no-underline"
                  >
                    View Details
                  </a>
                </div>
              </Popup>
            </Marker>
          )
        })}

        <OverpassFuelLayer isActive={isHydrated && showFuelStations} />

        {routePositions.length === 2 && (
          <Polyline positions={routePositions} color="#0ea5e9" dashArray="8, 12" />
        )}
      </MapContainer>

      {/* Live coordinate info panel footer (Only shown for card-embedded mode) */}
      {showFooter && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xs z-20">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Incident Coordinates</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">
                {driver ? `${driver.lat.toFixed(4)}, ${driver.lng.toFixed(4)}` : 'Waiting'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                {userRole === 'mechanic' ? 'Your Location' : 'Responder Location'}
              </p>
              <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">
                {userRole === 'mechanic'
                  ? isOnline
                    ? mechanic
                      ? `${mechanic.lat.toFixed(4)}, ${mechanic.lng.toFixed(4)}`
                      : 'Acquiring GPS...'
                    : staticShopLocation
                      ? 'Shop Base (Offline)'
                      : 'Offline (Standby)'
                  : mechanic
                    ? `${mechanic.lat.toFixed(4)}, ${mechanic.lng.toFixed(4)}`
                    : 'Awaiting Responder'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}