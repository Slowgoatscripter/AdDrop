import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters: Record<string, Ratelimit> = {
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') }),
  generate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') }),
  scrape: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') }),
  export: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') }),
  demo: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60 s') }),
  email: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s') }),
};

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
    // Fail closed for sensitive endpoints, open for others
    if (['auth', 'generate', 'email'].includes(limiterName)) {
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
