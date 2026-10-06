'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

export default function MechanicClusterLayer({ 
  mechanics = [], 
  onlineIcon, 
  offlineIcon, 
  onSelectMechanic 
}) {
  const map = useMap()
  const clusterGroupRef = useRef(null)

  // Initialize MarkerClusterGroup for Mechanics (distinct dark slate cluster styling)
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
            html: `<div class="flex items-center justify-center h-9 w-9 rounded-full bg-slate-900 text-amber-400 font-black text-xs border-2 border-amber-400 shadow-lg ring-2 ring-slate-900/40"><span>${count}</span></div>`,
            className: 'custom-mechanic-cluster-icon',
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

  // Update markers on cluster layer whenever mechanics list changes
  useEffect(() => {
    if (!map || !clusterGroupRef.current || typeof window === 'undefined') return

    const L = require('leaflet')
    clusterGroupRef.current.clearLayers()

    const markers = []
    for (const m of mechanics) {
      if (!m.markerCoordinates) continue
      const isOnline = m.statusMode === 'online'
      const icon = isOnline ? onlineIcon : offlineIcon
      if (!icon) continue

      const marker = L.marker(m.markerCoordinates, { icon })
      marker.on('click', () => {
        if (onSelectMechanic) onSelectMechanic(m)
      })
      markers.push(marker)
    }

    if (markers.length > 0) {
      clusterGroupRef.current.addLayers(markers)
    }
  }, [map, mechanics, onlineIcon, offlineIcon, onSelectMechanic])

  return null
}
