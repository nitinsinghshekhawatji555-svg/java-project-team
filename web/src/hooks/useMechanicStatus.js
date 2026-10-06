'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_STATUSES = new Set(['available', 'offline'])

function normalizeStatus(value) {
  if (value === 'available') return 'available'
  return 'offline'
}


// Module-level cache for sharing the presence channel across multiple hook instances
let sharedPresenceChannel = null
let sharedPresenceRefCount = 0

export function useMechanicStatus(mechanicId) {
  const supabaseRef = useRef(null)
  const channelRef = useRef(null)
  const inlineOnlineChannelRef = useRef(null)

  const [status, setStatus] = useState('offline')
  const [loading, setLoading] = useState(!!mechanicId)

  useEffect(() => {
    if (!mechanicId) {
      // Leave initial state as-is (status='offline', loading=false by default from useState)
      return
    }



    const supabase = createClient()
    supabaseRef.current = supabase

    let cancelled = false

    async function loadInitial() {
      setLoading(true)
      const { data, error } = await supabase
        .from('mechanic_profiles')
        .select('is_available')
        .eq('user_id', mechanicId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('[useMechanicStatus] initial load failed:', error.message)
        setStatus('offline')
      } else {
        // New schema: availability is boolean is_available (no current_status enum)
        setStatus(data?.is_available ? 'available' : 'offline')
      }
      setLoading(false)
    }

    loadInitial()

    // realtime subscription: keep a single source of truth in sync
    const randomSuffix = Math.random().toString(36).substring(2, 9)
    const channel = supabase.channel(`mechanic-status-${mechanicId}-${randomSuffix}`)
    channelRef.current = channel

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mechanic_profiles',
          filter: `user_id=eq.${mechanicId}`,
        },
        (payload) => {
          // New schema: availability is boolean `is_available`
          const next = payload?.new?.is_available ? 'available' : 'offline'
          setStatus(next)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [mechanicId])

  const isAvailable = useMemo(() => status === 'available', [status])
  const isBusy = useMemo(() => status === 'busy', [status])
  const [localCoords, setLocalCoords] = useState(null)

  useEffect(() => {
    if (!isAvailable || !mechanicId) {
      Promise.resolve().then(() => {
        setLocalCoords(null)
      })
      return
    }

    if (!navigator.geolocation) return

    const supabase = supabaseRef.current || createClient()
    const channel = supabase.channel('online-mechanics')
    channel.subscribe()

    let presenceChannel = sharedPresenceChannel

    if (!presenceChannel) {
      presenceChannel = supabase.channel('mechanic-presence', {
        config: { presence: { key: mechanicId } },
      })

      presenceChannel
        .on('presence', { event: 'leave' }, () => {
          // do not auto-offline on disconnect, persist status
        })
        .subscribe(async (subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
            await presenceChannel.track({ mechanicId, online_at: new Date().toISOString() })
          }
        })

      sharedPresenceChannel = presenceChannel
    } else {
      // If already subscribed, declare presence again
      if (presenceChannel.state === 'joined') {
        presenceChannel.track({ mechanicId, online_at: new Date().toISOString() }).catch(() => {})
      }
    }

    sharedPresenceRefCount++

    let lastDBSync = 0

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const currentNow = { lat: latitude, lng: longitude }
        setLocalCoords(currentNow)

        // 1. Broadcast coordinates to 'online-mechanics' channel
        channel.send({
          type: 'broadcast',
          event: 'location_update',
          payload: {
            mechanicId,
            latitude,
            longitude,
            timestamp: Date.now()
          }
        })

        // 2. Persist to DB (throttle 30s)
        const timeNow = Date.now()
        if (timeNow - lastDBSync > 30000) {
          lastDBSync = timeNow
          await supabase
            .from('mechanic_profiles')
            .update({
              current_location: `POINT(${longitude} ${latitude})`,
              location_updated_at: new Date().toISOString()
            })
            .eq('user_id', mechanicId)
        }
      },
      (error) => console.warn('[useMechanicStatus GPS FAULT]:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      supabase.removeChannel(channel)

      sharedPresenceRefCount--
      if (sharedPresenceRefCount <= 0) {
        if (sharedPresenceChannel) {
          supabase.removeChannel(sharedPresenceChannel)
          sharedPresenceChannel = null
        }
        sharedPresenceRefCount = 0
      }
    }
  }, [isAvailable, mechanicId])

  const updateStatus = useCallback(
    async (nextStatus) => {
      if (!mechanicId) return
      const normalized = normalizeStatus(nextStatus)
      const is_available = normalized === 'available'
      const supabase = supabaseRef.current || createClient()

      let currentStatusVal = null
      if (!is_available) {
        const { data: activeJobs } = await supabase
          .from('rescue_requests')
          .select('id')
          .eq('mechanic_id', mechanicId)
          .in('status', ['accepted', 'en_route', 'arrived', 'in_progress'])
          .limit(1)

        if (activeJobs && activeJobs.length > 0) {
          currentStatusVal = new Date().toISOString()
        }
      }

      // 1. Update status in database immediately so state/UI transitions instantly
      const { error } = await supabase
        .from('mechanic_profiles')
        .update({ 
          is_available,
          current_status: currentStatusVal
        })
        .eq('user_id', mechanicId)

      if (error) {
        console.error('[useMechanicStatus] update failed:', error.message)
        throw error
      }

      // reflect DB result quickly; realtime subscription is the ultimate source
      setStatus(normalized)

      // 2. Broadcast coordinates immediately when going online
      if (is_available && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            const currentNow = { lat: latitude, lng: longitude }
            setLocalCoords(currentNow)

            // Broadcast coordinates to 'online-mechanics' channel
            if (inlineOnlineChannelRef.current) {
              supabase.removeChannel(inlineOnlineChannelRef.current)
              inlineOnlineChannelRef.current = null
            }
            const channel = supabase.channel('online-mechanics')
            inlineOnlineChannelRef.current = channel
            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                channel.send({
                  type: 'broadcast',
                  event: 'location_update',
                  payload: {
                    mechanicId,
                    latitude,
                    longitude,
                    timestamp: Date.now()
                  }
                })
              }
            })

            // Persist location immediately to DB to broadcast pin to admin dashboard map
            await supabase
              .from('mechanic_profiles')
              .update({
                current_location: `POINT(${longitude} ${latitude})`,
                location_updated_at: new Date().toISOString()
              })
              .eq('user_id', mechanicId)
          },
          (err) => console.warn('[useMechanicStatus GPS FAULT ON GO ONLINE]:', err.message),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      }
    },
    [mechanicId]
  )

  useEffect(() => {
    return () => {
      if (inlineOnlineChannelRef.current) {
        const supabase = supabaseRef.current || createClient()
        supabase.removeChannel(inlineOnlineChannelRef.current)
        inlineOnlineChannelRef.current = null
      }
    }
  }, [])

  return {
    status,
    isAvailable,
    isBusy,
    loading,
    localCoords,
    updateStatus,
  }
}

