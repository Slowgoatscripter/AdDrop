/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/auth-helpers', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/export/bundle', () => ({
  generateBundle: jest.fn(),
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
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { generateBundle } from '@/lib/export/bundle'
import type { CampaignKit } from '@/lib/types'

describe('POST /api/export/bundle', () => {
  const mockSelect = jest.fn()
  const mockEq = jest.fn(() => ({ eq: mockEq, single: mockSelect }))
  const mockFrom = jest.fn(() => ({ select: mockSelect }))
  const mockSupabase = { from: mockFrom } as unknown as { from: typeof mockFrom }

  const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
  const mockGenerateBundle = generateBundle as jest.MockedFunction<typeof generateBundle>

  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  const mockCampaign: CampaignKit = {
    listing: {
      street: '123 Main St',
      address: {
        street: '123 Main St',
        city: 'Bozeman',
        state: 'MT',
        zip: '59715',
      },
      photos: ['https://example.com/photo1.jpg'],
    },
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
  } as never

  beforeEach(() => {
    jest.clearAllMocks()
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: jest.fn().mockResolvedValue({ data: { generated_ads: mockCampaign }, error: null }),
    } as never)
    mockEq.mockReturnValue({
      eq: mockEq,
      single: jest.fn().mockResolvedValue({ data: { generated_ads: mockCampaign }, error: null }),
    } as never)
    mockFrom.mockReturnValue({ select: mockSelect } as never)
    mockCreateClient.mockResolvedValue(mockSupabase as never)
    mockGenerateBundle.mockResolvedValue(Buffer.from('mock-zip-data') as never)
  })

  describe('Authentication', () => {
    test('returns 401 when user auth fails and no shareToken provided', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: null,
        supabase: mockSupabase as never,
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    test('succeeds with valid user auth', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/zip')
    })

    test('allows access with valid shareToken', async () => {
      const shareToken = 'valid-share-token-123'
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            gt: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: { generated_ads: mockCampaign },
                error: null,
              }),
            }),
          }),
        }),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid, shareToken }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    test('rejects expired shareToken', async () => {
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            gt: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid, shareToken: 'expired-token' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid or expired share link')
    })
  })

  describe('Campaign ID Validation', () => {
    test('returns 400 for missing campaignId', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid campaign ID')
    })

    test('returns 400 for invalid UUID format', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: 'not-a-valid-uuid' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid campaign ID')
    })

    test('accepts valid UUID format', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Campaign Retrieval', () => {
    test('returns 404 when campaign not found for authenticated user', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: null,
            }),
          }),
        }),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Campaign not found')
    })

    test('verifies user ownership when retrieving campaign', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      await POST(request)
      expect(mockFrom).toHaveBeenCalledWith('campaigns')
      // Verify chain of calls for user ownership check
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('ZIP Generation', () => {
    test('calls generateBundle with campaign data', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      await POST(request)
      expect(mockGenerateBundle).toHaveBeenCalledWith(mockCampaign)
    })

    test('returns ZIP file with correct headers', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const mockZipBuffer = Buffer.from('mock-zip-content')
      mockGenerateBundle.mockResolvedValueOnce(mockZipBuffer as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/zip')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('.zip')
    })

    test('sanitizes filename from address', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const campaignWithSpecialChars = {
        ...mockCampaign,
        listing: {
          ...mockCampaign.listing,
          address: {
            street: "123 Main St #'456",
            city: 'Bozeman',
            state: 'MT',
            zip: '59715',
          },
        },
      } as never

      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { generated_ads: campaignWithSpecialChars },
              error: null,
            }),
          }),
        }),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('123 Main St 456.zip')
    })

    test('uses default filename when address is missing', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })

      const campaignNoAddress = {
        ...mockCampaign,
        listing: { photos: [] },
      } as never

      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: { generated_ads: campaignNoAddress },
              error: null,
            }),
          }),
        }),
      } as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('Campaign.zip')
    })
  })

  describe('Error Handling', () => {
    test('returns 500 when generateBundle throws error', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })
      mockGenerateBundle.mockRejectedValueOnce(new Error('ZIP generation failed') as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Bundle export failed')
    })

    test('returns 500 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Bundle export failed')
    })

    test('logs errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockRequireAuth.mockResolvedValueOnce({
        user: { id: 'user-123' } as never,
        supabase: mockSupabase as never,
        error: null,
      })
      mockGenerateBundle.mockRejectedValueOnce(new Error('Test error') as never)

      const request = new NextRequest('http://localhost:3000/api/export/bundle', {
        method: 'POST',
        body: JSON.stringify({ campaignId: validUuid }),
      })

      await POST(request)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Bundle export error:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })
  })
})
