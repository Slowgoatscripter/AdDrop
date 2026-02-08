import { ListingData } from '@/lib/types';

// Mock OpenAI module before importing generateCampaign
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

import { generateCampaign } from '../generate';

describe('generateCampaign', () => {
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
    features: ['Granite Countertops', 'Hardwood Floors'],
    description: 'Beautiful home with stunning mountain views.',
    photos: ['https://example.com/photo1.jpg'],
  };

  const mockAIResponse = {
    instagram: {
      professional: 'Professional Instagram post',
      casual: 'Casual Instagram post',
      luxury: 'Luxury Instagram post',
    },
    facebook: {
      professional: 'Professional Facebook post',
      casual: 'Casual Facebook post',
      luxury: 'Luxury Facebook post',
    },
    twitter: 'Short tweet with stats',
    googleAds: [
      { headline: 'Beautiful Home', description: 'Perfect family home in Bozeman with mountain views' },
      { headline: '3BD/2BA Home', description: 'Granite countertops and hardwood floors throughout' },
      { headline: 'Move-In Ready', description: 'Stunning property with modern upgrades' },
    ],
    metaAd: {
      primaryText: 'Your dream home awaits in Bozeman',
      headline: 'Beautiful 3BD/2BA Home',
      description: '$450K - Mountain Views',
    },
    magazineFullPage: {
      professional: { headline: 'Exceptional Living', body: 'Full page body', cta: 'Schedule Your Tour' },
      luxury: { headline: 'Luxury Redefined', body: 'Luxury full page body', cta: 'Experience Excellence' },
    },
    magazineHalfPage: {
      professional: { headline: 'Great Home', body: 'Half page body', cta: 'Call Today' },
      luxury: { headline: 'Elegant Living', body: 'Luxury half page body', cta: 'Inquire Now' },
    },
    postcard: {
      professional: {
        front: { headline: 'Just Listed', body: 'Beautiful home', cta: 'Call Now' },
        back: 'Contact info and details',
      },
      casual: {
        front: { headline: 'New Listing!', body: 'Check this out', cta: 'Get in Touch' },
        back: 'More details here',
      },
    },
    zillow: 'Zillow-optimized description',
    realtorCom: 'Realtor.com description',
    homesComTrulia: 'Homes.com/Trulia description',
    mlsDescription: 'MLS-compliant description without prohibited terms',
    hashtags: ['#realestate', '#Bozemanhomes', '#Montana', '#luxuryhomes'],
    callsToAction: ['Schedule a showing', 'Call for details', 'Virtual tour available'],
    targetingNotes: 'Target families age 30-50 within 25 miles',
    sellingPoints: ['Mountain views', 'Updated kitchen', 'Great location', 'Move-in ready', 'Spacious'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  test('returns a valid CampaignKit with all required fields', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });

    const result = await generateCampaign(mockListing);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('listing');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('instagram');
    expect(result).toHaveProperty('facebook');
    expect(result).toHaveProperty('twitter');
    expect(result).toHaveProperty('googleAds');
    expect(result).toHaveProperty('metaAd');
    expect(result).toHaveProperty('mlsDescription');
    expect(result).toHaveProperty('mlsComplianceChecklist');
  });

  test('calls OpenAI with correct model and parameters', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });

    await generateCampaign(mockListing);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.2',
        temperature: 0.7,
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      })
    );
  });

  test('includes listing data in returned campaign', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });

    const result = await generateCampaign(mockListing);

    expect(result.listing).toEqual(mockListing);
  });

  test('generates unique campaign ID', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });

    const result1 = await generateCampaign(mockListing);
    const result2 = await generateCampaign(mockListing);

    expect(result1.id).toBeTruthy();
    expect(result2.id).toBeTruthy();
    expect(result1.id).not.toBe(result2.id);
  });

  test('includes MLS compliance check results', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });

    const result = await generateCampaign(mockListing);

    expect(result.mlsComplianceChecklist).toBeInstanceOf(Array);
    expect(result.mlsComplianceChecklist.length).toBeGreaterThan(0);
    expect(result.mlsComplianceChecklist[0]).toHaveProperty('rule');
    expect(result.mlsComplianceChecklist[0]).toHaveProperty('passed');
  });

  test('throws error when OpenAI returns no content', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {},
        },
      ],
    });

    await expect(generateCampaign(mockListing)).rejects.toThrow('No response from AI model');
  });

  test('throws error when OpenAI returns invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'invalid json',
          },
        },
      ],
    });

    await expect(generateCampaign(mockListing)).rejects.toThrow();
  });

  test('sets createdAt timestamp', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });

    const beforeTime = new Date().toISOString();
    const result = await generateCampaign(mockListing);
    const afterTime = new Date().toISOString();

    expect(result.createdAt).toBeTruthy();
    expect(result.createdAt >= beforeTime).toBe(true);
    expect(result.createdAt <= afterTime).toBe(true);
  });
});
