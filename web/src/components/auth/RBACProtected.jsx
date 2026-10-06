'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';

/**
 * RBACProtectedPage Component
 * Wraps entire pages to enforce role-based access
 * Redirects unauthorized users immediately
 */
export function RBACProtectedPage({ 
  children, 
  allowedRoles = [],
  fallback = null 
}) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    // State 1: No session -> redirect to login immediately
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    // State 2: Session exists but profile is still loading -> do NOT redirect
    if (!profile) {
      return;
    }

    // State 3: Session exists and profile loaded
    if (!profile.role) {
      // Profile loaded but role is missing or invalid -> redirect to login
      router.replace('/auth/login');
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
      router.replace('/404');
      return;
    }

    // defer state updates to avoid calling setState synchronously inside effect
    setTimeout(() => {
      setIsAuthorized(true);
      setChecked(true);
    }, 0);
  }, [user, profile, loading, allowedRoles, router]);

  if (!checked || loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isAuthorized) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Redirecting...</p>
      </div>
    );
  }

  return children;
}

/**
 * ConditionalRender Component
 * Show/hide content based on user role
 * Use for sections within a page, not entire pages
 */
export function ConditionalRender({ 
  children, 
  allowedRoles = [],
  show = true 
}) {
  const { profile } = useAuth();
  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(profile?.role);

  if (!hasAccess || !show) {
    return null;
  }

  return children;
}

/**
 * RoleRestrictedSection Component
 * Similar to ConditionalRender but shows a placeholder for denied access
 */
export function RoleRestrictedSection({ 
  children, 
  allowedRoles = [],
  deniedMessage = "You don&apos;t have access to this section"
}) {
  const { profile } = useAuth();
  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(profile?.role);

  if (!hasAccess) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-700">{deniedMessage}</p>
      </div>
    );
  }

  return children;
}

/**
 * AdminOnly Component
 * Shortcut for admin-only sections
 */
export function AdminOnly({ children, deniedMessage = "This section is only available to administrators" }) {
  return (
    <RoleRestrictedSection allowedRoles={['admin']} deniedMessage={deniedMessage}>
      {children}
    </RoleRestrictedSection>
  );
}

/**
 * DriverOnly Component
 * Shortcut for driver-only sections
 */
export function DriverOnly({ children, deniedMessage = "This section is only available to drivers" }) {
  return (
    <RoleRestrictedSection allowedRoles={['driver']} deniedMessage={deniedMessage}>
      {children}
    </RoleRestrictedSection>
  );
}

/**
 * MechanicOnly Component
 * Shortcut for mechanic-only sections
 */
export function MechanicOnly({ children, deniedMessage = "This section is only available to mechanics" }) {
  return (
    <RoleRestrictedSection allowedRoles={['mechanic']} deniedMessage={deniedMessage}>
      {children}
    </RoleRestrictedSection>
  );
}
