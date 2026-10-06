// web/src/hooks/useIncomingJobs.js
// Mechanic subscribes to new pending rescue requests.
// When a driver creates a request and the mechanic is nearby,
// this hook picks it up and surfaces it in the mechanic dashboard.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useIncomingJobs(mechanicId) {
  // list of pending requests the mechanic can see and act on
  const [pendingJobs, setPendingJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mechanicId) return

    const supabase = createClient()

    // load any currently pending requests on mount
    async function fetchPendingJobs() {
      const { data, error } = await supabase
        .from('rescue_requests')
        .select(`
          *,
          driver:driver_id (
            id,
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .or(`mechanic_id.is.null,mechanic_id.eq.${mechanicId}`)
        .order('created_at', { ascending: false })

      if (!error) setPendingJobs(data || [])
      setLoading(false)
    }

    fetchPendingJobs()

    const channel = supabase
      .channel(`incoming-jobs-${mechanicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rescue_requests',
          // only listen for new pending requests
          filter: 'status=eq.pending',
        },
        (payload) => {
          // new request came in — refresh the list to resolve nested relationships in real-time
          fetchPendingJobs()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rescue_requests',
        },
        (payload) => {
          const updated = payload.new

          if (updated.status !== 'pending') {
            // request was accepted by someone else or cancelled
            // remove it from the pending job board
            setPendingJobs(prev =>
              prev.filter(job => job.id !== updated.id)
            )
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [mechanicId])

  return { pendingJobs, setPendingJobs, loading }
}