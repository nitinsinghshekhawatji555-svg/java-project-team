import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateRequestStatus } from '@/lib/request'
import { normalizeString, normalizeStatus } from '@/lib/rescueLifecycle'
import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/validate'

export async function PATCH(req, { params }) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    const auth = await supabase.auth.getUser()
    if (auth.error || !auth.data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = auth.data.user
    const { id: requestId } = await params

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    // verify caller profile
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('role, is_suspended, suspension_reason')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile?.is_suspended) {
      return NextResponse.json(
        { error: `Account suspended: ${profile.suspension_reason || 'Policy violations'}. Cannot perform rescue operations.` },
        { status: 403 }
      )
    }

    const rawBody = await req.json()
    const body = sanitizeInput(rawBody)
    const rawStatus = body.status || body.newStatus

    if (!rawStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const requestedStatus = normalizeStatus(rawStatus)

    const rawCancellationReason = normalizeString(
      body.reason ?? body.cancellationReason ?? body.cancellation_reason
    )
    const cancellationReason = requestedStatus === 'cancelled' && rawCancellationReason
      ? (rawCancellationReason.startsWith('user:') || rawCancellationReason.startsWith('system_timeout:') ? rawCancellationReason : `user: ${rawCancellationReason}`)
      : rawCancellationReason
    const completionNotes = normalizeString(
      body.completionNotes ?? body.completion_notes
    )
    const performedServices = Array.isArray(body.performedServices)
      ? body.performedServices
      : Array.isArray(body.performed_services)
        ? body.performed_services
        : undefined

    // 3. Call core updateRequestStatus helper
    const result = await updateRequestStatus(serviceSupabase, {
      requestId,
      actorId: user.id,
      actorRole: profile.role,
      newStatus: requestedStatus,
      completionNotes,
      performedServices,
      cancellationReason,
    })

    return NextResponse.json(result, { status: 200 })

  } catch (err) {
    console.error(`[PATCH /api/requests/[id]/status]`, err.message)
    const statusCode = err.message.includes('not found')
      ? 404
      : err.message.includes('authorized') || err.message.includes('Only')
        ? 403
        : err.message.includes('invalid') || err.message.includes('required')
          ? 400
          : err.message.includes('no longer available') || err.message.includes('already accepted') || err.message.includes('changed before')
            ? 409
            : 500

    return NextResponse.json({ error: err.message }, { status: statusCode })
  }
}
