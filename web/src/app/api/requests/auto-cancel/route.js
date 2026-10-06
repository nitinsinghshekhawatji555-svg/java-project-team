import { createClient, createServiceClient } from '@/lib/supabase/server'
import { systemAutoCancelRequest } from '@/lib/request'
import { normalizeString } from '@/lib/rescueLifecycle'
import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/validate'

export async function POST(req) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    const auth = await supabase.auth.getUser()
    if (auth.error || !auth.data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = auth.data.user

    const rawBody = await req.json()
    const body = sanitizeInput(rawBody)

    const requestId = body.requestId || body.id
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    // Retrieve caller profile role
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Retrieve target rescue request securely via service client
    const { data: targetRequest, error: requestError } = await serviceSupabase
      .from('rescue_requests')
      .select('id, driver_id, mechanic_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError || !targetRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Authorize caller: Admin, Driver owner, or Assigned Mechanic
    const isAdmin = profile.role === 'admin'
    const isDriverOwner = targetRequest.driver_id === user.id
    const isAssignedMechanic = targetRequest.mechanic_id === user.id

    if (!isAdmin && !isDriverOwner && !isAssignedMechanic) {
      return NextResponse.json({ error: 'Forbidden: Not authorized to cancel this request' }, { status: 403 })
    }

    const reason = normalizeString(
      body.reason ?? body.cancellationReason ?? body.cancellation_reason ?? 'mechanic inactivity timeout'
    )

    const result = await systemAutoCancelRequest(serviceSupabase, {
      requestId,
      reason,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error('[POST /api/requests/auto-cancel]', err.message)
    const statusCode = err.message.includes('not found')
      ? 404
      : err.message.includes('terminal') || err.message.includes('Cannot')
        ? 409
        : err.message.includes('required') || err.message.includes('invalid')
          ? 400
          : 500

    return NextResponse.json({ error: err.message }, { status: statusCode })
  }
}
