import { buildGenerationPrompt, buildOutputTemplate } from '../prompt';
import { ListingData, PlatformId, ALL_PLATFORMS } from '@/lib/types';

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
        {
          term: 'walking distance to church',
          category: 'religion',
          severity: 'soft',
          shortExplanation: 'May imply religious preference',
          law: '42 U.S.C. § 3604',
          suggestedAlternative: 'near local amenities',
        },
      ],
    },
  }),
}));

// Mock quality docs to avoid file system access
jest.mock('@/lib/quality/docs', () => ({
  buildQualityCheatSheet: jest.fn().mockReturnValue('## Quality Cheat Sheet\nMock quality rules.'),
  loadQualityDocs: jest.fn().mockResolvedValue(''),
}));

describe('buildGenerationPrompt', () => {
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
    lotSize: '0.25 acres',
    yearBuilt: 2015,
    propertyType: 'Single Family',
    features: ['Granite Countertops', 'Hardwood Floors', 'Mountain Views'],
    description: 'Beautiful home with stunning mountain views.',
    photos: ['https://example.com/photo1.jpg'],
    listingAgent: 'Jane Doe',
    broker: 'Montana Realty',
  };

  test('includes property address in prompt', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('123 Main St, Bozeman, MT, 59715');
  });

  test('includes property price formatted with commas', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('$450,000');
  });

  test('includes property details (beds, baths, sqft)', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('3');
    expect(prompt).toContain('2');
    expect(prompt).toContain('1,800');
  });

  test('includes optional fields when present', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('0.25 acres');
    expect(prompt).toContain('2015');
    expect(prompt).toContain('Jane Doe');
    expect(prompt).toContain('Montana Realty');
  });

  test('includes features list', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('Granite Countertops');
    expect(prompt).toContain('Hardwood Floors');
    expect(prompt).toContain('Mountain Views');
  });

  test('includes listing description', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('Beautiful home with stunning mountain views.');
  });

  test('includes lightweight Fair Housing compliance summary', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('Fair Housing Compliance (Summary)');
    expect(prompt).toContain('Fair Housing Act');
    expect(prompt).toContain('NEVER target or exclude');
    expect(prompt).toContain('Describe PROPERTY FEATURES');
    expect(prompt).toContain('compliance review will run after generation');
  });

  test('does NOT include full cheat sheet or textbook sections', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    // The old cheat sheet had these patterns -- they should NOT be present
    expect(prompt).not.toContain('Fair Housing Compliance Cheat Sheet');
    expect(prompt).not.toContain('PROHIBITED (hard violations');
    expect(prompt).not.toContain('AVOID (soft warnings');
    expect(prompt).not.toContain('exclusive neighborhood');
    expect(prompt).not.toContain('(hard)');
    expect(prompt).not.toContain('(soft)');
    expect(prompt).not.toContain('Fair Housing Legal Reference (Textbook)');
  });

  test('includes MLS compliance rules', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('MLS');
    expect(prompt).toContain('Montana Regional MLS');
  });

  test('includes JSON output structure requirements', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('instagram');
    expect(prompt).toContain('facebook');
    expect(prompt).toContain('twitter');
    expect(prompt).toContain('googleAds');
    expect(prompt).toContain('metaAd');
    expect(prompt).toContain('mlsDescription');
  });

  test('handles missing optional fields gracefully', async () => {
    const minimalListing: ListingData = {
      url: 'https://example.com/listing/456',
      address: {
        street: '456 Oak Ave',
        city: 'Missoula',
        state: 'MT',
        zip: '59801',
      },
      price: 350000,
      beds: 2,
      baths: 1,
      sqft: 1200,
      propertyType: 'Condo',
      features: [],
      description: '',
      photos: [],
    };

    await expect(buildGenerationPrompt(minimalListing)).resolves.toBeDefined();
    const prompt = await buildGenerationPrompt(minimalListing);
    expect(prompt).toContain('456 Oak Ave, Missoula, MT, 59801');
    expect(prompt).toContain('$350,000');
  });

  test('includes character limits for different platforms', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    expect(prompt).toContain('280');
    expect(prompt).toContain('2200');
    expect(prompt).toContain('90 chars');
    expect(prompt).toContain('30 chars');
  });

  test('compliance section appears after quality section in prompt', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    const qualityIndex = prompt.indexOf('## Ad Quality Standards');
    const complianceIndex = prompt.indexOf('## Fair Housing Compliance (Summary)');
    const rulesIndex = prompt.indexOf('IMPORTANT RULES:');
    // Compliance should come AFTER quality, and important rules at the very end
    expect(complianceIndex).toBeGreaterThan(qualityIndex);
    expect(rulesIndex).toBeGreaterThan(complianceIndex);
  });

  test('instructs AI not to add extra platforms', async () => {
    const subset: PlatformId[] = ['instagram'];
    const prompt = await buildGenerationPrompt(mockListing, undefined, undefined, {
      platforms: subset,
    });
    expect(prompt).toContain('do NOT add any extra platforms');
  });

  // --- Platform selection tests ---

  test('undefined platforms includes all platform templates in prompt', async () => {
    const prompt = await buildGenerationPrompt(mockListing);
    // All 12 platforms should appear
    for (const platformId of ALL_PLATFORMS) {
      expect(prompt).toContain(`"${platformId}"`);
    }
  });

  test('subset platforms includes only selected platforms in template', async () => {
    const subset: PlatformId[] = ['instagram', 'twitter'];
    const prompt = await buildGenerationPrompt(mockListing, undefined, undefined, {
      platforms: subset,
    });
    // Selected should be present
    expect(prompt).toContain('"instagram"');
    expect(prompt).toContain('"twitter"');
    // Non-selected should NOT be present as JSON keys
    expect(prompt).not.toContain('"facebook"');
    expect(prompt).not.toContain('"googleAds"');
    expect(prompt).not.toContain('"metaAd"');
    expect(prompt).not.toContain('"zillow"');
    expect(prompt).not.toContain('"mlsDescription"');
  });

  test('strategy fields always included regardless of platform selection', async () => {
    const subset: PlatformId[] = ['twitter'];
    const prompt = await buildGenerationPrompt(mockListing, undefined, undefined, {
      platforms: subset,
    });
    expect(prompt).toContain('"hashtags"');
    expect(prompt).toContain('"callsToAction"');
    expect(prompt).toContain('"targetingNotes"');
    expect(prompt).toContain('"sellingPoints"');
  });
});

