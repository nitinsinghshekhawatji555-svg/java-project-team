'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * useRescueChat
 * 
 * Manages real-time chat messages, message sending, and lifecycle-aware
 * channel socket cleanup for RoadRescue requests.
 *
 * @param {string} requestId - The ID of the rescue request
 * @param {string} initialStatus - Optional initial status of the rescue request
 */
export function useRescueChat(requestId, initialStatus = null) {
  const [messages, setMessages] = useState([])
  const [requestStatus, setRequestStatus] = useState(initialStatus)
  const [driverId, setDriverId] = useState(null)
  const [mechanicId, setMechanicId] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUserRole, setCurrentRole] = useState(null)
  const [loading, setLoading] = useState(Boolean(requestId))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const channelRef = useRef(null)
  const supabase = createClient()

  const isCompleted = requestStatus?.toLowerCase() === 'completed'
  const isCancelled = requestStatus?.toLowerCase() === 'cancelled'
  const isTerminal = isCompleted || isCancelled

  // 1. Initial data fetch (messages & request metadata)
  const fetchMessagesAndMetadata = useCallback(async () => {
    if (!requestId) return

    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      let response = await fetch(`/api/requests/${requestId}/messages`)
      let data = await response.json()

      // Retry once after 500ms if initial fetch encounters a 403 race condition right after request acceptance
      if (response.status === 403) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        response = await fetch(`/api/requests/${requestId}/messages`)
        data = await response.json()
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load messages')
      }

      setMessages(data.messages || [])
      if (data.requestStatus) {
        setRequestStatus(data.requestStatus)
      }
      if (data.driverId) setDriverId(data.driverId)
      if (data.mechanicId) setMechanicId(data.mechanicId)

      if (user) {
        if (data.driverId === user.id) setCurrentRole('driver')
        else if (data.mechanicId === user.id) setCurrentRole('mechanic')

        // Clear unread notifications for this rescue request when chat is opened
        try {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('profile_id', user.id)
            .eq('request_id', requestId)
            .eq('is_read', false)
        } catch (notifErr) {
          console.error('[useRescueChat] Failed to clear notifications:', notifErr)
        }
      }
    } catch (err) {
      console.error('[useRescueChat] fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [requestId, supabase])

  useEffect(() => {
    fetchMessagesAndMetadata()
  }, [fetchMessagesAndMetadata])

  // 2. Lifecycle-Aware Realtime Subscription
  // Subscribes when active, and cleanly tears down socket when completed/cancelled or on unmount
  useEffect(() => {
    if (!requestId) return

    // If already in a terminal state, ensure no active channel exists and do not subscribe
    if (isTerminal) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const roomChannelName = `room_rescue_${requestId}`

    // Create channel
    const channel = supabase
      .channel(roomChannelName)
      // Listen for new messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          if (payload.new) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          }
        }
      )
      // Listen for status changes on the rescue request
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rescue_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status
          if (newStatus) {
            setRequestStatus(newStatus)
            // If the status became terminal, immediately tear down the socket channel
            if (['completed', 'cancelled'].includes(newStatus.toLowerCase())) {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
              }
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel active
        }
      })

    channelRef.current = channel

    // Clean up channel on unmount or requestId change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [requestId, isTerminal, supabase])

  // 3. Send message handler
  const sendMessage = async (text) => {
    const trimmed = text?.trim()
    if (!trimmed || !requestId || isTerminal || sending) return false

    setSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/requests/${requestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Optimistically add message if not already present
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }

      return true
    } catch (err) {
      console.error('[useRescueChat] send error:', err)
      setError(err.message)
      return false
    } finally {
      setSending(false)
    }
  }

  return {
    messages,
    requestStatus,
    driverId,
    mechanicId,
    currentUserId,
    currentUserRole,
    isTerminal,
    isCompleted,
    isCancelled,
    loading,
    sending,
    error,
    sendMessage,
    refetch: fetchMessagesAndMetadata,
  }
}
