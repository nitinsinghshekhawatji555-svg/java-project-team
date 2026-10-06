import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeInput } from '@/lib/validate'

async function requireUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

// ================================================
// GET METHOD: READ USER PREFERENCES ROW
// ================================================
export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const { data, error } = await supabase
      .from('profile_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    // PRODUCTION HARDENING: If no preference row exists yet, return default baseline tokens
    const operationalPreferences = data || {
      user_id: user.id,
      theme: 'System',
      preferred_language: 'English',
      notification_preferences: { jobAlerts: true, messageAlerts: true, push: true },
      communication_preferences: ['call', 'sms'],
      secondary_phone: ''
    }

    return NextResponse.json({ preferences: operationalPreferences }, { status: 200 })
  } catch (error) {
    console.error('[SERVER ROUTE FAULT] GET preferences failed:', error.message)
    const status = error.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

// ================================================
// PUT METHOD: UPSERT PREFERENCES MATRIX
// ================================================
export async function PUT(req) {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)
    const rawBody = await req.json()
    const body = sanitizeInput(rawBody)

    const payload = {
      user_id: user.id,
      theme: body.theme || 'system',
      preferred_language: body.preferred_language || 'en',
      notification_preferences: body.notification_preferences || { jobAlerts: true, messageAlerts: true, push: true },
      communication_preferences: body.communication_preferences || ['call', 'sms'],
      secondary_phone: body.secondary_phone || null,
      home_location_label: body.home_location_label || null,
      work_location_label: body.work_location_label || null,
      bio: body.bio || null,
    }

    const { data, error } = await supabase
      .from('profile_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ preferences: data }, { status: 200 })
  } catch (error) {
    console.error('[SERVER ROUTE FAULT] PUT preferences failed:', error.message)
    const status = error.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: error.message || 'Failed to upsert preference fields' }, { status })
  }
}