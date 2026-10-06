import { createClient } from '@/lib/supabase/client'

// SIGNUP
export async function signUp({ email, password, fullName, phone, role }) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role, // 'driver' | 'mechanic'
      }
    }
  })

  if (error) throw error
  return data
}

// LOGIN
export async function signIn({ email, password }) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// FORGOT PASSWORD / RECOVERY
export async function resetPasswordForEmail(email) {
  const supabase = createClient()
  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://roadrescue-gh.vercel.app')
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  })
  if (error) throw error
  return data
}

// UPDATE PASSWORD (AFTER RECOVERY LINK AUTH)
export async function updatePassword(newPassword) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return data
}

// LOGOUT
export async function signOut() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: activeJobs } = await supabase
      .from('rescue_requests')
      .select('id')
      .eq('mechanic_id', user.id)
      .in('status', ['accepted', 'en_route', 'arrived', 'in_progress'])
      .limit(1)

    const currentStatusVal = (activeJobs && activeJobs.length > 0) ? new Date().toISOString() : null

    await supabase
      .from('mechanic_profiles')
      .update({ 
        is_available: false, 
        current_status: currentStatusVal 
      })
      .eq('user_id', user.id)
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// GET CURRENT USER + PROFILE
export async function getCurrentUser() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const resolvePhoneNumber = (profileVal, userObj) => {
    const isValidPhone = (val) => {
      if (!val) return false
      const clean = val.toString().trim()
      return clean.length > 0 && !/[a-zA-Z]/.test(clean)
    }
    
    const userMetaPhone = userObj?.user_metadata?.phone
    if (isValidPhone(userMetaPhone)) return userMetaPhone.toString().trim()

    const pPhone = typeof profileVal === 'object' ? profileVal?.phone : profileVal
    if (isValidPhone(pPhone)) return pPhone.toString().trim()

    const userPhone = userObj?.phone
    if (isValidPhone(userPhone)) return userPhone.toString().trim()

    return ''
  }

  const fallbackProfile = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || '',
    phone: resolvePhoneNumber(null, user),
    role: user.user_metadata?.role || 'driver',
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return fallbackProfile

  const extendedProfile = profile ? { ...profile } : { ...fallbackProfile }
  extendedProfile.phone = resolvePhoneNumber(profile, user)
  const role = profile?.role || fallbackProfile.role

  if (role === 'mechanic') {
    const { data: mechanicProfile } = await supabase
      .from('mechanic_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (mechanicProfile) {
      extendedProfile.mechanic_profile = mechanicProfile
    }
  }

  if (role === 'driver') {
    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (driverProfile) {
      extendedProfile.driver_profile = driverProfile
    }
  }

  return {
    id: user.id,
    email: user.email,
    ...extendedProfile
  }
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserRole() {
  const currentUser = await getCurrentUser()
  return currentUser?.role || null
}