import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  const nextParam = searchParams.get('next') ?? '/dashboard'

  // Handle Supabase error redirects (e.g. expired OTP)
  if (error) {
    const isPasswordReset = nextParam === '/reset-password'
    if (isPasswordReset) {
      const url = new URL('/forgot-password', request.url)
      url.searchParams.set('error', errorCode === 'otp_expired'
        ? 'Your reset link has expired. Please request a new one.'
        : errorDescription || 'Something went wrong. Please try again.')
      return NextResponse.redirect(url)
    }
    const url = new URL('/login', request.url)
    url.searchParams.set('error', errorDescription || 'auth_callback_failed')
    return NextResponse.redirect(url)
  }

  // SECURITY: Validate redirect target to prevent open redirect (CRIT-2)
  // Must be a relative path starting with / and not protocol-relative //
  const safeNext = (nextParam.startsWith('/') && !nextParam.startsWith('//')) ? nextParam : '/dashboard'

  const redirectTo = code
    ? new URL(safeNext, request.url)
    : new URL('/login?error=auth_callback_failed', request.url)

  // Create the response first so setAll can attach cookies to it
  const response = NextResponse.redirect(redirectTo)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }

    // Exchange failed — redirect to login with error
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', request.url)
    )
  }

  // No code provided — redirect to login with error
  return response
}
