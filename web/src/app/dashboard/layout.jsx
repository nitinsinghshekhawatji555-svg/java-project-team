import DashboardShell from '@/components/layout/DashboardShell'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const roleRoutes = {
  driver: '/dashboard/driver',
  mechanic: '/dashboard/mechanic',
  admin: '/dashboard/admin',
}

const isPathForRole = (pathname, role) => {
  const base = roleRoutes[role]
  return pathname === base || pathname.startsWith(`${base}/`)
}

export default async function DashboardLayout({ children }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || '/dashboard'

  const supabase = await createClient()
  const auth = await supabase.auth.getUser()
  const authUser = auth.data?.user
  const authError = auth.error

  if (authError || !authUser) {
    redirect('/auth/login')
  }

  // Prioritize checking the profile table database record (matches proxy.js behavior)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profileError) {
    redirect('/auth/login')
  }

  const role = profile?.role || authUser.user_metadata?.role || null

  if (!role || !roleRoutes[role]) {
    redirect('/auth/login')
  }

  const homePath = roleRoutes[role]

  if (!isPathForRole(pathname, role)) {
    redirect(homePath)
  }

  return (
    <DashboardShell initialRole={role}>
      {children}
    </DashboardShell>
  )
}
