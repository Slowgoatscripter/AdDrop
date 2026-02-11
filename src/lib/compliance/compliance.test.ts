import {
  getComplianceConfig,
  getDefaultCompliance,
  checkCompliance,
  findViolations,
  checkAllPlatforms,
  autoFixText,
  autoFixCampaign,
  loadComplianceDocs,
} from './index';
import { montanaCompliance } from './montana';
import {
  MLSComplianceConfig,
  ProhibitedTerm,
  ComplianceViolation,
  CampaignKit,
  CampaignComplianceResult,
} from '@/lib/types';

// --- Minimal test config with a few terms ---
const testTerms: ProhibitedTerm[] = [
  {
    term: 'exclusive neighborhood',
    category: 'steering',
    severity: 'hard',
    shortExplanation: 'Implies exclusion',
    law: 'Fair Housing Act §3604(c)',
    suggestedAlternative: 'desirable location',
  },
  {
    term: 'family-friendly',
    category: 'familial-status',
    severity: 'hard',
    shortExplanation: 'Implies familial preference',
    law: 'Fair Housing Act §3604(c)',
    suggestedAlternative: 'suitable for all',
  },
  {
    term: 'master bedroom',
    category: 'sex-gender',
    severity: 'soft',
    shortExplanation: 'Problematic term',
    law: 'NAR guidelines',
    suggestedAlternative: 'primary bedroom',
  },
  {
    term: 'walking distance',
    category: 'disability',
    severity: 'soft',
    shortExplanation: 'Assumes ambulatory ability',
    law: 'FHA §3604(f)',
    suggestedAlternative: 'nearby',
  },
  {
    term: 'guaranteed appreciation',
    category: 'misleading-claims',
    severity: 'hard',
    shortExplanation: 'Cannot guarantee values',
    law: 'FTC Act §5',
    suggestedAlternative: 'strong market area',
  },
];

const testConfig: MLSComplianceConfig = {
  state: 'Test',
  mlsName: 'Test MLS',
  rules: ['Rule 1'],
  requiredDisclosures: ['Disclosure 1'],
  prohibitedTerms: testTerms,
  maxDescriptionLength: 100,
};

// --- Helper: build a minimal campaign kit ---
function buildMockCampaign(overrides: Partial<CampaignKit> = {}): CampaignKit {
  return {
    id: 'test-id',
    listing: {} as any,
    createdAt: new Date().toISOString(),
    instagram: { professional: 'Clean text', casual: 'Clean text', luxury: 'Clean text' },
    facebook: { professional: 'Clean text', casual: 'Clean text', luxury: 'Clean text' },
    twitter: 'Clean tweet',
    googleAds: [{ headline: 'Clean', description: 'Clean ad' }],
    metaAd: { primaryText: 'Clean', headline: 'Clean', description: 'Clean' },
    magazineFullPage: {
      professional: { headline: 'Clean', body: 'Clean', cta: 'Clean' },
      luxury: { headline: 'Clean', body: 'Clean', cta: 'Clean' },
    },
    magazineHalfPage: {
      professional: { headline: 'Clean', body: 'Clean', cta: 'Clean' },
      luxury: { headline: 'Clean', body: 'Clean', cta: 'Clean' },
    },
    postcard: {
      professional: { front: { headline: 'Clean', body: 'Clean', cta: 'Clean' }, back: 'Clean' },
      casual: { front: { headline: 'Clean', body: 'Clean', cta: 'Clean' }, back: 'Clean' },
    },
    zillow: 'Clean listing',
    realtorCom: 'Clean listing',
    homesComTrulia: 'Clean listing',
    mlsDescription: 'Clean description',
    complianceResult: { platforms: [], totalChecks: 0, totalPassed: 0, hardViolations: 0, softWarnings: 0, allPassed: true },
    hashtags: ['#realestate'],
    callsToAction: ['Call now'],
    targetingNotes: 'Clean notes',
    sellingPoints: ['Great views'],
    ...overrides,
  };
}

