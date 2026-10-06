/**
 * RBAC (Role-Based Access Control) Protection
 * Utilities for enforcing role-based access throughout the app
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * API Route Protection
 * Use this in all API routes to verify user role before processing
 * 
 * @param {string} allowedRoles - Comma-separated roles (e.g., 'driver,mechanic')
 * @returns {Promise<{user, profile}|{error, status}>}
 */
export async function protectApiRoute(allowedRoles = '') {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Unauthorized', status: 401 }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, is_suspended, suspended_at, suspension_reason')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { error: 'Profile not found', status: 404 }
    }

    // Check account suspension status
    if (profile.is_suspended) {
      return {
        error: `Your account has been suspended: ${profile.suspension_reason || 'Policy violations'}. Contact dispatch support for assistance.`,
        status: 403,
      }
    }

    // Check role authorization
    if (allowedRoles) {
      const roles = allowedRoles.split(',').map(r => r.trim())
      if (!roles.includes(profile.role)) {
        return { error: 'Forbidden: insufficient permissions', status: 403 }
      }
    }

    return { user, profile }
  } catch (err) {
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Driver-Only API Protection
 */
export async function requireDriver() {
  return protectApiRoute('driver')
}

/**
 * Mechanic-Only API Protection
 */
export async function requireMechanic() {
  return protectApiRoute('mechanic')
}

/**
 * Admin-Only API Protection
 */
export async function requireAdmin() {
  return protectApiRoute('admin')
}

/**
 * Multiple roles allowed
 */
export async function requireRoles(roles) {
  return protectApiRoute(roles)
}

/**
 * Create standardized error response
 */
export function createErrorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Verify user owns the resource before allowing access
 * @param {string} userId - User ID from auth
 * @param {string} resourceOwnerId - Resource owner ID from database
 */
export function verifyResourceOwnership(userId, resourceOwnerId) {
  if (userId !== resourceOwnerId) {
    throw new Error('Forbidden: resource not owned by user')
  }
}

/**
 * Build role-based query filters
 * Example: Only drivers see their own requests, admins see all
 */
export function getRoleBasedFilter(role, userId) {
  const filters = {
    driver: {
      column: 'driver_id',
      value: userId,
    },
    mechanic: {
      column: 'mechanic_id',
      value: userId,
    },
    admin: null, // Admins see everything
  }
  return filters[role]
}
