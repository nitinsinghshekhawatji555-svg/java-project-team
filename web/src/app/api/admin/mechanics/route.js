// src/app/api/admin/mechanics/route.js
// GET  → fetch mechanics by verification status
// PATCH → approve or reject a mechanic

import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  getMechanicsByStatus,
  updateMechanicVerification,
} from '@/lib/admin'
import { NOTIFICATION_TYPE } from '@/lib/constants'
import { NextResponse } from 'next/server'

/**
 * Reusable admin auth verification sentinel layer
 * Ensures the requesting session belongs strictly to a verified system administrator
 */
async function requireAdmin(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')

  return { user, profile }
}

export async function GET(req) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    await requireAdmin(supabase)

    // Read ?status=pending from query parameters — defaults to pending queue arrays
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    const mechanics = await getMechanicsByStatus(serviceSupabase, status)

    return NextResponse.json({ mechanics }, { status: 200 })

  } catch (err) {
    const status = err.message === 'Unauthorized' ? 401
      : err.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}

export async function PATCH(req) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    const { user } = await requireAdmin(supabase)

    const body = await req.json()
    const { mechanicUserId, newStatus, reason } = body

    // Standardize input mappings parameters
    const statusMap = { verified: 'approved', approve: 'approved' }
    const dbStatus = newStatus === 'more_info' ? 'pending' : (statusMap[newStatus] || newStatus)

    if (!mechanicUserId || !newStatus) {
      return NextResponse.json(
        { error: 'mechanicUserId and newStatus are required' },
        { status: 400 }
      )
    }

    if (newStatus === 'rejected' && (!reason || !reason.trim())) {
      return NextResponse.json(
        { error: 'A justification reason is required when rejecting a mechanic application' },
        { status: 400 }
      )
    }

    // 1. Commit review parameters log straight to the mechanic_verifications ledger
    const updated = await updateMechanicVerification(
      serviceSupabase,
      mechanicUserId,
      newStatus,
      user.id,  // adminId tracking parameter for database logs audit trail
      reason
    )

    // 2. Map verification status straight to the true matching schema field column
    const { error: profileLinkError } = await serviceSupabase
      .from('mechanic_profiles')
      .update({ verification_status: dbStatus })
      .eq('user_id', mechanicUserId)

    if (profileLinkError) {
      console.error('[SCHEMA CRASH] Failed to sync verification status parameters to mechanic_profiles:', profileLinkError.message)
    }

    // ========================================================================
    // DYNAMIC NOTIFICATION & ACCOUNT MANAGEMENT WORKFLOW LOOPS
    // ========================================================================
    if (dbStatus === 'approved') {
      const { error: notificationError } = await serviceSupabase
        .from('notifications')
        .insert({
          profile_id: mechanicUserId,
          type: NOTIFICATION_TYPE.VERIFICATION,
          title: 'Profile verified',
          body: 'Your RoadRescue professional profile has been verified. You can now toggle your status to Active to receive live emergency requests.',
          is_read: false,
        })

      if (notificationError) {
        console.warn('Failed to create mechanic approval notification:', notificationError.message)
      }
    }

    if (newStatus === 'rejected') {
      // Fetch mechanic registration email profile securely using service role permissions bypass
      const { data: mechanicProfile, error: emailErr } = await serviceSupabase
        .from('profiles')
        .select('email')
        .eq('id', mechanicUserId)
        .maybeSingle()

      if (emailErr) {
        console.warn('Failed to fetch rejected mechanic email records payload:', emailErr)
      }

      if (mechanicProfile?.email) {
        // Enforce account firewall blacklist blocks
        const { error: blockErr } = await serviceSupabase
          .from('blocked_emails')
          .insert({
            email: mechanicProfile.email,
            reason: 'Mechanic profile rejected by admin operations control board',
          })

        if (blockErr && !String(blockErr.message || '').toLowerCase().includes('duplicate')) {
          console.warn('Failed to add email parameter address to system block list:', blockErr)
        }

        // Drop auth credentials immediately to destroy active sessions
        try {
          await serviceSupabase.auth.admin.deleteUser(mechanicUserId)
        } catch (deleteErr) {
          console.warn('Failed to delete rejected auth user framework node (non-fatal):', deleteErr)
        }
      }

      const { error: notificationError } = await serviceSupabase
        .from('notifications')
        .insert({
          profile_id: mechanicUserId,
          type: NOTIFICATION_TYPE.VERIFICATION,
          title: 'Profile registration rejected',
          body: 'Your profile verification was rejected. Your account has been disabled. You cannot create a new account with this email.',
          is_read: false,
        })

      if (notificationError) {
        console.warn('Failed to commit rejection verification notification row:', notificationError)
      }
    }

    if (newStatus === 'more_info') {
      const { error: notificationError } = await serviceSupabase
        .from('notifications')
        .insert({
          profile_id: mechanicUserId,
          type: NOTIFICATION_TYPE.VERIFICATION,
          title: 'Additional information required',
          body: 'Please provide additional documentation or information for your verification to proceed.',
          is_read: false,
        })

      if (notificationError) {
        console.warn('Failed to create descriptive info feedback notification log:', notificationError)
      }

      // Fetch mechanic registration email profile securely using service role permissions bypass
      const { data: mechanicProfile, error: emailErr } = await serviceSupabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', mechanicUserId)
        .maybeSingle()

      if (emailErr) {
        console.warn('Failed to fetch mechanic email records payload for more_info notification:', emailErr)
      }

      if (mechanicProfile?.email) {
        try {
          const resendApiKey = process.env.RESEND_API_KEY
          if (!resendApiKey) {
            console.error('[EMAIL ERROR] Missing RESEND_API_KEY env variable')
          } else {
            const resendInstance = new Resend(resendApiKey)
            const primaryFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@roadrescue.com'
            const fallbackFromEmail = 'RoadRescue <onboarding@resend.dev>'
            const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/mechanic/account`

            const emailHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f8f8; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Credentials Requested</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; color: #334155; line-height: 1.6;">
                  <p>Hi <strong>${mechanicProfile.full_name || 'Specialist'}</strong>,</p>
                  <p>Our admin team has reviewed your profile application for the RoadRescue network. We require additional or clearer credentials (such as an ID or business clearance certificate) to proceed with your verification.</p>
                  <p>Please log into your dashboard to upload these documents.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; background: #f5c400; color: #111827; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Upload Credentials</a>
                  </div>
                  <p>Thank you for partnering with RoadRescue!</p>
                </div>
              </div>
            `

            let result = await resendInstance.emails.send({
              from: primaryFromEmail,
              to: mechanicProfile.email,
              subject: 'Action Required: RoadRescue Profile Credentials Needed',
              html: emailHtml,
            })

            if (result.error?.statusCode === 403 || result.error?.name === 'validation_error') {
              console.warn('Primary Resend sender rejected, retrying with fallback onboarding sender')
              result = await resendInstance.emails.send({
                from: fallbackFromEmail,
                to: mechanicProfile.email,
                subject: 'Action Required: RoadRescue Profile Credentials Needed',
                html: emailHtml,
              })
            }

            if (result.error) {
              console.error('[EMAIL ERROR] Failed to send more_info email via Resend:', result.error)
            } else if (process.env.NODE_ENV === 'development') {
              console.log('Verification update email sent successfully:', result.data.id)
            }
          }
        } catch (err) {
          console.error('[EMAIL ERROR] Unexpected failure in Resend notification sender:', err)
        }
      }
    }

    return NextResponse.json({ mechanic: updated }, { status: 200 })

  } catch (err) {
    const status = err.message === 'Unauthorized' ? 401
      : err.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}