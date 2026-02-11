import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'

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
