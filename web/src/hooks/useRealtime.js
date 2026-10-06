// web/src/hooks/useRealtime.js
// Generic realtime subscription hook.
// Every specific subscription (request, notifications, etc.)
// is built on top of this one.

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// channelName  → unique string identifying this channel
// config       → { event, schema, table, filter } — what to listen to
// onEvent      → callback fired when the event occurs
export function useRealtime(channelName, config, onEvent) {
  // store channel in a ref so we can clean it up on unmount
  const channelRef = useRef(null)

  useEffect(() => {
    if (!channelName || !config || !onEvent) return

    const supabase = createClient()

    // create the channel
    const channel = supabase.channel(channelName)

    channel
      .on(
        'postgres_changes',
        {
          event: config.event || '*',   // INSERT | UPDATE | DELETE | *
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,        // e.g. 'driver_id=eq.some-uuid'
        },
        (payload) => onEvent(payload)
      )
      .subscribe()

    channelRef.current = channel

    // cleanup — unsubscribe when component unmounts
    // this prevents memory leaks and duplicate subscriptions
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName, config, onEvent])
}