// Mock next/server before any imports to avoid native Request global requirement
jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      private body: string;
      public method: string;
      public url: string;

      constructor(url: string, init: { method: string; body: string }) {
        this.url = url;
        this.method = init.method;
        this.body = init.body;
      }

      async json() {
        return JSON.parse(this.body);
      }
    },
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => data,
      }),
    },
  };
});

// Mock dependencies
jest.mock('@/lib/supabase/auth-helpers', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-1' },
    supabase: {},
    error: null,
  }),
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '"Regenerated copy for this platform"' } }],
        }),
      },
    },
  }));
});

import { POST } from '../route';

describe('POST /api/regenerate-platform', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  function makeRequest(body: Record<string, unknown>) {
    const { NextRequest } = jest.requireMock('next/server');
    return new NextRequest('http://localhost/api/regenerate-platform', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  test('returns regenerated copy for a single platform', async () => {
    const req = makeRequest({
      campaignId: 'test-campaign',
      platform: 'twitter',
      tone: 'professional',
      listingData: {
        address: { street: '123 Main', city: 'Bozeman', state: 'MT', zip: '59715' },
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        propertyType: 'Single Family',
        features: ['Garage'],
        description: 'Nice home',
        photos: [],
        url: 'https://example.com',
      },
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.copy).toBeDefined();
    expect(typeof data.copy).toBe('string');
  });

  test('returns 400 for missing platform', async () => {
    const req = makeRequest({
      campaignId: 'test',
      tone: 'casual',
      listingData: {},
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
  });

  test('returns 400 for missing listingData', async () => {
    const req = makeRequest({
      campaignId: 'test',
      platform: 'twitter',
      tone: 'casual',
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
  });

  test('returns 400 for unknown platform', async () => {
    const req = makeRequest({
      campaignId: 'test',
      platform: 'unknownPlatform',
      tone: 'casual',
      listingData: {
        address: { street: '123 Main', city: 'Bozeman', state: 'MT', zip: '59715' },
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        propertyType: 'Single Family',
        features: [],
        description: 'Nice home',
        photos: [],
        url: 'https://example.com',
      },
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
  });

  test('returns platform in response', async () => {
    const req = makeRequest({
      campaignId: 'test-campaign',
      platform: 'zillow',
      tone: 'professional',
      listingData: {
        address: { street: '456 Oak Ave', city: 'Bozeman', state: 'MT', zip: '59715' },
        price: 600000,
        beds: 4,
        baths: 3,
        sqft: 2400,
        propertyType: 'Single Family',
        features: ['Pool', 'Garage'],
        description: 'Beautiful home',
        photos: [],
        url: 'https://example.com',
      },
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.platform).toBe('zillow');
  });

  test('returns 401 when auth fails', async () => {
    const { requireAuth } = jest.requireMock('@/lib/supabase/auth-helpers');
    requireAuth.mockResolvedValueOnce({
      user: null,
      supabase: {},
      error: { status: 401, json: async () => ({ error: 'Authentication required' }) },
    });

    const req = makeRequest({
      platform: 'twitter',
      tone: 'professional',
      listingData: {
        address: { street: '123 Main', city: 'Bozeman', state: 'MT', zip: '59715' },
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        propertyType: 'Single Family',
        features: [],
        description: 'Nice home',
        photos: [],
        url: 'https://example.com',
      },
    });

    const response = await POST(req as never);
    expect(response.status).toBe(401);
  });
});