// ============================
// Montana Config Tests
// ============================
describe('Montana Compliance Config', () => {
  test('exports Montana compliance configuration', () => {
    expect(montanaCompliance).toBeDefined();
    expect(montanaCompliance.state).toBe('Montana');
    expect(montanaCompliance.mlsName).toBe('Montana Regional MLS');
  });

  test('includes required MLS rules', () => {
    expect(montanaCompliance.rules).toContain('Must include listing broker name');
    expect(montanaCompliance.rules).toContain('Fair housing compliance required');
  });

  test('includes required disclosures', () => {
    expect(montanaCompliance.requiredDisclosures).toContain('Equal Housing Opportunity');
    expect(montanaCompliance.requiredDisclosures.length).toBeGreaterThan(0);
  });

  test('contains 80+ prohibited terms', () => {
    expect(montanaCompliance.prohibitedTerms.length).toBeGreaterThanOrEqual(80);
  });

  test('all prohibited terms have required fields', () => {
    for (const term of montanaCompliance.prohibitedTerms) {
      expect(term.term).toBeTruthy();
      expect(term.category).toBeTruthy();
      expect(['hard', 'soft']).toContain(term.severity);
      expect(term.shortExplanation).toBeTruthy();
      expect(term.law).toBeTruthy();
      expect(term.suggestedAlternative).toBeTruthy();
    }
  });

  test('covers all violation categories', () => {
    const categories = new Set(montanaCompliance.prohibitedTerms.map(t => t.category));
    expect(categories).toContain('steering');
    expect(categories).toContain('familial-status');
    expect(categories).toContain('disability');
    expect(categories).toContain('race-color-national-origin');
    expect(categories).toContain('religion');
    expect(categories).toContain('sex-gender');
    expect(categories).toContain('age');
    expect(categories).toContain('marital-status');
    expect(categories).toContain('political-beliefs');
    expect(categories).toContain('economic-exclusion');
    expect(categories).toContain('misleading-claims');
  });

  test('has both hard and soft severity terms', () => {
    const hardTerms = montanaCompliance.prohibitedTerms.filter(t => t.severity === 'hard');
    const softTerms = montanaCompliance.prohibitedTerms.filter(t => t.severity === 'soft');
    expect(hardTerms.length).toBeGreaterThan(0);
    expect(softTerms.length).toBeGreaterThan(0);
  });

  test('includes docPaths configuration', () => {
    expect(montanaCompliance.docPaths).toBeDefined();
    expect(montanaCompliance.docPaths!.federal.length).toBeGreaterThan(0);
    expect(montanaCompliance.docPaths!.state.length).toBeGreaterThan(0);
    expect(montanaCompliance.docPaths!.industry.length).toBeGreaterThan(0);
  });

  test('sets max description length', () => {
    expect(montanaCompliance.maxDescriptionLength).toBe(1000);
  });
});

// ============================
// getComplianceConfig Tests
// ============================
describe('getComplianceConfig', () => {
  test('returns Montana config for MT state code', () => {
    const config = getComplianceConfig('MT');
    expect(config).toBeDefined();
    expect(config?.state).toBe('Montana');
  });

  test('returns Montana config for lowercase mt', () => {
    const config = getComplianceConfig('mt');
    expect(config).toBeDefined();
    expect(config?.state).toBe('Montana');
  });

  test('returns null for unsupported state code', () => {
    expect(getComplianceConfig('CA')).toBeNull();
  });

  test('returns null for invalid state code', () => {
    expect(getComplianceConfig('INVALID')).toBeNull();
  });
});

// ============================
// getDefaultCompliance Tests
// ============================
describe('getDefaultCompliance', () => {
  test('returns Montana compliance as default', () => {
    const config = getDefaultCompliance();
    expect(config.state).toBe('Montana');
    expect(config).toEqual(montanaCompliance);
  });
});

