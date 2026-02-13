/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/auth-helpers', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/usage/campaign-limits', () => ({
  getCampaignUsage: jest.fn(),
}))

jest.mock('@/lib/ai/generate', () => ({
  generateCampaign: jest.fn(),
}))

// Polyfill Web APIs for Next.js
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextEncoder, TextDecoder })

// Use native fetch if available (Node 18+) or mock minimally
if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici')
  Object.assign(global, { Request, Response, Headers, fetch: async () => new Response() })
}

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { generateCampaign } from '@/lib/ai/generate'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import type { ListingData } from '@/lib/types'

describe('POST /api/generate', () => {
  const mockInsert = jest.fn()
  const mockFrom = jest.fn(() => ({ insert: mockInsert }))
  const mockSupabase = { from: mockFrom } as unknown as { from: typeof mockFrom }

  const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
  const mockGetCampaignUsage = getCampaignUsage as jest.MockedFunction<typeof getCampaignUsage>
  const mockGenerateCampaign = generateCampaign as jest.MockedFunction<typeof generateCampaign>

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

  const mockCampaign = {
    id: 'test-campaign-id',
    listing: mockListing,
    createdAt: '2024-01-01T00:00:00.000Z',
    instagram: {
      professional: 'Pro post',
      casual: 'Casual post',
      luxury: 'Luxury post',
    },
    facebook: {
      professional: 'Pro FB',
      casual: 'Casual FB',
      luxury: 'Luxury FB',
    },
    twitter: 'Tweet',
    googleAds: [],
    metaAd: { primaryText: 'text', headline: 'headline', description: 'desc' },
    magazineFullPage: {
      professional: { headline: 'h', body: 'b', cta: 'c' },
      luxury: { headline: 'h', body: 'b', cta: 'c' },
    },
    magazineHalfPage: {
      professional: { headline: 'h', body: 'b', cta: 'c' },
      luxury: { headline: 'h', body: 'b', cta: 'c' },
    },
    postcard: {
      professional: { front: { headline: 'h', body: 'b', cta: 'c' }, back: 'back' },
      casual: { front: { headline: 'h', body: 'b', cta: 'c' }, back: 'back' },
    },
    zillow: 'zillow desc',
    realtorCom: 'realtor desc',
    homesComTrulia: 'homes desc',
    mlsDescription: 'mls desc',
    mlsComplianceChecklist: [],
    hashtags: ['#test'],
    callsToAction: ['CTA'],
    targetingNotes: 'notes',
    sellingPoints: ['point1'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-api-key'
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
    })
    mockInsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  test('returns auth error when requireAuth fails', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      user: null,
      supabase: mockSupabase as never,
      error: new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 }) as never,
    })

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  test('returns 500 when OpenAI API key is not configured', async () => {
    delete process.env.OPENAI_API_KEY

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('OpenAI API key not configured')
  })

  test('returns 400 when listing data is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid listing data')
  })

  test('returns 429 when user is rate limited', async () => {
    const resetAt = new Date('2026-02-20T00:00:00.000Z')
    mockGetCampaignUsage.mockResolvedValueOnce({
      used: 2,
      limit: 2,
      remaining: 0,
      resetsAt: resetAt,
      isLimited: true,
      isExempt: false,
    })

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.code).toBe('RATE_LIMITED')
    expect(data.usage.used).toBe(2)
    expect(data.usage.resetsAt).toBe(resetAt.toISOString())
    expect(mockGenerateCampaign).not.toHaveBeenCalled()
  })

  test('successfully generates campaign and returns 200', async () => {
    mockGenerateCampaign.mockResolvedValue(mockCampaign as never)

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.campaign).toEqual(mockCampaign)
    expect(mockGenerateCampaign).toHaveBeenCalledWith(mockListing, undefined)
    expect(mockFrom).toHaveBeenCalledWith('campaigns')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockCampaign.id,
        user_id: 'user-123',
        name: '123 Main St, Bozeman, MT',
        platform: 'all',
        status: 'generated',
      })
    )
  })

  test('passes selected platforms and persists platform list', async () => {
    mockGenerateCampaign.mockResolvedValue(mockCampaign as never)

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing, platforms: ['facebook', 'instagram'] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockGenerateCampaign).toHaveBeenCalledWith(mockListing, ['facebook', 'instagram'])
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'facebook,instagram',
      })
    )
  })

  test('still returns success when campaign persistence fails', async () => {
    mockGenerateCampaign.mockResolvedValue(mockCampaign as never)
    mockInsert.mockResolvedValueOnce({ error: { message: 'db write failed' } })

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.campaign).toEqual(mockCampaign)
  })

  test('returns 500 when generation fails', async () => {
    mockGenerateCampaign.mockRejectedValue(new Error('AI service unavailable'))

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Generation failed')
  })

  test('handles non-Error exceptions', async () => {
    mockGenerateCampaign.mockRejectedValue('Unknown error')

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Generation failed')
  })
})
