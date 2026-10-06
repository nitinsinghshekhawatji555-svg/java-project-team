/**
 * authStore.js — ENHANCED VERSION  
 * Zustand state management for authentication and profile data
 * 
 * Synced by: AuthProvider.jsx (listens to Supabase auth state changes)
 * 
 * State:
 * - user: Current authenticated user from Supabase Auth
 * - profile: User's database profile (from public.profiles table)
 * - loading: Initial auth state is being resolved
 * - error: Last auth-related error message
 * - networkStatus: Connection status (connected, degraded, error)
 */

import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  // ========== CORE AUTH STATE ==========
  user: null, // Supabase Auth user object { id, email, user_metadata, app_metadata, ... }
  profile: null, // Database profile { id, email, full_name, role, phone, created_at, ... }
  loading: true, // True while initial session is being resolved

  // ========== ERROR & NETWORK STATE ==========
  error: null, // Last error message (string or null)
  networkStatus: 'connecting', // 'connecting' | 'connected' | 'degraded' | 'error'

  // ========== AUTH STATE SETTERS ==========

  /**
   * Set both user and profile at once (primary setter from AuthProvider)
   */
  setAuthState: ({ user, profile }) =>
    set({
      user,
      profile,
      loading: false,
      error: null,
    }),

  /**
   * Set user only (called when user changes without profile change)
   */
  setUser: (user) =>
    set({
      user,
      error: null,
    }),

  /**
   * Set profile only (called when profile updates)
   */
  setProfile: (profile) =>
    set({
      profile,
      error: null,
    }),

  /**
   * Set loading state (true while resolving initial session)
   */
  setLoading: (loading) =>
    set({ loading }),

  /**
   * Set error message (cleared on successful auth actions)
   */
  setError: (error) =>
    set({ error }),

  /**
   *Set network connection status
   * - 'connecting': Initial auth resolution in progress
   * - 'connected': Supabase connection active, auth working
   * - 'degraded': Can still auth but profile fetch has issues
   * - 'error': Cannot connect to Supabase at all
   */
  setNetworkStatus: (status) =>
    set({ networkStatus: status }),

  /**
   * Clear auth state (called on sign out or after errors)
   */
  resetAuth: () =>
    set({
      user: null,
      profile: null,
      loading: false,
      error: null,
      networkStatus: 'connected',
    }),

  // ========== COMPUTED GETTERS ==========

  /**
   * Check if user is currently authenticated
   * Usage: useAuthStore((state) => state.isAuthenticated())
   */
  isAuthenticated: () => {
    const { user } = get()
    return !!user?.id
  },

  /**
   * Get user's role from profile (or null if not loaded)
   * Usage: useAuthStore((state) => state.getUserRole())
   */
  getUserRole: () => {
    const { profile } = get()
    return profile?.role || null
  },

  /**
   * Check if user has a specific role
   * Usage: useAuthStore((state) => state.hasRole('admin'))
   */
  hasRole: (role) => {
    const { profile } = get()
    return profile?.role === role
  },

  /**
   * Check if user is any of given roles
   * Usage: useAuthStore((state) => state.hasAnyRole(['admin', 'mechanic']))
   */
  hasAnyRole: (roles) => {
    const { profile } = get()
    return roles.includes(profile?.role)
  },

  /**
   * Get user's full display name
   * Usage: useAuthStore((state) => state.getDisplayName())
   */
  getDisplayName: () => {
    const { user, profile } = get()
    return profile?.full_name || user?.user_metadata?.full_name || 'User'
  },

  /**
   * Get user's email
   * Usage: useAuthStore((state) => state.getEmail())
   */
  getEmail: () => {
    const { user } = get()
    return user?.email || null
  },

  /**
   * Check if auth state is ready (loaded and not in loading state)
   * Usage: useAuthStore((state) => state.isReady())
   */
  isReady: () => {
    const { loading } = get()
    return !loading
  },

  /**
   * Check network connection and auth state
   * Useful for components that need to verify they can make auth calls
   * Usage: useAuthStore((state) => state.canPerformAuthAction())
   */
  canPerformAuthAction: () => {
    const { networkStatus, user } = get()
    return networkStatus === 'connected' && !!user?.id
  },
}))