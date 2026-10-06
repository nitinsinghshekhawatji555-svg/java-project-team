'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Fuel, Compass } from 'lucide-react'
import toast from 'react-hot-toast' // Added hot-toast import
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import OverpassFuelLayer from '@/components/map/OverpassFuelLayer'
import { useFuelLayer } from '@/hooks/useFuelLayer'

const ACCRA_LAT = 5.6037
const ACCRA_LNG = -0.1870

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div style={{ height: '300px' }} className="animate-pulse bg-slate-100 rounded-xl" /> }
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

function MapClickHandler({ onClick }) {
  const { useMapEvent } = require('react-leaflet')
  useMapEvent('click', (event) => {
    onClick(event.latlng.lat, event.latlng.lng)
  })
  return null
}

function MapController({ center, zoom }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  
  useEffect(() => {
    if (map) {
      map.setView(center, zoom)
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }
  }, [map, center, zoom])
  
  return null
}

export default function LocationPicker({ onSelect, onLocationSelect }) {
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [address, setAddress] = useState('')
  const [mapCenter, setMapCenter] = useState([ACCRA_LAT, ACCRA_LNG])
  const [customIcon, setCustomIcon] = useState(null)
  const [showStations, toggleShowStations, , isHydrated] = useFuelLayer()
  const callbackRef = useRef(null)

  useEffect(() => {
    callbackRef.current = onSelect || onLocationSelect
  }, [onSelect, onLocationSelect])

  useEffect(() => {
    const L = require('leaflet')
    delete L.Icon.Default.prototype._getIconUrl
    
    Promise.resolve().then(() => {
      setCustomIcon(
        new L.Icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      )
    })
  }, [])

  const reverseGeocode = useCallback(async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (!response.ok) return null
      const data = await response.json()
      return data?.display_name || null
    } catch (error) {
      console.warn('Reverse geocoding failed:', error)
      return null
    }
  }, [])

  const placeMarkerValue = useCallback((latitude, longitude, showToast = false) => {
    const nextLat = Number(latitude.toFixed(6))
    const nextLng = Number(longitude.toFixed(6))

    setLat(String(nextLat))
    setLng(String(nextLng))
    setMapCenter([nextLat, nextLng])

    void reverseGeocode(nextLat, nextLng).then((geocodedAddress) => {
      const label = geocodedAddress || `${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}`
      setAddress(label)

      if (callbackRef.current) {
        callbackRef.current({
          lat: nextLat,
          lng: nextLng,
          latitude: nextLat,
          longitude: nextLng,
          address: label,
        })
      }

      // Trigger user toast feedback if explicitly designated by human control parameters
      if (showToast) {
        toast.success('Location confirmed')
      }
    })
  }, [reverseGeocode])

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation sensor completely missing on this browser engine.')
      placeMarkerValue(ACCRA_LAT, ACCRA_LNG)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        placeMarkerValue(position.coords.latitude, position.coords.longitude, true)
      },
      (error) => {
        console.warn('Geolocation sensor error profile:', error.message)
        placeMarkerValue(ACCRA_LAT, ACCRA_LNG)
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    )
  }, [placeMarkerValue])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => { detectLocation() }, 200)
      return () => clearTimeout(timeoutId)
    }
  }, [detectLocation])

  function confirmManualLocation() {
    const nextLat = Number(lat)
    const nextLng = Number(lng)
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      toast.error('Invalid coordinates supplied')
      return
    }
    // Set flag parameter to true to trigger confirmation toast alert banner
    placeMarkerValue(nextLat, nextLng, true)
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 shadow-sm z-0">
        <MapContainer
          center={mapCenter}
          zoom={14}
          maxZoom={19}
          minZoom={3}
          style={{ height: '300px', width: '100%' }}
          className="rounded-[1.25rem] border border-slate-200"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          {(lat && lng && customIcon) && (
            <Marker position={[Number(lat), Number(lng)]} icon={customIcon} />
          )}
          <OverpassFuelLayer
            isActive={isHydrated && showStations}
            onSelectPickup={(lat, lng) => placeMarkerValue(lat, lng, true)}
          />
          <MapClickHandler onClick={(latitude, longitude) => placeMarkerValue(latitude, longitude, true)} />
          <MapController center={mapCenter} zoom={14} />
        </MapContainer>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={detectLocation} className="h-11 rounded-xl text-xs font-bold uppercase tracking-wider flex-1 flex items-center justify-center gap-1.5">
          <Compass size={14} />
          <span>Detect Location</span>
        </Button>
        {isHydrated && (
          <button
            type="button"
            onClick={() => toggleShowStations()}
            className={`h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all ${
              showStations
                ? 'border-amber-500 bg-amber-50 text-amber-600 ring-1 ring-amber-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Fuel size={14} />
            {showStations ? 'Hide Fuel/EV Stations' : 'Show Fuel/EV Stations'}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position Parameter Descriptors</p>
        
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          label="Confirmed Incident Address"
          placeholder="Verifying location landmarks..."
          className="bg-slate-50/50"
        />

        <div className="grid gap-3 grid-cols-2">
          <Input value={lat} onChange={(e) => setLat(e.target.value)} label="Latitude Coordinates" placeholder="5.6037" type="number" step="0.0001" />
          <Input value={lng} onChange={(e) => setLng(e.target.value)} label="Longitude Coordinates" placeholder="-0.1870" type="number" step="0.0001" />
        </div>

        <Button
          fullWidth
          onClick={confirmManualLocation}
          disabled={!lat || !lng}
          className="bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider h-11"
        >
          Confirm Location
        </Button>
      </div>
    </div>
  )
}