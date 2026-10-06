import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can escalate users' }, { status: 403 })
    }

    const { data: { users }, error: usersError } = await serviceSupabase.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', targetUser.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user role in profiles table' }, { status: 500 })
    }

    // Sync auth.users user_metadata so fallback profile reads and JWT claims stay in lockstep
    const { error: authMetaError } = await serviceSupabase.auth.admin.updateUserById(
      targetUser.id,
      {
        user_metadata: {
          ...(targetUser.user_metadata || {}),
          role: 'admin'
        }
      }
    )

    if (authMetaError) {
      console.warn(`[ESCALATE] Failed to sync auth user_metadata for ${targetUser.id}:`, authMetaError.message)
    }

    return NextResponse.json({
      message: 'User escalated to admin successfully',
      userId: targetUser.id,
      email: email
    })
  } catch (err) {
    console.error('Admin escalation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
