/**
 * useMechanicLocation.js — DEFINITIVE VERSION
 * Real-time mechanic location tracking for active rescue jobs
 * 
 * Two Modes:
 * 1. useBroadcastLocation (Mechanic side) → broadcasts GPS every 15s, persists to DB every 60s
 * 2. useWatchMechanicLocation (Driver side) → receives location updates in real-time
 * 
 * Architecture:
 * - Ephemeral updates via Supabase Realtime Broadcast (lightweight, low-latency)
 * - Persistent updates via PostgreSQL every 60s (for geospatial matching queries)
 * - Graceful error handling for network drops and geolocation permission issues
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'


// MECHANIC SIDE: Broadcast current GPS position

// Usage: const { broadcastError, isLocationAvailable } = useBroadcastLocation(requestId, mechanicId)
// Call in mechanic active job view; broadcasts every 15 seconds, persists every 60s
export function useBroadcastLocation(requestId, mechanicId, status, isOnline = true) {
  const intervalRef = useRef(null)
  const dbSyncCountRef = useRef(0)
  const [broadcastError, setBroadcastError] = useState(null)
  const [isLocationAvailable, setIsLocationAvailable] = useState(true)

  const isInactive = !isOnline || !status || ['completed', 'cancelled'].includes(status)

  useEffect(() => {
    if (!requestId || !mechanicId || isInactive) return

    const supabase = createClient()
    const channel = supabase.channel(`location-${requestId}`)

    // Subscribe with error handling
    channel.subscribe((status) => {
      if (status === 'SUBSCRIPTION_ERROR' || status === 'CHANNEL_ERROR') {
        setBroadcastError('Failed to connect to location broadcast channel')
        console.warn('Realtime channel error:', status)
      } else if (status === 'SUBSCRIBED') {
        setBroadcastError(null)
      }
    })

    async function broadcastPosition() {
      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords

              // 1. Send ephemeral update to driver via broadcast (real-time, instant delivery)
              channel.send({
                type: 'broadcast',
                event: 'location_update',
                payload: {
                  latitude,
                  longitude,
                  mechanicId,
                  timestamp: Date.now(),
                },
              })

              // 2. Every 4 broadcasts (~60 seconds), persist to database
              // This keeps the geospatial matching function accurate for future searches
              dbSyncCountRef.current += 1
              if (dbSyncCountRef.current >= 4) {
                dbSyncCountRef.current = 0

                const { error: updateError } = await supabase
                  .from('mechanic_profiles')
                  .update({
                    current_location: `POINT(${longitude} ${latitude})`,
                    location_updated_at: new Date().toISOString(),
                  })
                  .eq('user_id', mechanicId)

                if (updateError) {
                  console.error('Location sync to database failed:', updateError)
                  setBroadcastError('Location database sync failed — will retry next cycle')
                }
              }

              setBroadcastError(null)
              setIsLocationAvailable(true)
            } catch (error) {
              console.error('Error in broadcastPosition:', error)
              setBroadcastError('Unexpected error during location broadcast')
            }
          },
          (geolocationError) => {
            // Handle geolocation-specific errors
            let errorMsg = 'Location access issue'
            if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
              errorMsg = 'Location services disabled — enable in settings to continue'
            } else if (geolocationError.code === geolocationError.POSITION_UNAVAILABLE) {
              errorMsg = 'Location service temporarily unavailable (GPS unavailable)'
            } else if (geolocationError.code === geolocationError.TIMEOUT) {
              errorMsg = 'Location request timed out — trying again...'
            }

            setBroadcastError(errorMsg)
            setIsLocationAvailable(false)
            console.warn('Geolocation error:', geolocationError)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          }
        )
      } catch (error) {
        console.error('Unexpected error in broadcastPosition:', error)
        setBroadcastError('Network error during location broadcast')
      }
    }

    // Start broadcasting immediately and then every 15 seconds
    broadcastPosition()
    intervalRef.current = setInterval(broadcastPosition, 15000)

    // Cleanup
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      supabase.removeChannel(channel)
    }
  }, [requestId, mechanicId, isInactive])

  return { broadcastError, isLocationAvailable }
}


// DRIVER SIDE: Watch for mechanic location updates

// Usage: const { mechanicLocation, watchError, isConnected } = useWatchMechanicLocation(requestId)
// Call in driver active request tracking view; receives real-time location updates
export function useWatchMechanicLocation(requestId, status) {
  const [mechanicLocation, setMechanicLocation] = useState(null)
  const [watchError, setWatchError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const isInactive = !status || ['completed', 'cancelled'].includes(status)

  useEffect(() => {
    if (!requestId || isInactive) return

    const supabase = createClient()

    const channel = supabase
      .channel(`location-${requestId}`)
      .on('broadcast', { event: 'location_update' }, (payload) => {
        try {
          setMechanicLocation({
            latitude: payload.payload.latitude,
            longitude: payload.payload.longitude,
            timestamp: payload.payload.timestamp,
            mechanicId: payload.payload.mechanicId,
          })
          setWatchError(null)
          setIsConnected(true)
        } catch (error) {
          console.error('Error processing location update:', error)
          setWatchError('Failed to process location update')
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR' || status === 'CHANNEL_ERROR') {
          setWatchError('Lost connection to location updates')
          setIsConnected(false)
          console.warn('Location watch channel error:', status)
        } else if (status === 'SUBSCRIBED') {
          setWatchError(null)
          setIsConnected(true)
        }
      })

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, isInactive])

  return { mechanicLocation, watchError, isConnected }
}
