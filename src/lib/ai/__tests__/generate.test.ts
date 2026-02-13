import { ListingData, PlatformId } from '@/lib/types';

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

// Mock compliance-settings to avoid next/cache dependency
jest.mock('@/lib/compliance/compliance-settings', () => ({
  getComplianceSettings: jest.fn().mockResolvedValue({
    enabled: true,
    config: {
      state: 'MT',
      mlsName: 'Montana Regional MLS',
      rules: ['No prohibited terms', 'Include disclosures'],
      requiredDisclosures: ['Equal Housing Opportunity'],
      maxDescriptionLength: 1000,
      docPaths: null,
      prohibitedTerms: [
        {
          term: 'exclusive neighborhood',
          category: 'steering',
          severity: 'hard',
          shortExplanation: 'Implies racial or economic exclusion of protected classes',
          law: 'Fair Housing Act §3604(c)',
          suggestedAlternative: 'desirable location',
        },
        {
          term: 'family-friendly',
          category: 'familial-status',
          severity: 'hard',
          shortExplanation: 'Implies preference for families with children',
          law: 'Fair Housing Act §3604(c)',
          suggestedAlternative: 'welcoming community',
        },
      ],
    },
  }),
}));

// Mock loadComplianceDocs to avoid file system access
jest.mock('@/lib/compliance/docs', () => ({
  loadComplianceDocs: jest.fn().mockResolvedValue(''),
}));

// Mock quality docs to avoid file system access
jest.mock('@/lib/quality/docs', () => ({
  buildQualityCheatSheet: jest.fn().mockReturnValue('## Quality Cheat Sheet\nMock quality rules.'),
  loadQualityDocs: jest.fn().mockResolvedValue(''),
}));