// ============================
// findViolations Tests
// ============================
describe('findViolations', () => {
  test('returns empty array for clean text', () => {
    const violations = findViolations('Beautiful home with modern kitchen', 'test', testConfig);
    expect(violations).toEqual([]);
  });

  test('returns empty array for empty text', () => {
    expect(findViolations('', 'test', testConfig)).toEqual([]);
    expect(findViolations('   ', 'test', testConfig)).toEqual([]);
  });

  test('detects a prohibited term', () => {
    const violations = findViolations(
      'Located in an exclusive neighborhood with great amenities',
      'instagram.casual',
      testConfig
    );
    expect(violations.length).toBe(1);
    expect(violations[0].term.toLowerCase()).toBe('exclusive neighborhood');
    expect(violations[0].category).toBe('steering');
    expect(violations[0].severity).toBe('hard');
    expect(violations[0].platform).toBe('instagram.casual');
  });

  test('case-insensitive matching', () => {
    const violations = findViolations(
      'An EXCLUSIVE NEIGHBORHOOD for your lifestyle',
      'test',
      testConfig
    );
    expect(violations.length).toBe(1);
    expect(violations[0].term).toBe('EXCLUSIVE NEIGHBORHOOD');
  });

  test('word boundary matching prevents false positives', () => {
    // "therapist" should NOT trigger anything (no "the rapist" false positive)
    const violations = findViolations('Near a therapist office', 'test', testConfig);
    expect(violations).toEqual([]);
  });

  test('word boundary: does not match partial words', () => {
    // "masterful" should not match "master bedroom"
    const violations = findViolations('A masterful design throughout', 'test', testConfig);
    expect(violations).toEqual([]);
  });

  test('handles hyphenated variants', () => {
    // "family-friendly" should match both forms
    const v1 = findViolations('A family-friendly area', 'test', testConfig);
    expect(v1.length).toBe(1);
    expect(v1[0].category).toBe('familial-status');

    const v2 = findViolations('A family friendly area', 'test', testConfig);
    expect(v2.length).toBe(1);
    expect(v2[0].category).toBe('familial-status');
  });

  test('extracts context snippet', () => {
    const text = 'This beautiful property is in an exclusive neighborhood with stunning views and amenities';
    const violations = findViolations(text, 'test', testConfig);
    expect(violations.length).toBe(1);
    expect(violations[0].context).toContain('exclusive neighborhood');
    // Context should have surrounding text
    expect(violations[0].context.length).toBeGreaterThan('exclusive neighborhood'.length);
  });

  test('detects multiple violations in same text', () => {
    const violations = findViolations(
      'This exclusive neighborhood is family-friendly with guaranteed appreciation',
      'test',
      testConfig
    );
    expect(violations.length).toBe(3);
    const categories = violations.map(v => v.category);
    expect(categories).toContain('steering');
    expect(categories).toContain('familial-status');
    expect(categories).toContain('misleading-claims');
  });

  test('includes correct alternative in violation', () => {
    const violations = findViolations('Has a master bedroom', 'test', testConfig);
    expect(violations.length).toBe(1);
    expect(violations[0].alternative).toBe('primary bedroom');
  });

  test('includes law citation in violation', () => {
    const violations = findViolations('Walking distance to shops', 'test', testConfig);
    expect(violations.length).toBe(1);
    expect(violations[0].law).toBe('FHA §3604(f)');
  });

  test('correctly assigns severity', () => {
    const hard = findViolations('exclusive neighborhood', 'test', testConfig);
    expect(hard[0].severity).toBe('hard');

    const soft = findViolations('master bedroom', 'test', testConfig);
    expect(soft[0].severity).toBe('soft');
  });
});

