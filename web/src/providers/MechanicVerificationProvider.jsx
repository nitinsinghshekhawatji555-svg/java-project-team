'use client'

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export const MechanicVerificationContext = createContext(null)

export function MechanicVerificationProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id || null

  const [verificationStatus, setVerificationStatus] = useState('unverified')
  const [rejectionReason, setRejectionReason] = useState(null)
  const [isSuspended, setIsSuspended] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const retryTimeoutRef = useRef(null)
  const retryCountRef = useRef(0)
  const channelRef = useRef(null)
  const isMountedRef = useRef(true)

  // 1. Independent normal query fetch
  const fetchVerificationStatus = useCallback(async () => {
    if (!userId) {
      if (isMountedRef.current) {
        setVerificationStatus('unverified')
        setLoading(false)
      }
      return
    }

    try {
      const supabase = createClient()

      // a. Fetch verification status from mechanic_profiles
      const { data: mechProfile, error: mechError } = await supabase
        .from('mechanic_profiles')
        .select('verification_status')
        .eq('user_id', userId)
        .maybeSingle()

      if (mechError) console.warn('[MechanicVerificationProvider] Profile fetch:', mechError.message)

      // b. Fetch latest verification log for status & rejection reason
      const { data: verifyRow, error: verifyError } = await supabase
        .from('mechanic_verifications')
        .select('status, rejection_reason')
        .eq('mechanic_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (verifyError) console.warn('[MechanicVerificationProvider] Verification fetch:', verifyError.message)

      // c. Fetch moderation suspension state from profiles
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('is_suspended, suspension_reason')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) console.warn('[MechanicVerificationProvider] Moderation fetch:', profileError.message)

      if (!isMountedRef.current) return

      const rawStatus = (mechProfile?.verification_status || verifyRow?.status || 'unverified').toLowerCase()
      setVerificationStatus(rawStatus)
      setRejectionReason(verifyRow?.rejection_reason || null)
      setIsSuspended(Boolean(profileRow?.is_suspended))
      setSuspensionReason(profileRow?.suspension_reason || null)
      setError(null)
    } catch (err) {
      console.warn('[MechanicVerificationProvider] Fetch error:', err?.message || err)
      if (isMountedRef.current) {
        setError(err)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [userId])

  // 2. Real-time subscription owner with unique random topic and chained subscription
  useEffect(() => {
    isMountedRef.current = true
    fetchVerificationStatus()

    if (!userId) {
      return () => {
        isMountedRef.current = false
      }
    }

    const supabase = createClient()
    let activeChannel = null

    const subscribeToChanges = () => {
      if (!isMountedRef.current) return

      // Clean up previous channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const randomSuffix = Math.random().toString(36).substring(2, 9)
      const topicName = `mechanic-verification-${userId}-${randomSuffix}`

      // Create fresh channel and chain all .on() and .subscribe() in a single expression
      activeChannel = supabase
        .channel(topicName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mechanic_profiles', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.new?.verification_status && isMountedRef.current) {
              setVerificationStatus(payload.new.verification_status.toLowerCase())
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mechanic_verifications', filter: `mechanic_id=eq.${userId}` },
          (payload) => {
            if (isMountedRef.current) {
              if (payload.new?.status) {
                setVerificationStatus(payload.new.status.toLowerCase())
              }
              if (payload.new?.rejection_reason !== undefined) {
                setRejectionReason(payload.new.rejection_reason)
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            if (isMountedRef.current) {
              if (payload.new?.is_suspended !== undefined) {
                setIsSuspended(Boolean(payload.new.is_suspended))
                setSuspensionReason(payload.new.suspension_reason || null)
              }
            }
          }
        )
        .subscribe((status) => {
          if (!isMountedRef.current) return

          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0
          } else if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            // Exponential backoff retry (max 10s)
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000)
            retryCountRef.current += 1
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                fetchVerificationStatus()
                subscribeToChanges()
              }
            }, delay)
          }
        })

      channelRef.current = activeChannel
    }

    subscribeToChanges()

    // 3. Stale state recovery: refetch on visibilitychange and online events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchVerificationStatus()
      }
    }

    const handleOnline = () => {
      fetchVerificationStatus()
      subscribeToChanges()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      isMountedRef.current = false
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, fetchVerificationStatus])

  // 4. Derived flags
  const isApproved = useMemo(
    () => verificationStatus === 'approved' || verificationStatus === 'verified',
    [verificationStatus]
  )
  const isRejected = useMemo(
    () => verificationStatus === 'rejected',
    [verificationStatus]
  )
  const isPending = useMemo(
    () => verificationStatus === 'pending' || verificationStatus === 'more_info',
    [verificationStatus]
  )
  const isUnverified = useMemo(
    () => !isApproved && !isRejected && !isPending,
    [isApproved, isRejected, isPending]
  )

  const value = useMemo(
    () => ({
      verificationStatus,
      rejectionReason,
      isSuspended,
      suspensionReason,
      isApproved,
      isRejected,
      isPending,
      isUnverified,
      loading,
      error,
      refetch: fetchVerificationStatus,
    }),
    [
      verificationStatus,
      rejectionReason,
      isSuspended,
      suspensionReason,
      isApproved,
      isRejected,
      isPending,
      isUnverified,
      loading,
      error,
      fetchVerificationStatus,
    ]
  )

  return (
    <MechanicVerificationContext.Provider value={value}>
      {children}
    </MechanicVerificationContext.Provider>
  )
}