// Mock quality engine to avoid complex dependencies
jest.mock('@/lib/quality', () => ({
  checkAllPlatformQuality: jest.fn().mockReturnValue({ platforms: [], totalIssues: 0 }),
  scoreAllPlatformQuality: jest.fn().mockResolvedValue({ platforms: [], totalIssues: 0 }),
  mergeQualityResults: jest.fn().mockReturnValue({ platforms: [], totalIssues: 0 }),
  autoFixQuality: jest.fn().mockImplementation((campaign) => Promise.resolve({
    campaign,
    qualityResult: { platforms: [], totalIssues: 0 },
  })),
}));

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
      { headline: 'Beautiful Home', description: 'Great home in Bozeman with mountain views' },
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
    targetingNotes: 'Target buyers within 25 miles',
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
    expect(result).toHaveProperty('complianceResult');
  });

  test('complianceResult has correct structure', async () => {
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

    expect(result.complianceResult).toHaveProperty('platforms');
    expect(result.complianceResult).toHaveProperty('totalChecks');
    expect(result.complianceResult).toHaveProperty('totalPassed');
    expect(result.complianceResult).toHaveProperty('hardViolations');
    expect(result.complianceResult).toHaveProperty('softWarnings');
    expect(result.complianceResult).toHaveProperty('allPassed');
    expect(result.complianceResult.platforms).toBeInstanceOf(Array);
    expect(result.complianceResult.totalChecks).toBeGreaterThan(0);
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

  test('runs compliance check across all platforms', async () => {
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

    // Clean copy should pass all checks
    expect(result.complianceResult.allPassed).toBe(true);
    expect(result.complianceResult.hardViolations).toBe(0);
  });

  test('detects violations in AI-generated copy', async () => {
    const badResponse = {
      ...mockAIResponse,
      twitter: 'This exclusive neighborhood is family-friendly!',
    };
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(badResponse),
          },
        },
      ],
    });

    const result = await generateCampaign(mockListing);

    expect(result.complianceResult.allPassed).toBe(false);
    expect(result.complianceResult.hardViolations).toBeGreaterThan(0);
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

  // --- Selective platform generation tests ---

  test('undefined platforms populates all platform fields', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
    });

    const result = await generateCampaign(mockListing);

    expect(result.instagram).toBeDefined();
    expect(result.facebook).toBeDefined();
    expect(result.twitter).toBeDefined();
    expect(result.googleAds).toBeDefined();
    expect(result.metaAd).toBeDefined();
    expect(result.magazineFullPage).toBeDefined();
    expect(result.magazineHalfPage).toBeDefined();
    expect(result.postcard).toBeDefined();
    expect(result.zillow).toBeDefined();
    expect(result.realtorCom).toBeDefined();
    expect(result.homesComTrulia).toBeDefined();
    expect(result.mlsDescription).toBeDefined();
  });

  test('subset platforms only populates selected platform fields', async () => {
    const subset: PlatformId[] = ['instagram', 'twitter'];
    // AI returns only selected platforms + strategy
    const subsetResponse = {
      instagram: mockAIResponse.instagram,
      twitter: mockAIResponse.twitter,
      hashtags: mockAIResponse.hashtags,
      callsToAction: mockAIResponse.callsToAction,
      targetingNotes: mockAIResponse.targetingNotes,
      sellingPoints: mockAIResponse.sellingPoints,
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(subsetResponse) } }],
    });

    const result = await generateCampaign(mockListing, subset);

    // Selected should be populated
    expect(result.instagram).toBeDefined();
    expect(result.twitter).toBeDefined();
    // Non-selected should be undefined
    expect(result.facebook).toBeUndefined();
    expect(result.googleAds).toBeUndefined();
    expect(result.metaAd).toBeUndefined();
    expect(result.zillow).toBeUndefined();
    expect(result.mlsDescription).toBeUndefined();
    // Strategy always present
    expect(result.hashtags).toBeDefined();
    expect(result.callsToAction).toBeDefined();
    expect(result.targetingNotes).toBeDefined();
    expect(result.sellingPoints).toBeDefined();
  });

  test('selectedPlatforms field is set on returned campaign', async () => {
    const subset: PlatformId[] = ['instagram', 'facebook'];
    const subsetResponse = {
      instagram: mockAIResponse.instagram,
      facebook: mockAIResponse.facebook,
      hashtags: mockAIResponse.hashtags,
      callsToAction: mockAIResponse.callsToAction,
      targetingNotes: mockAIResponse.targetingNotes,
      sellingPoints: mockAIResponse.sellingPoints,
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(subsetResponse) } }],
    });

    const result = await generateCampaign(mockListing, subset);

    expect(result.selectedPlatforms).toEqual(['instagram', 'facebook']);
  });

  test('undefined platforms sets selectedPlatforms to ALL_PLATFORMS', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
    });

    const result = await generateCampaign(mockListing);

    expect(result.selectedPlatforms).toEqual(expect.arrayContaining([
      'instagram', 'facebook', 'twitter', 'googleAds', 'metaAd',
      'magazineFullPage', 'magazineHalfPage', 'postcard',
      'zillow', 'realtorCom', 'homesComTrulia', 'mlsDescription',
    ]));
    expect(result.selectedPlatforms).toHaveLength(12);
  });

  test('max_completion_tokens scales with platform count (10-12 = 16000 * 1.3)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
    });

    // All 12 platforms → 16000 * 1.3 = 20800
    await generateCampaign(mockListing);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_completion_tokens: Math.round(16000 * 1.3),
      })
    );
  });

  test('max_completion_tokens scales down for fewer platforms (1-2 = 4000 * 1.3)', async () => {
    const subset: PlatformId[] = ['twitter'];
    const subsetResponse = {
      twitter: mockAIResponse.twitter,
      hashtags: mockAIResponse.hashtags,
      callsToAction: mockAIResponse.callsToAction,
      targetingNotes: mockAIResponse.targetingNotes,
      sellingPoints: mockAIResponse.sellingPoints,
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(subsetResponse) } }],
    });

    await generateCampaign(mockListing, subset);

    // 1 platform → 4000 * 1.3 = 5200
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_completion_tokens: Math.round(4000 * 1.3),
      })
    );
  });

  test('max_completion_tokens for 3-5 platforms = 8000 * 1.3', async () => {
    const subset: PlatformId[] = ['instagram', 'facebook', 'twitter'];
    const subsetResponse = {
      instagram: mockAIResponse.instagram,
      facebook: mockAIResponse.facebook,
      twitter: mockAIResponse.twitter,
      hashtags: mockAIResponse.hashtags,
      callsToAction: mockAIResponse.callsToAction,
      targetingNotes: mockAIResponse.targetingNotes,
      sellingPoints: mockAIResponse.sellingPoints,
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(subsetResponse) } }],
    });

    await generateCampaign(mockListing, subset);

    // 3 platforms → 8000 * 1.3 = 10400
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_completion_tokens: Math.round(8000 * 1.3),
      })
    );
  });

  test('hallucinated extra platform fields are stripped from output', async () => {
    const subset: PlatformId[] = ['twitter'];
    // AI hallucinates extra platforms beyond what was requested
    const hallucinatedResponse = {
      twitter: mockAIResponse.twitter,
      instagram: mockAIResponse.instagram, // hallucinated — not requested
      facebook: mockAIResponse.facebook,   // hallucinated — not requested
      hashtags: mockAIResponse.hashtags,
      callsToAction: mockAIResponse.callsToAction,
      targetingNotes: mockAIResponse.targetingNotes,
      sellingPoints: mockAIResponse.sellingPoints,
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(hallucinatedResponse) } }],
    });

    const result = await generateCampaign(mockListing, subset);

    // Requested platform should be present
    expect(result.twitter).toBeDefined();
    // Hallucinated platforms should be stripped
    expect(result.instagram).toBeUndefined();
    expect(result.facebook).toBeUndefined();
  });
});
