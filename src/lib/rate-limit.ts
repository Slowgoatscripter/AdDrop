interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimitResult {
  limited: boolean
  remaining: number
  retryAfter: number
}

interface RateLimitConfig {
  limit: number
  windowMs: number
}

const MAX_MAP_SIZE = 10_000

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function ensureCleanup(windowMs: number) {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now - entry.windowStart > windowMs * 2) {
        store.delete(key)
      }
    }
  }, 60_000)
  // Allow process to exit without waiting for interval
  if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref()
  }
}

function evictLRU() {
  if (store.size <= MAX_MAP_SIZE) return
  // Delete oldest entries (first inserted)
  const toDelete = store.size - MAX_MAP_SIZE
  let deleted = 0
  for (const key of store.keys()) {
    if (deleted >= toDelete) break
    store.delete(key)
    deleted++
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  ensureCleanup(config.windowMs)

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now })
    evictLRU()
    return { limited: false, remaining: config.limit - 1, retryAfter: 0 }
  }

  entry.count++

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000)
    return { limited: true, remaining: 0, retryAfter }
  }

  return { limited: false, remaining: config.limit - entry.count, retryAfter: 0 }
}

export function getClientIp(request: Request & { ip?: string }): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return (request as { ip?: string }).ip || 'unknown'
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { limit: 10, windowMs: 60_000 },       // 10 req/min for auth pages
  generate: { limit: 20, windowMs: 60_000 },    // 20 req/min for generation
  scrape: { limit: 20, windowMs: 60_000 },      // 20 req/min for scraping
  export: { limit: 10, windowMs: 60_000 },      // 10 req/min for exports
  demo: { limit: 30, windowMs: 60_000 },        // 30 req/min for landing page demo
}