// ============================
// checkAllPlatforms Tests
// ============================
describe('checkAllPlatforms', () => {
  test('returns all passed for clean campaign', () => {
    const campaign = buildMockCampaign();
    const result = checkAllPlatforms(campaign, testConfig);

    expect(result.allPassed).toBe(true);
    expect(result.hardViolations).toBe(0);
    expect(result.softWarnings).toBe(0);
    expect(result.totalChecks).toBeGreaterThan(0);
    expect(result.totalPassed).toBe(result.totalChecks);
  });

  test('detects violations in instagram text', () => {
    const campaign = buildMockCampaign({
      instagram: {
        professional: 'Clean text',
        casual: 'This exclusive neighborhood is amazing',
        luxury: 'Clean text',
      },
    });
    const result = checkAllPlatforms(campaign, testConfig);

    expect(result.allPassed).toBe(false);
    expect(result.hardViolations).toBe(1);
    const violatedPlatform = result.platforms.find(p => p.platform === 'instagram.casual');
    expect(violatedPlatform).toBeDefined();
    expect(violatedPlatform!.violations.length).toBe(1);
  });

  test('detects violations across multiple platforms', () => {
    const campaign = buildMockCampaign({
      instagram: {
        professional: 'Clean text',
        casual: 'exclusive neighborhood here',
        luxury: 'Clean text',
      },
      twitter: 'Family-friendly home available!',
      mlsDescription: 'Master bedroom with views',
    });
    const result = checkAllPlatforms(campaign, testConfig);

    expect(result.hardViolations).toBe(2); // exclusive neighborhood + family-friendly
    expect(result.softWarnings).toBe(1); // master bedroom
  });

  test('checks google ads fields', () => {
    const campaign = buildMockCampaign({
      googleAds: [
        { headline: 'Exclusive Neighborhood', description: 'Great home' },
      ],
    });
    const result = checkAllPlatforms(campaign, testConfig);

    const headlineResult = result.platforms.find(p => p.platform === 'googleAds[0].headline');
    expect(headlineResult).toBeDefined();
    expect(headlineResult!.violations.length).toBe(1);
  });

  test('checks meta ad fields', () => {
    const campaign = buildMockCampaign({
      metaAd: { primaryText: 'Family-friendly home', headline: 'Clean', description: 'Clean' },
    });
    const result = checkAllPlatforms(campaign, testConfig);
    expect(result.hardViolations).toBe(1);
  });

  test('checks magazine ad fields', () => {
    const campaign = buildMockCampaign({
      magazineFullPage: {
        professional: { headline: 'Exclusive Neighborhood', body: 'Clean', cta: 'Clean' },
        luxury: { headline: 'Clean', body: 'Clean', cta: 'Clean' },
      },
    });
    const result = checkAllPlatforms(campaign, testConfig);
    expect(result.hardViolations).toBe(1);
  });

  test('checks postcard fields', () => {
    const campaign = buildMockCampaign({
      postcard: {
        professional: {
          front: { headline: 'Exclusive Neighborhood', body: 'Clean', cta: 'Clean' },
          back: 'Clean',
        },
        casual: {
          front: { headline: 'Clean', body: 'Clean', cta: 'Clean' },
          back: 'Clean',
        },
      },
    });
    const result = checkAllPlatforms(campaign, testConfig);
    expect(result.hardViolations).toBe(1);
  });

  test('checks zillow, realtorCom, homesComTrulia', () => {
    const campaign = buildMockCampaign({
      zillow: 'Walking distance to shops',
      realtorCom: 'Master bedroom upstairs',
      homesComTrulia: 'Clean text',
    });
    const result = checkAllPlatforms(campaign, testConfig);
    expect(result.softWarnings).toBe(2);
  });

  test('checks hashtags, callsToAction, targetingNotes, sellingPoints', () => {
    const campaign = buildMockCampaign({
      hashtags: ['#exclusiveneighborhood'],
      callsToAction: ['Visit this family-friendly home'],
      targetingNotes: 'Walking distance targeting',
      sellingPoints: ['Master bedroom suite'],
    });
    const result = checkAllPlatforms(campaign, testConfig);
    // hashtags: "exclusiveneighborhood" without space won't match word boundary for "exclusive neighborhood"
    // callsToAction: "family-friendly" = hard
    // targetingNotes: "walking distance" = soft
    // sellingPoints: "master bedroom" = soft
    expect(result.hardViolations).toBe(1);
    expect(result.softWarnings).toBe(2);
  });

  test('totalChecks matches number of platform texts extracted', () => {
    const campaign = buildMockCampaign();
    const result = checkAllPlatforms(campaign, testConfig);

    // Count expected: 3 ig + 3 fb + 1 twitter + 1 ga headline + 1 ga desc + 3 meta
    // + 6 mag full + 6 mag half + 6 postcard front + 2 postcard back
    // + zillow + realtorCom + homesComTrulia + mls + hashtags + cta + targeting + selling
    expect(result.totalChecks).toBeGreaterThan(20);
    expect(result.platforms.length).toBe(result.totalChecks);
  });

  test('counts hard and soft violations correctly', () => {
    const campaign = buildMockCampaign({
      twitter: 'This exclusive neighborhood has a master bedroom',
    });
    const result = checkAllPlatforms(campaign, testConfig);
    const twitterResult = result.platforms.find(p => p.platform === 'twitter');
    expect(twitterResult!.hardCount).toBe(1); // exclusive neighborhood
    expect(twitterResult!.softCount).toBe(1); // master bedroom
  });
});

