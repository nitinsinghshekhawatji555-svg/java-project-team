// web/src/lib/utils.js
// Shared helpers used across components and lib functions.

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// format a distance for display
// e.g. 0.8 → "800 m", 2.4 → "2.4 km"
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// format a timestamp to a readable string
// e.g. "2 mins ago", "Just now"
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000)

  if (seconds < 30) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`

  return new Date(timestamp).toLocaleDateString()
}

// capitalize first letter of a string
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// convert snake_case status to readable label
// e.g. "en_route" → "En Route"
export function formatStatus(status) {
  return status
    .split('_')
    .map(word => capitalize(word))
    .join(' ')
}

// build a PostGIS point string from lat/lng
// always longitude first — PostGIS convention
export function toPostGISPoint(lat, lng) {
  return `POINT(${lng} ${lat})`
}

// truncate long text for previews
export function truncate(str, maxLength = 80) {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength).trimEnd() + '...'
}

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// ==================================================================== 
// ADDED GEOSPATIAL HELPERS FOR REAL-TIME DISPATCH MAP INTERFACES      
// ==================================================================== 

/**
 * Normalizes loose variant geometries from Supabase PostGIS objects or 
 * strings down into a structured [lat, lng] layout array.
 */
export function normalizeGeoPoint(incidentLocation) {
  if (!incidentLocation) return [5.6037, -0.1870] // Fallback to central Accra

  // If it's an array already
  if (Array.isArray(incidentLocation)) {
    return [Number(incidentLocation[0]), Number(incidentLocation[1])]
  }

  // If it's a Supabase/Postgres point object { lat, lng } or { x, y }
  if (typeof incidentLocation === 'object') {
    const lat = incidentLocation.lat ?? incidentLocation.y
    const lng = incidentLocation.lng ?? incidentLocation.x
    if (lat !== undefined && lng !== undefined) {
      return [Number(lat), Number(lng)]
    }
  }

  // If it's returned as a raw WKT string string e.g. "POINT(-0.1870 5.6037)"
  if (typeof incidentLocation === 'string' && incidentLocation.includes('POINT')) {
    const matches = incidentLocation.match(/POINT\(([^ ]+)\s+([^)]+)\)/)
    if (matches && matches[2] && matches[1]) {
      return [Number(matches[2]), Number(matches[1])] // [lat, lng]
    }
  }

  return [5.6037, -0.1870]
}

/**
 * Generates transit and ride-hailing alternative routes based on the breakdown pin
 */
export function buildTransitLinks(geoPointArray) {
  const [lat, lng] = geoPointArray || [5.6037, -0.1870]
  return {
    primary: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    fallback: `https://maps.google.com/?q=${lat},${lng}`
  }
}