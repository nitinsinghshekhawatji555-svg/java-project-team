'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'

/**
 * RoleGuard Component
 *
 * This component protects UI elements by checking the user's role.
 * It should be used to wrap components that should only be visible to users with a specific role.
 *
 * @param {object} props - The component props.
 * @param {string[]} props.allowedRoles - The roles required to view the children components.
 * @param {React.ReactNode} props.children - The components to render if the user has the required role.
 * @returns {React.ReactNode|null} The children components if the user has the required role, otherwise null.
 */
export default function RoleGuard({
  allowedRoles,
  children,
}) {
  const router = useRouter()
  const { user, profile, role, loading, isLoggedIn } = useAuth()

  useEffect(() => {
    if (loading) return

    // State 1: No session -> redirect to login immediately
    if (!isLoggedIn) {
      router.replace('/auth/login')
      return
    }

    // State 2: Session exists but profile is still loading -> do NOT redirect
    if (!profile) {
      return
    }

    // State 3: Session exists and profile loaded
    if (!role) {
      // Profile loaded but role is missing or invalid -> redirect to login
      router.replace('/auth/login')
      return
    }

    if (role && !allowedRoles.includes(role)) {
      router.replace(`/dashboard/${role}`)
    }
  }, [
    allowedRoles,
    role,
    profile,
    isLoggedIn,
    loading,
    router,
  ])

  if (loading || (isLoggedIn && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isLoggedIn || !role || !allowedRoles.includes(role)) {
    return null
  }

  return children
}