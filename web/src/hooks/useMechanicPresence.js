// web/src/hooks/useMechanicPresence.js
// Tracks whether a mechanic is actively online on the platform.
// Uses Supabase Presence — a shared state channel where
// each connected client declares itself and everyone sees who's there.
//
// When mechanic closes the tab or loses connection,
// Supabase automatically removes them from presence state.

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMechanicPresence(mechanicId) {
  const channelRef = useRef(null)

  useEffect(() => {
    if (!mechanicId) return

    const supabase = createClient()
    const channel = supabase.channel('mechanic-presence', {
      config: { presence: { key: mechanicId } },
    })

    channel
      .on('presence', { event: 'join' }, () => {})
      .on('presence', { event: 'leave' }, () => {})
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ mechanicId, online_at: new Date().toISOString() })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [mechanicId])
}
