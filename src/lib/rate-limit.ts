import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

const hasRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const rateLimiters: Record<string, Ratelimit> = redis
  ? {
      auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') }),
      generate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') }),
      scrape: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') }),
      export: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') }),
      demo: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60 s') }),
      email: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s') }),
    }
  : {};

export async function checkRateLimit(
  key: string,
  limiterName: string
): Promise<{ limited: boolean; remaining: number; retryAfter: number }> {
  const limiter = rateLimiters[limiterName];
  if (!limiter) return { limited: false, remaining: 999, retryAfter: 0 };

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      limited: !success,
      remaining,
      retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000),
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    // Fail closed for sensitive and public-facing endpoints
    if (['auth', 'generate', 'email', 'demo'].includes(limiterName)) {
      return { limited: true, remaining: 0, retryAfter: 60 };
    }
    return { limited: false, remaining: 999, retryAfter: 0 };
  }
}

export function getClientIp(request: Request & { ip?: string }): string {
  // On Vercel, request.ip is platform-provided and cannot be spoofed
  if ((request as any).ip) {
    return (request as any).ip;
  }
  // Fallback for local development only
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Rate-limit exemption — checks profiles.rate_limit_exempt via Redis cache
// ---------------------------------------------------------------------------

const EXEMPT_CACHE_PREFIX = 'rate_exempt:';
const EXEMPT_CACHE_TTL = 60; // seconds

/**
 * Check whether a user is exempt from per-request rate limiting.
 *
 * Lookup order:
 *   1. Redis cache (`rate_exempt:{userId}`) — avoids DB on every request
 *   2. On cache miss → Supabase query via service-role client
 *   3. Result cached in Redis with 60 s TTL
 *
 * Fails closed: returns `false` (not exempt) if Redis is unavailable or the
 * DB query fails, so non-exempt users are never accidentally let through.
 */
export async function isRateLimitExempt(userId: string): Promise<boolean> {
  if (!redis) return false;

  try {
    // 1. Check Redis cache
    const cached = await redis.get<string>(`${EXEMPT_CACHE_PREFIX}${userId}`);
    if (cached !== null && cached !== undefined) return cached === '1';

    // 2. Cache miss — query Supabase with service-role key
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
      .from('profiles')
      .select('rate_limit_exempt')
      .eq('id', userId)
      .single();

    const exempt = data?.rate_limit_exempt === true;

    // 3. Cache the result (60 s TTL)
    await redis.set(`${EXEMPT_CACHE_PREFIX}${userId}`, exempt ? '1' : '0', { ex: EXEMPT_CACHE_TTL });

    return exempt;
  } catch (err) {
    console.error('Rate-limit exemption check failed:', err);
    return false; // fail closed
  }
}

/**
 * Proactively clear the cached exemption status for a user.
 * Call this when the admin toggles the rate_limit_exempt flag so the change
 * takes effect immediately instead of waiting up to 60 s for TTL expiry.
 */
export async function clearExemptionCache(userId: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`${EXEMPT_CACHE_PREFIX}${userId}`);
  } catch {
    // Best-effort — the TTL will expire it within 60 s anyway
  }
}

// ---------------------------------------------------------------------------
// Lightweight userId extraction from Supabase session cookie
// ---------------------------------------------------------------------------

/**
 * Extract the authenticated user's ID from the Supabase session cookie
 * without making any network calls.
 *
 * This reads the `sb-{ref}-auth-token` cookie (handling chunked cookies),
 * parses the session JSON, and decodes the JWT `sub` claim.
 *
 * NOT used for authentication — only to obtain a userId for the exemption
 * cache lookup.  Actual auth is handled later by `updateSession()`.
 */
export function getUserIdFromSession(request: NextRequest): string | null {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    // Derive project ref from URL (e.g. "https://abcxyz.supabase.co" → "abcxyz")
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const cookieBase = `sb-${projectRef}-auth-token`;

    // Collect the cookie value, handling @supabase/ssr chunked cookies
    const allCookies = request.cookies.getAll();
    let sessionStr: string | undefined;

    const singleCookie = allCookies.find(c => c.name === cookieBase);
    if (singleCookie) {
      sessionStr = singleCookie.value;
    } else {
      // Chunked: sb-{ref}-auth-token.0, .1, .2, …
      const chunks = allCookies
        .filter(c => c.name.startsWith(`${cookieBase}.`))
        .sort((a, b) => {
          const aIdx = parseInt(a.name.split('.').pop() || '0', 10);
          const bIdx = parseInt(b.name.split('.').pop() || '0', 10);
          return aIdx - bIdx;
        });

      if (chunks.length > 0) {
        sessionStr = chunks.map(c => c.value).join('');
      }
    }

    if (!sessionStr) return null;

    // Parse session JSON
    const session = JSON.parse(sessionStr);
    const accessToken: string | undefined = session?.access_token;
    if (!accessToken) return null;

    // Decode JWT payload — base64url → base64 → JSON
    const payloadB64 = accessToken.split('.')[1];
    if (!payloadB64) return null;

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    // Any failure → treat as unauthenticated (rate limiting proceeds normally)
    return null;
  }
}
