/**
 * @jest-environment node
 */

// Mock the generate function BEFORE importing anything
jest.mock('@/lib/ai/generate', () => ({
  generateCampaign: jest.fn(),
}));

// Polyfill Web APIs for Next.js
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// Use native fetch if available (Node 18+) or mock minimally
if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici');
  Object.assign(global, { Request, Response, Headers, fetch: async () => new Response() });
}

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { generateCampaign } from '@/lib/ai/generate';
import { ListingData } from '@/lib/types';

describe('POST /api/generate', () => {
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
  };

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  test('returns 500 when OpenAI API key is not configured', async () => {
    delete process.env.OPENAI_API_KEY;

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('OpenAI API key not configured');
  });

  test('returns 400 when listing data is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Listing data is required');
  });

  test('returns 400 when listing address is missing', async () => {
    const invalidListing = { ...mockListing, address: undefined };

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: invalidListing }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Listing data is required');
  });

  test('successfully generates campaign and returns 200', async () => {
    (generateCampaign as jest.Mock).mockResolvedValue(mockCampaign);

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.campaign).toEqual(mockCampaign);
  });

  test('calls generateCampaign with listing data', async () => {
    (generateCampaign as jest.Mock).mockResolvedValue(mockCampaign);

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    });

    await POST(request);

    expect(generateCampaign).toHaveBeenCalledWith(mockListing);
  });

  test('returns 500 when generation fails', async () => {
    (generateCampaign as jest.Mock).mockRejectedValue(new Error('AI service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('AI service unavailable');
  });

  test('handles non-Error exceptions', async () => {
    (generateCampaign as jest.Mock).mockRejectedValue('Unknown error');

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({ listing: mockListing }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Generation failed');
  });
});
