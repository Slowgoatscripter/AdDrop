/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/auth-helpers', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/usage/campaign-limits', () => ({
  getCampaignUsage: jest.fn(),
}))

jest.mock('@/lib/stripe/gate', () => ({
  getUserTier: jest.fn(),
}))

// Polyfill Web APIs for Next.js
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextEncoder, TextDecoder })

if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici')
  Object.assign(global, { Request, Response, Headers, fetch: async () => new Response() })
}

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import { getUserTier } from '@/lib/stripe/gate'
import type { ListingData } from '@/lib/types'

describe('POST /api/campaign/create', () => {
  const mockInsert = jest.fn()
  const mockFrom = jest.fn(() => ({ insert: mockInsert }))
  const mockSupabase = { from: mockFrom } as unknown as { from: typeof mockFrom }

  const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
  const mockGetCampaignUsage = getCampaignUsage as jest.MockedFunction<typeof getCampaignUsage>
  const mockGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>

  const mockListing: ListingData = {
    url: 'https://example.com/listing/123',
    address: {
      street: '123 Main St',
      city: 'Bozeman',
      state: 'MT',
      zip: '59715',
    },
    price: 450000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    propertyType: 'Single Family',
    features: ['Granite Countertops'],
    description: 'Beautiful home',
    photos: ['https://example.com/photo1.jpg'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-123' } as never,
      supabase: mockSupabase as never,
      error: null,
    })
    mockGetCampaignUsage.mockResolvedValue({
      used: 0,
      limit: 2,
      remaining: 2,
      resetsAt: null,
      isLimited: false,
      isExempt: false,
      tier: 'free',
    })
    mockGetUserTier.mockResolvedValue('free' as never)
    mockInsert.mockResolvedValue({ error: null })
  })

  test('returns 429 with v1 error message (no beta reference) when rate limited', async () => {
    const resetAt = new Date('2026-03-01T00:00:00.000Z')
    mockGetCampaignUsage.mockResolvedValueOnce({
      used: 2,
      limit: 2,
      remaining: 0,
      resetsAt: resetAt,
      isLimited: true,
      isExempt: false,
      tier: 'free',
    })

    const request = new NextRequest('http://localhost:3000/api/campaign/create', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.code).toBe('RATE_LIMITED')
    // v1: error message must NOT contain "Beta"
    expect(data.error).toBe('Campaign limit reached')
    expect(data.error).not.toContain('Beta')
    expect(data.usage.used).toBe(2)
    expect(data.usage.resetsAt).toBe(resetAt.toISOString())
  })
})
