import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/rbac'
import { sanitizeInput } from '@/lib/validate'

export async function POST(request) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const adminUser = adminCheck.user
    const rawBody = await request.json()
    const body = sanitizeInput(rawBody)
    const { userId, reason } = body

    if (!userId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'userId and a non-empty suspension clearance reason are required.' },
        { status: 400 }
      )
    }

    const serviceSupabase = await createServiceClient()

    // 1. Fetch user to verify existence
    const { data: targetProfile, error: profileErr } = await serviceSupabase
      .from('profiles')
      .select('id, is_suspended, cancellation_count, issue_flag_count')
      .eq('id', userId)
      .single()

    if (profileErr || !targetProfile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
    }

    // 2. Unsuspend the user (without resetting cancellation_count or issue_flag_count)
    const { error: updateErr } = await serviceSupabase
      .from('profiles')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', userId)

    if (updateErr) {
      console.error('[ADMIN UNSUSPEND ERROR]:', updateErr)
      return NextResponse.json({ error: updateErr.message || 'Failed to unsuspend user.' }, { status: 500 })
    }

    // 3. Write immutable account moderation log with actor = adminId
    const { error: logErr } = await serviceSupabase
      .from('account_moderation_log')
      .insert({
        user_id: userId,
        action: 'unsuspended',
        reason: reason.trim(),
        actor: adminUser.id,
      })

    if (logErr) {
      console.error('[ADMIN MODERATION LOG ERROR]:', logErr)
      // Non-fatal if profile updated, but report back
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User has been unsuspended successfully.',
        user: {
          id: userId,
          is_suspended: false,
          cancellation_count: targetProfile.cancellation_count,
          issue_flag_count: targetProfile.issue_flag_count,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[UNSUSPEND ROUTE FAULT]:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
