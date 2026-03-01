/**
 * Tests for rate-limit exemption helpers:
 *   - isRateLimitExempt()  — Redis cache + DB fallback
 *   - clearExemptionCache() — proactive cache invalidation
 *   - getUserIdFromSession() — lightweight JWT extraction from Supabase cookie
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
  })),
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(jest.fn(), {
    slidingWindow: jest.fn(),
  }),
}));

const mockSupabaseFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

// Set required env vars BEFORE importing the module
process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testref.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';

import { isRateLimitExempt, clearExemptionCache, getUserIdFromSession } from './rate-limit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal JWT with the given payload (no signature verification needed). */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

/** Build a mock NextRequest with the given cookies. */
function mockRequest(cookies: Array<{ name: string; value: string }>): any {
  return {
    cookies: {
      getAll: () => cookies,
    },
  };
}

// ---------------------------------------------------------------------------
// isRateLimitExempt
// ---------------------------------------------------------------------------

describe('isRateLimitExempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns true when Redis cache contains "1"', async () => {
    mockRedisGet.mockResolvedValue('1');

    const result = await isRateLimitExempt('user-123');

    expect(result).toBe(true);
    expect(mockRedisGet).toHaveBeenCalledWith('rate_exempt:user-123');
    // Should NOT query DB on cache hit
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('returns false when Redis cache contains "0"', async () => {
    mockRedisGet.mockResolvedValue('0');

    const result = await isRateLimitExempt('user-456');

    expect(result).toBe(false);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('queries DB on cache miss and caches exempt=true', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { rate_limit_exempt: true } }),
        }),
      }),
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await isRateLimitExempt('user-789');

    expect(result).toBe(true);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
    expect(mockRedisSet).toHaveBeenCalledWith('rate_exempt:user-789', '1', { ex: 60 });
  });

  test('queries DB on cache miss and caches exempt=false', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { rate_limit_exempt: false } }),
        }),
      }),
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await isRateLimitExempt('user-000');

    expect(result).toBe(false);
    expect(mockRedisSet).toHaveBeenCalledWith('rate_exempt:user-000', '0', { ex: 60 });
  });

  test('returns false when profile not found in DB', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null }),
        }),
      }),
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await isRateLimitExempt('nonexistent');

    expect(result).toBe(false);
    expect(mockRedisSet).toHaveBeenCalledWith('rate_exempt:nonexistent', '0', { ex: 60 });
  });

  test('fails closed (returns false) when Redis throws', async () => {
    mockRedisGet.mockRejectedValue(new Error('Redis connection failed'));

    const result = await isRateLimitExempt('user-err');

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearExemptionCache
// ---------------------------------------------------------------------------

describe('clearExemptionCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes the cached key from Redis', async () => {
    mockRedisDel.mockResolvedValue(1);

    await clearExemptionCache('user-123');

    expect(mockRedisDel).toHaveBeenCalledWith('rate_exempt:user-123');
  });

  test('does not throw when Redis.del fails', async () => {
    mockRedisDel.mockRejectedValue(new Error('Redis down'));

    // Should not throw
    await expect(clearExemptionCache('user-456')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getUserIdFromSession
// ---------------------------------------------------------------------------

describe('getUserIdFromSession', () => {
  const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  test('extracts userId from a single auth cookie', () => {
    const jwt = makeJwt({ sub: userId, exp: Date.now() / 1000 + 3600 });
    const sessionJson = JSON.stringify({ access_token: jwt, refresh_token: 'rt' });

    const request = mockRequest([
      { name: 'sb-testref-auth-token', value: sessionJson },
    ]);

    expect(getUserIdFromSession(request)).toBe(userId);
  });

  test('extracts userId from chunked auth cookies', () => {
    const jwt = makeJwt({ sub: userId, exp: Date.now() / 1000 + 3600 });
    const sessionJson = JSON.stringify({ access_token: jwt, refresh_token: 'rt' });

    // Split into 3 chunks
    const chunkSize = Math.ceil(sessionJson.length / 3);
    const chunks = [
      sessionJson.slice(0, chunkSize),
      sessionJson.slice(chunkSize, chunkSize * 2),
      sessionJson.slice(chunkSize * 2),
    ];

    const request = mockRequest([
      { name: 'sb-testref-auth-token.0', value: chunks[0] },
      { name: 'sb-testref-auth-token.1', value: chunks[1] },
      { name: 'sb-testref-auth-token.2', value: chunks[2] },
    ]);

    expect(getUserIdFromSession(request)).toBe(userId);
  });

  test('returns null when no auth cookie present', () => {
    const request = mockRequest([
      { name: 'some-other-cookie', value: 'value' },
    ]);

    expect(getUserIdFromSession(request)).toBeNull();
  });

  test('returns null when cookie contains invalid JSON', () => {
    const request = mockRequest([
      { name: 'sb-testref-auth-token', value: 'not-json' },
    ]);

    expect(getUserIdFromSession(request)).toBeNull();
  });

  test('returns null when session has no access_token', () => {
    const sessionJson = JSON.stringify({ refresh_token: 'rt' });
    const request = mockRequest([
      { name: 'sb-testref-auth-token', value: sessionJson },
    ]);

    expect(getUserIdFromSession(request)).toBeNull();
  });

  test('returns null when JWT payload has no sub claim', () => {
    const jwt = makeJwt({ exp: Date.now() / 1000 + 3600 });
    const sessionJson = JSON.stringify({ access_token: jwt, refresh_token: 'rt' });

    const request = mockRequest([
      { name: 'sb-testref-auth-token', value: sessionJson },
    ]);

    expect(getUserIdFromSession(request)).toBeNull();
  });

  test('handles chunked cookies in unsorted order', () => {
    const jwt = makeJwt({ sub: userId, exp: Date.now() / 1000 + 3600 });
    const sessionJson = JSON.stringify({ access_token: jwt, refresh_token: 'rt' });

    const mid = Math.ceil(sessionJson.length / 2);
    const chunk0 = sessionJson.slice(0, mid);
    const chunk1 = sessionJson.slice(mid);

    // Provide chunks in reverse order — function should sort by index
    const request = mockRequest([
      { name: 'sb-testref-auth-token.1', value: chunk1 },
      { name: 'sb-testref-auth-token.0', value: chunk0 },
    ]);

    expect(getUserIdFromSession(request)).toBe(userId);
  });
});
