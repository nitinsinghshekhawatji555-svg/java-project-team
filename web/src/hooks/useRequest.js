import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRequestStatus(requestId) {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const fetchRequest = useCallback(async () => {
    if (!requestId) return

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('rescue_requests')
        .select(`
          *,
          mechanic:mechanic_id (
            id,
            full_name,
            phone,
            avatar_url,
            mechanic_profiles (
              rating_avg,
              specializations,
              business_name,
              location_label,
              service_mode,
              current_location,
              is_available,
              current_status
            )
          )
        `)
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError
      if (data) setRequest(data)
      setError(null)
    } catch (err) {
      console.warn('[useRequestStatus] fetchRequest error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    if (!requestId) return

    fetchRequest()

    const supabase = createClient()

    const channel = supabase
      .channel(`request-status-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rescue_requests',
          filter: `id=eq.${requestId}`,
        },
        () => {
          // Trigger a full fetch to resolve nested relationships in real-time
          fetchRequest()
        }
      )
      .subscribe((status) => {
        if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          console.warn(`[useRequestStatus] channel status: ${status}, reconciling...`)
          fetchRequest()
        }
      })

    channelRef.current = channel

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRequest()
      }
    }

    const handleOnline = () => {
      fetchRequest()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [requestId, fetchRequest])

  return { request, loading, error, refetch: fetchRequest }
}
