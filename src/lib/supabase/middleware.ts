import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Resolve user role from JWT claims (set by custom_access_token_hook)
 * with fallback to profiles table query during transition period.
 */
async function resolveUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | null> {
  // Try JWT claims first (from custom_access_token_hook)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.access_token) {
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      if (payload.user_role) {
        return payload.user_role
      }
    } catch {
      // JWT parsing failed, fall through to profiles query
    }
  }

  // Fallback: query profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role ?? null
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check admin role (JWT claims with profiles fallback)
    const userRole = await resolveUserRole(supabase, user.id)

    if (userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // MFA enforcement for admin routes
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalData) {
      const { currentLevel, nextLevel } = aalData

      if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
        // MFA enrolled but not verified this session -> challenge
        const url = request.nextUrl.clone()
        url.pathname = '/mfa-challenge'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
      }

      if (nextLevel === 'aal1') {
        // No MFA enrolled -> send to enrollment page
        const url = request.nextUrl.clone()
        url.pathname = '/settings/security'
        return NextResponse.redirect(url)
      }

      // currentLevel === 'aal2' -> MFA verified, allow through
    }
  }

  // Protect user routes (dashboard, settings, mfa-challenge)
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/mfa-challenge')
  ) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth pages
  const authPages = ['/login', '/signup', '/forgot-password']
  if (authPages.includes(pathname) && user) {
    const userRole = await resolveUserRole(supabase, user.id)

    const url = request.nextUrl.clone()
    url.pathname = userRole === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
