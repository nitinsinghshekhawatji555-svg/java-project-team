import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const roleRoutes = {
  driver: '/dashboard/driver',
  mechanic: '/dashboard/mechanic',
  admin: '/dashboard/admin',
}

// Fixed: The keys here must be the literal role strings, not the paths, 
// to match how they are checked in your routing loop down below.
const dashboardPathToRole = {
  '/dashboard/driver': 'driver',
  '/dashboard/mechanic': 'mechanic',
  '/dashboard/admin': 'admin',
}

const isPathForRole = (pathname, role) => {
  const base = roleRoutes[role]
  if (!base) return false
  return pathname === base || pathname.startsWith(`${base}/`)
}

const createSupabaseClient = (request, response) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function proxy(request) {
  const { pathname } = request.nextUrl
  
  // 1. CRITICAL BYPASS: Drop out immediately if hitting asset pathways, 
  // public images, or static files to avoid interception overhead.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  const supabase = createSupabaseClient(request, response)

  // Retrieve user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

  // ==========================================
  // BRANCH 1: UNAUTHENTICATED USERS (NO SESSION)
  // ==========================================
  if (!user || authError) {
    if (isDashboardRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return response
  }

  // Fetch verified profile role from database since user session is active
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const userRole = profile?.role || user.user_metadata?.role || null
  const isValidRole = userRole && roleRoutes[userRole]

  // ==========================================
  // BRANCH 2: AUTHENTICATED USERS WITH VALID ROLE
  // ==========================================
  if (isValidRole) {
    const homePath = roleRoutes[userRole]

    // Prevent authenticated user from viewing login/register landing portals
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) {
      return NextResponse.redirect(new URL(homePath, request.url))
    }

    // Strict Dashboard Area Multi-Role RBAC Check
    if (isDashboardRoute) {
      let handled = false

      for (const [dashPath, requiredRole] of Object.entries(dashboardPathToRole)) {
        // Check if current URL path matches this role's structural section
        if (pathname === dashPath || pathname.startsWith(`${dashPath}/`)) {
          if (userRole !== requiredRole) {
            return NextResponse.redirect(new URL(homePath, request.url))
          }
          handled = true
          break
        }
      }

      // Catch-all: If user lands directly on "/dashboard" bare, route them to their actual home space
      if (!handled && (pathname === '/dashboard' || userRole !== dashboardPathToRole[pathname])) {
        return NextResponse.redirect(new URL(homePath, request.url))
      }
    }
  } else {
    // ==========================================
    // BRANCH 3: AUTHENTICATED USERS WITH NO/INVALID ROLE
    // ==========================================
    // Redirect dashboard requests to login, but allow accessing login/register portals without loops.
    if (isDashboardRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

// Structural Proxy Filter Config (Ensures standard public entrypoints are isolated)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*'
  ],
}