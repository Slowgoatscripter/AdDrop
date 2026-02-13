import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

function getRateLimitKey(pathname: string): string | null {
  if (['/login', '/signup', '/forgot-password'].some(p => pathname === p)) return 'auth'
  if (pathname === '/api/generate') return 'generate'
  if (pathname === '/api/scrape' || pathname === '/api/mls-lookup') return 'scrape'
  if (pathname === '/api/export') return 'export'
  return null
}

export async function middleware(request: NextRequest) {
  // Block TRACE method
  if (request.method === 'TRACE') {
    return new NextResponse(null, { status: 405 })
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey(request.nextUrl.pathname)
  if (rateLimitKey) {
    const ip = getClientIp(request)
    const config = RATE_LIMIT_CONFIGS[rateLimitKey]
    const result = checkRateLimit(`${rateLimitKey}:${ip}`, config)

    if (result.limited) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
        },
      })
    }
  }

  const response = await updateSession(request)

  // Strip Next.js internal headers
  response.headers.delete('x-nextjs-cache')
  response.headers.delete('x-nextjs-prerender')
  response.headers.delete('x-nextjs-stale-time')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
