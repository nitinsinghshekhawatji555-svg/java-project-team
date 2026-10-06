/**
 * AuthProvider.jsx — ENHANCED VERSION
 * Global authentication provider with Supabase session management
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000 // Start with 1s, exponential backoff after

const isRlsStyleError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return (
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    message.includes('row level security') ||
    message.includes('violates rls policy') ||
    message.includes('permission denied')
  )
}

export default function AuthProvider({ children }) {
  const {
    setAuthState,
    setUser,
    setProfile,
    setLoading,
    setError,
    setNetworkStatus,
    resetAuth,
  } = useAuthStore()

  const retryCountRef = useRef({})
  const subscriptionRef = useRef(null)

  // Fetch user profile from database with retry logic
  const fetchUserProfile = useCallback(async (user) => {
    if (!user?.id) return null

    const resolvePhoneNumber = (profileVal, userObj) => {
      const isValidPhone = (val) => {
        if (!val) return false
        const clean = val.toString().trim()
        return clean.length > 0 && !/[a-zA-Z]/.test(clean)
      }
      
      const userMetaPhone = userObj?.user_metadata?.phone
      if (isValidPhone(userMetaPhone)) return userMetaPhone.toString().trim()

      const pPhone = typeof profileVal === 'object' ? profileVal?.phone : profileVal
      if (isValidPhone(pPhone)) return pPhone.toString().trim()

      const userPhone = userObj?.phone
      if (isValidPhone(userPhone)) return userPhone.toString().trim()

      return ''
    }

    const userId = user.id
    const fallbackProfile = {
      id: userId,
      email: user.email || null,
      full_name: user.user_metadata?.full_name || null,
      phone: resolvePhoneNumber(null, user) || null,
      role: user.user_metadata?.role || null,
    }

    const supabase = createClient()

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          if (isRlsStyleError(error)) {
            console.warn(
              `Profile fetch blocked by policy for user ${userId}; using auth metadata fallback`,
              error
            )
            setError(null)
            setNetworkStatus('connected')
            return fallbackProfile
          }

          if (error.code === 'PGRST100') {
            console.warn(`Profile not yet created for user ${userId} — will be created by trigger`)
            return null
          }

          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
            console.warn(
              `Profile fetch failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms:`,
              error
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          console.error(`Profile fetch failed after ${MAX_RETRIES} retries for user ${userId}:`, error)
          setError(`Failed to load profile: ${error.message}`)
          setNetworkStatus('degraded')
          return null
        }

        // Success
        retryCountRef.current[userId] = 0
        setError(null)
        setNetworkStatus('connected')

        if (!profile) return fallbackProfile

        const extendedProfile = {
          ...fallbackProfile,
          ...profile,
          phone: resolvePhoneNumber(profile, user)
        }

if (profile?.role === 'driver') {
  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('home_area, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate, emergency_contact_name, emergency_contact_phone')
    .eq('user_id', userId)
    .maybeSingle()

  if (driverProfile) {
    extendedProfile.driver_profile = driverProfile
    extendedProfile.home_area = driverProfile.home_area || null
  }
}

         if (profile?.role === 'mechanic') {
           const { data: mechanicProfile } = await supabase
             .from('mechanic_profiles')
             .select('business_name, specializations, location_label, is_available, rating_avg, rating_count, years_experience')
             .eq('user_id', userId)
             .maybeSingle()

           if (mechanicProfile) {
             extendedProfile.mechanic_profile = mechanicProfile
             extendedProfile.business_name = mechanicProfile.business_name || null
             extendedProfile.specializations = mechanicProfile.specializations || []
             extendedProfile.rating_avg = mechanicProfile.rating_avg ?? null
             extendedProfile.rating_count = mechanicProfile.rating_count ?? null
             extendedProfile.is_available = mechanicProfile.is_available ?? null
             extendedProfile.location_label = mechanicProfile.location_label || null
           }
         }

        return extendedProfile
      } catch (err) {
        console.error('Unexpected error fetching profile:', err)
        setError('Unexpected error loading profile')
        setNetworkStatus('degraded')

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        console.warn(
          `[AUTH_PROVIDER] Exhausted retries for user ${userId}. Falling back to signup metadata role: '${fallbackProfile.role}'. If this user was promoted via the database, their promoted permissions will not be reflected until the profiles table is accessible.`
        )
        return fallbackProfile
      }
    }
    return null
  }, [setError, setNetworkStatus])

  const setSession = useCallback(async (session) => {
    try {
      if (session?.user) {
        // Fast optimistic sync to unblock rendering
        const optimisticProfile = {
          id: session.user.id,
          email: session.user.email || null,
          full_name: session.user.user_metadata?.full_name || null,
          role: session.user.user_metadata?.role || null,
        }

        setUser(session.user)
        if (!useAuthStore.getState().profile) {
          setProfile(optimisticProfile)
        }
        setLoading(false)

        // Enrich full profile in background
        const profile = await fetchUserProfile(session.user)

        setAuthState({
          user: session.user,
          profile: profile || optimisticProfile,
        })

        setUser(session.user)
        setProfile(profile || optimisticProfile)
      } else {
        resetAuth()
        setLoading(false)
      }
    } catch (err) {
      console.error('Error in setSession:', err)
      setError('Failed to initialize auth session')
      setLoading(false)
    }
  }, [fetchUserProfile, setAuthState, setUser, setProfile, resetAuth, setLoading, setError])

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (_event === 'SIGNED_OUT' || _event === 'USER_DELETED') {
              if (isMounted) {
                resetAuth()
                setNetworkStatus('connected')
              }
            } else if (session?.user) {
              if (isMounted) {
                await setSession(session)
              }
            }
          }
        )

        subscriptionRef.current = subscription

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.warn('Error fetching initial session:', error)
          setNetworkStatus('degraded')
        }

        if (isMounted) {
          await setSession(session)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (isMounted) {
          setError('Failed to initialize authentication')
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
      if (subscriptionRef.current?.unsubscribe) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [setSession, resetAuth, setError, setLoading, setNetworkStatus])

  return children
}
