/**
 * Tests for the environment variable validation module.
 * These tests must run in an isolated environment where we control process.env.
 */

describe('env validation module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test so we start clean
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws an error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => {
      require('@/lib/env');
    }).toThrow('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  });

  it('throws an error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      require('@/lib/env');
    }).toThrow('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('exports env object with all required vars when they are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const { env } = require('@/lib/env');

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
  });

  it('throws an informative error message that names the missing variable', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    delete process.env.OPENAI_API_KEY;

    expect(() => {
      require('@/lib/env');
    }).toThrow('Missing required environment variable: OPENAI_API_KEY');
  });
});