// ============================
// autoFixText Tests
// ============================
describe('autoFixText', () => {
  test('replaces violation with alternative', () => {
    const violation: ComplianceViolation = {
      platform: 'test',
      term: 'exclusive neighborhood',
      category: 'steering',
      severity: 'hard',
      explanation: 'test',
      law: 'test',
      alternative: 'desirable location',
      context: '',
    };
    const result = autoFixText('This is an exclusive neighborhood with views', [violation]);
    expect(result).toBe('This is an desirable location with views');
    expect(result).not.toContain('exclusive neighborhood');
  });

  test('preserves uppercase when original is all caps', () => {
    const violation: ComplianceViolation = {
      platform: 'test',
      term: 'EXCLUSIVE NEIGHBORHOOD',
      category: 'steering',
      severity: 'hard',
      explanation: 'test',
      law: 'test',
      alternative: 'desirable location',
      context: '',
    };
    const result = autoFixText('IN AN EXCLUSIVE NEIGHBORHOOD TODAY', [violation]);
    expect(result).toContain('DESIRABLE LOCATION');
  });

  test('preserves title case when original starts with uppercase', () => {
    const violation: ComplianceViolation = {
      platform: 'test',
      term: 'Exclusive neighborhood',
      category: 'steering',
      severity: 'hard',
      explanation: 'test',
      law: 'test',
      alternative: 'desirable location',
      context: '',
    };
    const result = autoFixText('Exclusive neighborhood with amenities', [violation]);
    expect(result).toBe('Desirable location with amenities');
  });

  test('handles multiple violations in same text', () => {
    const violations: ComplianceViolation[] = [
      {
        platform: 'test',
        term: 'exclusive neighborhood',
        category: 'steering',
        severity: 'hard',
        explanation: '',
        law: '',
        alternative: 'desirable location',
        context: '',
      },
      {
        platform: 'test',
        term: 'master bedroom',
        category: 'sex-gender',
        severity: 'soft',
        explanation: '',
        law: '',
        alternative: 'primary bedroom',
        context: '',
      },
    ];
    const result = autoFixText('An exclusive neighborhood with a master bedroom', violations);
    expect(result).toContain('desirable location');
    expect(result).toContain('primary bedroom');
    expect(result).not.toContain('exclusive neighborhood');
    expect(result).not.toContain('master bedroom');
  });

  test('returns original text when no violations', () => {
    const result = autoFixText('Clean text here', []);
    expect(result).toBe('Clean text here');
  });
});

