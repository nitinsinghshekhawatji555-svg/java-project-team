// web/src/app/api/admin/requests/route.js
// GET → all rescue requests with optional status filter

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAllRequests } from '@/lib/admin'
import { NextResponse } from 'next/server'

async function requireAdmin(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { user }
}

export async function GET(req) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    await requireAdmin(supabase)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || null
    const flagged = searchParams.get('flagged') === 'true' || status === 'flagged'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const requests = await getAllRequests(serviceSupabase, {
      status,
      flagged,
      limit,
      offset,
    })

    return NextResponse.json({ requests }, { status: 200 })

  } catch (err) {
    const status = err.message === 'Unauthorized' ? 401
      : err.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}