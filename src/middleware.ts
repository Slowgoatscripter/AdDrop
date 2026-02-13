import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Block TRACE method
  if (request.method === 'TRACE') {
    return new NextResponse(null, { status: 405 })
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