// ============================
// autoFixCampaign Tests
// ============================
describe('autoFixCampaign', () => {
  test('fixes violations across campaign', () => {
    const campaign = buildMockCampaign({
      twitter: 'An exclusive neighborhood awaits',
      mlsDescription: 'Features a master bedroom',
    });
    const complianceResult = checkAllPlatforms(campaign, testConfig);
    const fixed = autoFixCampaign(campaign, complianceResult);

    expect(fixed.twitter).toContain('desirable location');
    expect(fixed.twitter).not.toContain('exclusive neighborhood');
    expect(fixed.mlsDescription).toContain('primary bedroom');
    expect(fixed.mlsDescription).not.toContain('master bedroom');
  });

  test('does not mutate original campaign', () => {
    const campaign = buildMockCampaign({
      twitter: 'An exclusive neighborhood awaits',
    });
    const complianceResult = checkAllPlatforms(campaign, testConfig);
    autoFixCampaign(campaign, complianceResult);

    // Original should be unchanged
    expect(campaign.twitter).toContain('exclusive neighborhood');
  });

  test('leaves clean platforms untouched', () => {
    const campaign = buildMockCampaign({
      twitter: 'An exclusive neighborhood awaits',
    });
    const complianceResult = checkAllPlatforms(campaign, testConfig);
    const fixed = autoFixCampaign(campaign, complianceResult);

    expect(fixed.instagram?.professional).toBe('Clean text');
    expect(fixed.zillow).toBe('Clean listing');
  });
});

// ============================
// loadComplianceDocs Tests
// ============================
describe('loadComplianceDocs', () => {
  test('returns empty string when no docPaths configured', async () => {
    const config: MLSComplianceConfig = {
      ...testConfig,
      docPaths: undefined,
    };
    const result = await loadComplianceDocs(config);
    expect(result).toBe('');
  });

  test('handles missing doc files gracefully', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const config: MLSComplianceConfig = {
      ...testConfig,
      docPaths: {
        federal: ['nonexistent/file.md'],
        state: [],
        industry: [],
      },
    };
    const result = await loadComplianceDocs(config);
    expect(result).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('nonexistent/file.md'));
    warnSpy.mockRestore();
  });
});

// ============================
// checkCompliance (backward compat) Tests
// ============================
describe('checkCompliance (backward compatibility)', () => {
  test('detects prohibited terms in text', () => {
    const results = checkCompliance(
      'Located in an exclusive neighborhood with guaranteed appreciation',
      testConfig
    );
    const exclusiveResult = results.find(r => r.rule.includes('exclusive neighborhood'));
    expect(exclusiveResult?.passed).toBe(false);
    expect(exclusiveResult?.detail).toContain('Found "exclusive neighborhood"');

    const appreciationResult = results.find(r => r.rule.includes('guaranteed appreciation'));
    expect(appreciationResult?.passed).toBe(false);
  });

  test('passes when text is clean', () => {
    const results = checkCompliance('Beautiful home with spacious kitchen', testConfig);
    const termResults = results.filter(r => r.rule.includes('No prohibited term'));
    expect(termResults.every(r => r.passed)).toBe(true);
  });

  test('is case-insensitive', () => {
    const results = checkCompliance('EXCLUSIVE NEIGHBORHOOD here', testConfig);
    const result = results.find(r => r.rule.includes('exclusive neighborhood'));
    expect(result?.passed).toBe(false);
  });

  test('checks max description length', () => {
    const longText = 'a'.repeat(150);
    const results = checkCompliance(longText, testConfig);
    const lengthResult = results.find(r => r.rule.includes('Max'));
    expect(lengthResult?.passed).toBe(false);
    expect(lengthResult?.detail).toContain('150 characters');
    expect(lengthResult?.detail).toContain('50 over limit');
  });

  test('passes when within length limit', () => {
    const results = checkCompliance('Short text', testConfig);
    const lengthResult = results.find(r => r.rule.includes('Max'));
    expect(lengthResult?.passed).toBe(true);
  });

  test('returns all check results', () => {
    const results = checkCompliance('Test text', testConfig);
    const expectedCount = testConfig.prohibitedTerms.length + 1; // terms + length check
    expect(results.length).toBe(expectedCount);
  });
});
