/**
 * Tests for the compliance-qa cron route authorization logic.
 *
 * These tests mock the heavy dependencies (Supabase, AI generation) and focus
 * on verifying the auth guard behavior.
 *
 * @jest-environment node
 */

// Mock env module before any imports
jest.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    OPENAI_API_KEY: 'sk-test',
    UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    CRON_SECRET: 'test-cron-secret',
  },
}));

// Mock Supabase client to prevent real DB calls
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

// Mock AI generation
jest.mock('@/lib/ai/generate', () => ({
  generateCampaign: jest.fn(),
}));

// Mock compliance settings
jest.mock('@/lib/compliance/compliance-settings', () => ({
  getComplianceSettings: jest.fn(),
}));

// Polyfill Web APIs for Next.js (Node 18+ may have them natively)
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici');
  Object.assign(global, { Request, Response, Headers, fetch: async () => new Response() });
}

import { GET } from '../route';
import { NextRequest } from 'next/server';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/cron/compliance-qa', {
    headers,
  });
}

describe('GET /api/cron/compliance-qa', () => {
  it('returns 401 when authorization header is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when authorization header has wrong secret', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when authorization header is Bearer undefined', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer undefined' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('passes auth check and returns 200 with correct secret', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }));
    // Passes auth; mock Supabase returns no properties, so route returns "No test properties"
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('No test properties');
  });
});
