import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeInput } from '@/lib/validate'

async function requireUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)

    const { data, error } = await supabase
      .from('profile_change_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data || [] }, { status: 200 })
  } catch (error) {
    const status = error.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function POST(req) {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)
    const rawBody = await req.json()
    const body = sanitizeInput(rawBody)

    const { role, target_table, field_key, old_value, new_value, reason } = body

    if (!role || !target_table || !field_key || typeof new_value === 'undefined') {
      return NextResponse.json({ error: 'role, target_table, field_key, and new_value are required' }, { status: 400 })
    }

    const insertPayload = {
      user_id: user.id,
      target_table,
      field_key,
      old_value: old_value ?? null,
      new_value,
    }

    let { data, error } = await supabase
      .from('profile_change_requests')
      .insert({
        ...insertPayload,
        role,
        reason: reason || null,
      })
      .select('*')
      .single()

    if (error && (error.message.includes('role') || error.message.includes('reason'))) {
      const fbRes = await supabase
        .from('profile_change_requests')
        .insert(insertPayload)
        .select('*')
        .single()
      data = fbRes.data
      error = fbRes.error
    }

    if (error) throw error

    return NextResponse.json({ request: data }, { status: 201 })
  } catch (error) {
    const status = error.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}