describe('buildOutputTemplate', () => {
  test('includes only selected platforms in JSON template', () => {
    const template = buildOutputTemplate(['instagram', 'twitter'], {});
    expect(template).toContain('"instagram"');
    expect(template).toContain('"twitter"');
    expect(template).not.toContain('"facebook"');
    expect(template).not.toContain('"googleAds"');
  });

  test('always includes strategy fields', () => {
    const template = buildOutputTemplate(['instagram'], {});
    expect(template).toContain('"hashtags"');
    expect(template).toContain('"callsToAction"');
    expect(template).toContain('"targetingNotes"');
    expect(template).toContain('"sellingPoints"');
  });

  test('MLS template uses factory function with maxDescriptionLength', () => {
    const template = buildOutputTemplate(['mlsDescription'], { maxDescriptionLength: 500 });
    expect(template).toContain('max 500 chars');
  });

  test('MLS template defaults to 1000 when maxDescriptionLength not provided', () => {
    const template = buildOutputTemplate(['mlsDescription'], {});
    expect(template).toContain('max 1000 chars');
  });

  test('interpolates city name into hashtags', () => {
    const template = buildOutputTemplate(['instagram'], { cityName: 'Bozeman' });
    expect(template).toContain('#Bozemanhomes');
  });

  test('defaults city name to Montana when not provided', () => {
    const template = buildOutputTemplate(['instagram'], {});
    expect(template).toContain('#Montanahomes');
  });

  test('all platforms produces complete template', () => {
    const template = buildOutputTemplate(ALL_PLATFORMS, {});
    for (const platformId of ALL_PLATFORMS) {
      expect(template).toContain(`"${platformId}"`);
    }
  });

  test('single platform still produces valid JSON structure', () => {
    const template = buildOutputTemplate(['twitter'], {});
    expect(template.trimStart().startsWith('{')).toBe(true);
    expect(template.trimEnd().endsWith('}')).toBe(true);
    expect(template).toContain('"twitter"');
  });
});
