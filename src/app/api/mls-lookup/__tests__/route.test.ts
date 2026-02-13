import { resolveMlsNumber } from '@/lib/scraper/mls-resolver';
import { scrapeListing } from '@/lib/scraper';
import { POST } from '../route';

jest.mock('@/lib/scraper/mls-resolver');
jest.mock('@/lib/scraper', () => ({
  scrapeListing: jest.fn(),
}));

// Mock next/server since NextRequest/NextResponse need Web APIs not in jsdom
jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      private body: string;
      constructor(url: string, init?: any) {
        this.body = init?.body || '';
      }
      async json() {
        return JSON.parse(this.body);
      }
    },
    NextResponse: {
      json(data: any, init?: { status?: number }) {
        return {
          status: init?.status || 200,
          async json() {
            return data;
          },
        };
      },
    },
  };
});

const mockResolve = resolveMlsNumber as jest.MockedFunction<typeof resolveMlsNumber>;
const mockScrape = scrapeListing as jest.MockedFunction<typeof scrapeListing>;

describe('MLS Lookup API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns scraped listing data when MLS number resolves', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      source: 'realtor.com',
    });
    mockScrape.mockResolvedValue({
      success: true,
      data: {
        url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
        address: { street: '123 Main St', city: 'Missoula', state: 'MT', zip: '59801' },
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        propertyType: 'Residential',
        features: [],
        description: 'Beautiful home',
        photos: [],
      },
    });

    const request = { json: async () => ({ mlsNumber: '30025432' }) };

    const response = await POST(request as any);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.address.city).toBe('Missoula');
    expect(json.data.mlsNumber).toBe('30025432');
    expect(json.source).toBe('realtor.com');
  });

  test('returns error when MLS number not found', async () => {
    mockResolve.mockResolvedValue({
      success: false,
      error: 'Listing not found on any source. You can enter details manually.',
    });

    const request = { json: async () => ({ mlsNumber: 'INVALID' }) };

    const response = await POST(request as any);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error).toContain('not found');
  });

  test('returns 400 when mlsNumber is missing', async () => {
    const request = { json: async () => ({}) };

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('required');
  });

  test('returns 422 when scraping fails', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      source: 'realtor.com',
    });
    mockScrape.mockResolvedValue({
      success: false,
      error: 'Failed to parse listing page',
      missingFields: ['price', 'beds'],
    });

    const request = { json: async () => ({ mlsNumber: '30025432' }) };

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.error).toContain('Failed to parse');
  });
});
