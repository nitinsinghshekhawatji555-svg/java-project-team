'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useMap } from 'react-leaflet'

const MAX_RADIUS_KM = 30 // Cap query radius to 30km to prevent excessive queries

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371
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

export default function OverpassFuelLayer({ isActive, onSelectPickup }) {
  const map = useMap()
  const clusterGroupRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isActiveRef = useRef(isActive)
  const [zoomTooLow, setZoomTooLow] = useState(false)

  // Keep isActiveRef updated in sync synchronously
  useEffect(() => {
    isActiveRef.current = isActive
    if (!isActive) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
      }
    }
  }, [isActive])

  const fetchFuelStations = useCallback(async () => {
    if (!map || !isActiveRef.current) {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
      }
      return
    }

    const bounds = map.getBounds()
    const south = bounds.getSouth()
    const west = bounds.getWest()
    const north = bounds.getNorth()
    const east = bounds.getEast()

    // Calculate viewport diagonal radius in km
    const center = map.getCenter()
    const radiusKm = calculateDistanceKm(center.lat, center.lng, north, east)

    if (radiusKm && radiusKm > MAX_RADIUS_KM) {
      setZoomTooLow(true)
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
      }
      return
    }

    setZoomTooLow(false)

    // Abort any preceding query in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const currentController = new AbortController()
    abortControllerRef.current = currentController

    // Overpass QL query: Fetch fuel amenities within bounding box (nodes and ways)
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"](${south},${west},${north},${east});
        way["amenity"="fuel"](${south},${west},${north},${east});
      );
      out center;
    `
    const OVERPASS_ENDPOINTS = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ]

    let data = null
    for (const endpoint of OVERPASS_ENDPOINTS) {
      if (!isActiveRef.current || currentController.signal.aborted) return

      try {
        const timeoutId = setTimeout(() => currentController.abort(), 6000)

        const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
          signal: currentController.signal,
          headers: { Accept: 'application/json' },
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          data = await response.json()
          break
        }
      } catch (err) {
        // Fallback to next endpoint
        continue
      }
    }

    // Check if still active before mutating leaflet cluster layer
    if (!data || !isActiveRef.current || currentController.signal.aborted) {
      if (!isActiveRef.current && clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
      }
      return
    }

    try {
      const L = require('leaflet')

      // Clear previous markers
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
      }

      const fuelIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

      if (data.elements && clusterGroupRef.current && isActiveRef.current) {
        const markersToAdd = []
        data.elements.forEach((element) => {
          const lat = element.lat || (element.center && element.center.lat)
          const lng = element.lon || (element.center && element.center.lon)

          if (!lat || !lng) return

          const name = element.tags?.name || 'Fuel Station'
          const brand = element.tags?.brand || ''
          const operator = element.tags?.operator || ''
          const openingHours = element.tags?.['opening_hours'] || ''

          const popupDiv = document.createElement('div')
          popupDiv.className = 'p-1 min-w-[170px] font-sans'

          const title = document.createElement('h4')
          title.className = 'font-bold text-sm text-slate-800 m-0'
          title.innerText = name
          popupDiv.appendChild(title)

          if (brand) {
            const pBrand = document.createElement('p')
            pBrand.className = 'text-[11px] text-slate-500 mt-1 mb-0'
            pBrand.innerText = `Brand: ${brand}`
            popupDiv.appendChild(pBrand)
          }

          if (operator && operator !== brand) {
            const pOperator = document.createElement('p')
            pOperator.className = 'text-[10px] text-slate-400 mt-0.5 mb-0'
            pOperator.innerText = `Operator: ${operator}`
            popupDiv.appendChild(pOperator)
          }

          if (openingHours) {
            const pTime = document.createElement('p')
            pTime.className = 'text-[10px] text-emerald-600 font-semibold mt-1 mb-0'
            pTime.innerText = `Hours: ${openingHours}`
            popupDiv.appendChild(pTime)
          }

          const badge = document.createElement('span')
          badge.className = 'inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 mt-2 mb-2'
          badge.innerText = 'Fuel Station'
          popupDiv.appendChild(badge)

          if (onSelectPickup) {
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'w-full text-center py-1.5 rounded-lg bg-[#1F1B10] text-primary font-bold text-[10px] uppercase hover:bg-slate-800 transition-colors cursor-pointer'
            button.innerText = 'Select as Pickup'
            button.addEventListener('click', () => {
              onSelectPickup(lat, lng)
            })
            popupDiv.appendChild(button)
          }

          const marker = L.marker([lat, lng], { icon: fuelIcon }).bindPopup(popupDiv)
          markersToAdd.push(marker)
        })

        if (isActiveRef.current) {
          clusterGroupRef.current.addLayers(markersToAdd)
        }
      }
    } catch (error) {
      console.error('Error fetching live fuel stations:', error)
    }
  }, [map, onSelectPickup])

  // Initialize MarkerClusterGroup for Fuel Stations (distinct orange cluster styling)
  useEffect(() => {
    if (!map || typeof window === 'undefined') return

    const L = require('leaflet')
    require('leaflet.markercluster')

    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        disableClusteringAtZoom: 14,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        maxZoom: 19,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount()
          return L.divIcon({
            html: `<div class="flex items-center justify-center h-9 w-9 rounded-full bg-amber-600 text-white font-black text-xs border-2 border-white shadow-lg ring-2 ring-amber-500/40"><span>${count}</span></div>`,
            className: 'custom-fuel-cluster-icon',
            iconSize: L.point(36, 36),
            iconAnchor: [18, 18],
          })
        },
      })
      map.addLayer(clusterGroupRef.current)
    }

    return () => {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
        map.removeLayer(clusterGroupRef.current)
        clusterGroupRef.current = null
      }
    }
  }, [map])

  // Set up moveend listener with debounce timer and active guard
  useEffect(() => {
    if (!map) return

    if (!isActive) {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers()
      }
      return
    }

    // Load initial bounding box stations
    fetchFuelStations()

    const handleMoveEnd = () => {
      if (!isActiveRef.current) return
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          fetchFuelStations()
        }
      }, 400)
    }

    map.on('moveend', handleMoveEnd)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      map.off('moveend', handleMoveEnd)
    }
  }, [map, isActive, fetchFuelStations])

  return null
}
