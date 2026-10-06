import { getAdminStats } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAdmin, createErrorResponse } from '@/lib/rbac'

export async function GET() {
  try {
    const result = await requireAdmin()
    if (result.error) {
      return createErrorResponse(result.error, result.status)
    }

    const { profile } = result
    const serviceSupabase = await createServiceClient()

    // Verify admin role one more time (defense in depth)
    if (profile.role !== 'admin') {
      return createErrorResponse('Forbidden: admin access required', 403)
    }

    const stats = await getAdminStats(serviceSupabase)
    return NextResponse.json({ stats }, { status: 200 })
  } catch (err) {
    console.error('Admin stats error:', err)
    return createErrorResponse('Internal server error', 500)
  }
}
