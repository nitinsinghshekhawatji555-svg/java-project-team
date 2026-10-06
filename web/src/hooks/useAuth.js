import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { user, profile, loading, setProfile } = useAuthStore()
  const role = profile?.role || user?.role || null

  return {
    user,
    profile,
    loading,
    role,
    setProfile,
    isDriver: role === 'driver',
    isMechanic: role === 'mechanic',
    isAdmin: role === 'admin',
    isLoggedIn: !!user,
  }
}
