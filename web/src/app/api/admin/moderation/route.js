import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/rbac'

export async function GET() {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const serviceSupabase = await createServiceClient()

    // 1. Fetch flagged and suspended profiles
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        avatar_url,
        issue_flag_count,
        is_flagged,
        cancellation_count,
        is_suspended,
        suspended_at,
        suspension_reason,
        created_at
      `)
      .or('is_flagged.eq.true,is_suspended.eq.true,issue_flag_count.gt.0,cancellation_count.gt.0')
      .order('suspended_at', { ascending: false, nullsFirst: false })
      .order('issue_flag_count', { ascending: false })

    if (profilesError) {
      console.error('[ADMIN MODERATION PROFILES ERROR]:', profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // 2. Fetch recent moderation logs
    const { data: logs, error: logsError } = await serviceSupabase
      .from('account_moderation_log')
      .select(`
        id,
        user_id,
        action,
        reason,
        actor,
        created_at,
        user:profiles!account_moderation_log_user_id_fkey (id, full_name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (logsError) {
      console.warn('[ADMIN MODERATION LOGS WARNING]:', logsError)
    }

    // 3. Fetch issue reports associated with these users (where reported_user_id is set)
    const userIds = (profiles || []).map(p => p.id)
    let userReports = []
    if (userIds.length > 0) {
      const { data: reports, error: reportsError } = await serviceSupabase
        .from('issue_reports')
        .select(`
          id,
          request_id,
          reporter_id,
          reported_user_id,
          reason_header,
          comment,
          created_at,
          reporter:profiles!issue_reports_reporter_id_fkey (id, full_name, role)
        `)
        .in('reported_user_id', userIds)
        .order('created_at', { ascending: false })

      if (!reportsError && reports) {
        userReports = reports
      }
    }

    // Group reports by reported_user_id
    const reportsByUser = {}
    userReports.forEach(r => {
      if (!reportsByUser[r.reported_user_id]) {
        reportsByUser[r.reported_user_id] = []
      }
      reportsByUser[r.reported_user_id].push(r)
    })

    const enrichedProfiles = (profiles || []).map(p => ({
      ...p,
      reports: reportsByUser[p.id] || [],
    }))

    return NextResponse.json({
      profiles: enrichedProfiles,
      logs: logs || [],
    }, { status: 200 })
  } catch (err) {
    console.error('[ADMIN MODERATION ROUTE ERROR]:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
