import {
  findQualityIssues,
  checkPlatformFormat,
  checkFormattingAbuse,
  checkAllPlatformQuality,
  extractPlatformTexts,
} from './engine';
import { qualityRules, platformFormats } from './rules';
import { buildQualityCheatSheet } from './docs';
import { QualityRule } from '@/lib/types/quality';
import { CampaignKit } from '@/lib/types/campaign';

// Mock loadQualityDocs to avoid file system access in tests
jest.mock('./docs', () => {
  const actual = jest.requireActual('./docs');
  return {
    ...actual,
    loadQualityDocs: jest.fn().mockResolvedValue(''),
  };
});

// --- Helper: build a minimal campaign kit ---
function buildMockCampaign(overrides: Partial<CampaignKit> = {}): CampaignKit {
  return {
    id: 'test-id',
    listing: {} as any,
    createdAt: new Date().toISOString(),
    instagram: {
      professional: 'Schedule your private showing of this 3-bed home with mountain views.',
      casual: 'Schedule your private showing of this 3-bed home with mountain views.',
      luxury: 'Schedule your private showing of this 3-bed home with mountain views.',
    },
    facebook: {
      professional: 'Schedule your private showing of this 3-bed home with mountain views.',
      casual: 'Schedule your private showing of this 3-bed home with mountain views.',
      luxury: 'Schedule your private showing of this 3-bed home with mountain views.',
    },
    twitter: 'Schedule a showing: 3BR/2BA, $450K, mountain views [LINK]',
    googleAds: [{ headline: 'Bozeman 3BR Home', description: 'Mountain views, modern kitchen. Schedule your showing today.' }],
    metaAd: { primaryText: 'Schedule your showing for this home.', headline: 'Bozeman Mountain Home', description: 'Modern 3BR' },
    magazineFullPage: {
      professional: { headline: 'Mountain Living', body: 'Clean body text with details.', cta: 'Call today' },
      luxury: { headline: 'Mountain Living', body: 'Clean body text with details.', cta: 'Call today' },
    },
    magazineHalfPage: {
      professional: { headline: 'Mountain Living', body: 'Clean body.', cta: 'Call today' },
      luxury: { headline: 'Mountain Living', body: 'Clean body.', cta: 'Call today' },
    },
    postcard: {
      professional: { front: { headline: 'Mountain Views', body: 'Modern 3BR home.', cta: 'Call today' }, back: 'Details here' },
      casual: { front: { headline: 'Mountain Views', body: 'Modern 3BR home.', cta: 'Call today' }, back: 'Details here' },
    },
    zillow: 'Professional listing description for Zillow',
    realtorCom: 'Professional listing description for Realtor.com',
    homesComTrulia: 'Professional listing description',
    mlsDescription: 'Professional MLS description within limits',
    complianceResult: { platforms: [], campaignVerdict: 'compliant', violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
    hashtags: ['#realestate', '#bozeman', '#montanahomes'],
    callsToAction: ['Schedule your showing'],
    targetingNotes: 'Target first-time buyers in Bozeman area',
    sellingPoints: ['Mountain views', 'Modern kitchen', 'Large lot'],
    ...overrides,
  };
}

// ============================
// Quality Rules Config Tests
// ============================
describe('Quality Rules', () => {
  test('exports 80+ quality rules', () => {
    expect(qualityRules.length).toBeGreaterThanOrEqual(80);
  });

  test('all rules have required fields', () => {
    for (const rule of qualityRules) {
      expect(rule.pattern).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(['required', 'recommended']).toContain(rule.priority);
      expect(rule.shortExplanation).toBeTruthy();
      expect(rule.suggestedFix).toBeTruthy();
    }
  });

  test('rules cover expected subcategories', () => {
    const subcategories = new Set(qualityRules.map(r => r.subcategory).filter(Boolean));
    expect(subcategories).toContain('vague-praise');
    expect(subcategories).toContain('euphemism');
    expect(subcategories).toContain('pressure-tactic');
    expect(subcategories).toContain('assumption');
    expect(subcategories).toContain('meaningless-superlative');
    expect(subcategories).toContain('ai-slop');
    expect(subcategories).toContain('avoid-word');
  });

  test('has both required and recommended priority rules', () => {
    const required = qualityRules.filter(r => r.priority === 'required');
    const recommended = qualityRules.filter(r => r.priority === 'recommended');
    expect(required.length).toBeGreaterThan(0);
    expect(recommended.length).toBeGreaterThan(0);
  });
});

// ============================
// Platform Formats Tests
// ============================
describe('Platform Formats', () => {
  test('defines formats for major platforms', () => {
    expect(platformFormats['instagram.professional']).toBeDefined();
    expect(platformFormats['facebook.professional']).toBeDefined();
    expect(platformFormats['twitter']).toBeDefined();
    expect(platformFormats['googleAds.headline']).toBeDefined();
    expect(platformFormats['googleAds.description']).toBeDefined();
    expect(platformFormats['metaAd.primaryText']).toBeDefined();
  });

  test('Instagram has correct constraints', () => {
    const ig = platformFormats['instagram.professional'];
    expect(ig.maxChars).toBe(2200);
    expect(ig.truncationPoint).toBe(125);
    expect(ig.maxHashtags).toBe(30);
    expect(ig.minHashtags).toBe(3);
    expect(ig.requiresCTA).toBe(true);
  });

  test('Google Ads headline has 30 char limit', () => {
    expect(platformFormats['googleAds.headline'].maxChars).toBe(30);
  });

  test('Twitter has 280 char limit', () => {
    expect(platformFormats['twitter'].maxChars).toBe(280);
  });
});

// ============================
// findQualityIssues Tests
// ============================
describe('findQualityIssues', () => {
  test('returns empty array for clean text', () => {
    const issues = findQualityIssues(
      'This 3-bedroom home features a renovated kitchen with quartz countertops.',
      'instagram.professional'
    );
    expect(issues).toEqual([]);
  });

  test('returns empty array for empty text', () => {
    expect(findQualityIssues('', 'test')).toEqual([]);
    expect(findQualityIssues('   ', 'test')).toEqual([]);
  });

  test('detects vague praise', () => {
    const issues = findQualityIssues(
      'This home has great potential for the right buyer.',
      'instagram.professional'
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].category).toBe('anti-pattern');
    expect(issues[0].source).toBe('regex');
  });

  test('detects euphemisms', () => {
    const issues = findQualityIssues(
      'A cozy cottage with rustic charm.',
      'instagram.professional'
    );
    const euphemisms = issues.filter(i => i.issue.toLowerCase().includes('cozy') || i.issue.toLowerCase().includes('small'));
    expect(euphemisms.length).toBeGreaterThanOrEqual(1);
  });

  test('detects pressure tactics', () => {
    const issues = findQualityIssues(
      'Act fast before this one is gone! Don\'t miss out!',
      'facebook.casual'
    );
    const pressureIssues = issues.filter(i => i.suggestedFix.length > 0);
    expect(pressureIssues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects AI slop words', () => {
    const issues = findQualityIssues(
      'This stunning home nestled in the hills boasts panoramic views.',
      'instagram.luxury'
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects buyer assumptions', () => {
    const issues = findQualityIssues(
      'Perfect for your family, you\'ll love the spacious backyard.',
      'facebook.casual'
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('includes context snippet', () => {
    const issues = findQualityIssues(
      'This property has great potential with amazing possibilities.',
      'instagram.professional'
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].context).toBeTruthy();
    expect(issues[0].context!.length).toBeGreaterThan(0);
  });

  test('includes suggested fix', () => {
    const issues = findQualityIssues(
      'This is a must see to appreciate kind of home.',
      'facebook.professional'
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].suggestedFix).toBeTruthy();
  });

  test('respects platform filter on rules', () => {
    const platformRule: QualityRule = {
      pattern: 'test-platform-only',
      category: 'anti-pattern',
      priority: 'required',
      shortExplanation: 'test',
      suggestedFix: 'test fix',
      platforms: ['instagram'],
    };

    const igIssues = findQualityIssues('test-platform-only here', 'instagram.professional', [platformRule]);
    expect(igIssues.length).toBe(1);

    const fbIssues = findQualityIssues('test-platform-only here', 'facebook.professional', [platformRule]);
    expect(fbIssues.length).toBe(0);
  });

  test('detects multiple issues in same text', () => {
    const issues = findQualityIssues(
      'This cozy dream home boasts endless possibilities. Act fast!',
      'instagram.professional'
    );
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================
// checkPlatformFormat Tests
// ============================
describe('checkPlatformFormat', () => {
  test('flags text exceeding character limit', () => {
    const longText = 'a'.repeat(300);
    const issues = checkPlatformFormat(longText, 'twitter');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const charIssue = issues.find(i => i.category === 'platform-format');
    expect(charIssue).toBeDefined();
    expect(charIssue!.issue).toContain('280');
  });

  test('passes text within character limit', () => {
    const issues = checkPlatformFormat('Short tweet here', 'twitter');
    const charIssues = issues.filter(i => i.issue.includes('character limit'));
    expect(charIssues).toEqual([]);
  });

  test('flags missing CTA on platform that requires it', () => {
    const issues = checkPlatformFormat(
      'This home has 3 bedrooms and 2 bathrooms with mountain views.',
      'instagram.professional'
    );
    const ctaIssues = issues.filter(i => i.category === 'cta-effectiveness');
    expect(ctaIssues.length).toBe(1);
  });

  test('passes text with CTA on platform that requires it', () => {
    const issues = checkPlatformFormat(
      'Schedule your private showing of this mountain home today.',
      'instagram.professional'
    );
    const ctaIssues = issues.filter(i => i.category === 'cta-effectiveness');
    expect(ctaIssues).toEqual([]);
  });

  test('returns empty for unknown platform', () => {
    const issues = checkPlatformFormat('Any text', 'unknownPlatform');
    expect(issues).toEqual([]);
  });

  test('flags Google Ads headline over 30 chars', () => {
    const issues = checkPlatformFormat('This headline is way too long for Google Ads', 'googleAds.headline');
    const charIssue = issues.find(i => i.category === 'platform-format');
    expect(charIssue).toBeDefined();
  });
});

// ============================
// checkFormattingAbuse Tests
// ============================
describe('checkFormattingAbuse', () => {
  test('flags excessive ALL CAPS', () => {
    const issues = checkFormattingAbuse(
      'THIS BEAUTIFUL HOME FEATURES AMAZING VIEWS',
      'instagram.professional'
    );
    const capsIssue = issues.find(i => i.issue.includes('ALL CAPS'));
    expect(capsIssue).toBeDefined();
  });

  test('ignores common abbreviations in ALL CAPS', () => {
    const issues = checkFormattingAbuse(
      'Near MLS listing with HOA included and HVAC system',
      'instagram.professional'
    );
    const capsIssue = issues.find(i => i.issue.includes('ALL CAPS'));
    expect(capsIssue).toBeUndefined();
  });

  test('flags excessive exclamation marks', () => {
    const issues = checkFormattingAbuse(
      'Amazing home!!! Must see!!!',
      'facebook.casual'
    );
    const exclIssue = issues.find(i => i.issue.includes('exclamation'));
    expect(exclIssue).toBeDefined();
  });

  test('allows single exclamation marks', () => {
    const issues = checkFormattingAbuse(
      'Beautiful home! Great location!',
      'facebook.casual'
    );
    const exclIssue = issues.find(i => i.issue.includes('exclamation'));
    expect(exclIssue).toBeUndefined();
  });

  test('flags excessive ellipsis', () => {
    const issues = checkFormattingAbuse(
      'Wait for it..... amazing views',
      'instagram.professional'
    );
    const ellipsisIssue = issues.find(i => i.issue.includes('ellipsis'));
    expect(ellipsisIssue).toBeDefined();
  });

  test('returns empty for well-formatted text', () => {
    const issues = checkFormattingAbuse(
      'This 3-bedroom home features a modern kitchen and mountain views.',
      'instagram.professional'
    );
    expect(issues).toEqual([]);
  });
});

// ============================
// extractPlatformTexts Tests
// ============================
describe('extractPlatformTexts', () => {
  test('extracts all platform texts from campaign', () => {
    const campaign = buildMockCampaign();
    const texts = extractPlatformTexts(campaign);

    // Should have many entries
    expect(texts.length).toBeGreaterThan(20);

    // Check specific platforms exist
    const platforms = texts.map(([p]) => p);
    expect(platforms).toContain('instagram.professional');
    expect(platforms).toContain('facebook.casual');
    expect(platforms).toContain('twitter');
    expect(platforms).toContain('zillow');
    expect(platforms).toContain('mlsDescription');
  });

  test('returns [platform, text] pairs', () => {
    const campaign = buildMockCampaign({ twitter: 'Test tweet' });
    const texts = extractPlatformTexts(campaign);
    const twitterEntry = texts.find(([p]) => p === 'twitter');
    expect(twitterEntry).toBeDefined();
    expect(twitterEntry![1]).toBe('Test tweet');
  });
});

// ============================
// checkAllPlatformQuality Tests
// ============================
describe('checkAllPlatformQuality', () => {
  test('returns all passed for clean campaign', () => {
    const campaign = buildMockCampaign();
    const result = checkAllPlatformQuality(campaign);

    expect(result.totalChecks).toBeGreaterThan(0);
    expect(result.platforms.length).toBe(result.totalChecks);
    expect(result.improvementsApplied).toBe(0);
  });

  test('detects quality issues in instagram text', () => {
    const campaign = buildMockCampaign({
      instagram: {
        professional: 'This stunning home nestled in the hills has great potential. Must see to appreciate!',
        casual: 'Schedule a tour of this 3-bed home.',
        luxury: 'Schedule a tour of this 3-bed home.',
      },
    });
    const result = checkAllPlatformQuality(campaign);

    const igPro = result.platforms.find(p => p.platform === 'instagram.professional');
    expect(igPro).toBeDefined();
    expect(igPro!.issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects formatting abuse across campaign', () => {
    const campaign = buildMockCampaign({
      twitter: 'AMAZING HOME!!! BEST VIEWS EVER!!! ACT NOW!!!',
    });
    const result = checkAllPlatformQuality(campaign);

    const twitterResult = result.platforms.find(p => p.platform === 'twitter');
    expect(twitterResult).toBeDefined();
    expect(twitterResult!.issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects platform format violations', () => {
    const campaign = buildMockCampaign({
      twitter: 'a'.repeat(300) + ' Schedule a tour',
    });
    const result = checkAllPlatformQuality(campaign);

    const twitterResult = result.platforms.find(p => p.platform === 'twitter');
    expect(twitterResult).toBeDefined();
    const formatIssue = twitterResult!.issues.find(i => i.category === 'platform-format');
    expect(formatIssue).toBeDefined();
  });

  test('aggregates required and recommended issue counts', () => {
    const campaign = buildMockCampaign({
      instagram: {
        professional: 'This stunning home has great potential. Must see to appreciate! Act fast!',
        casual: 'Schedule a tour of this 3-bed home.',
        luxury: 'Schedule a tour of this 3-bed home.',
      },
    });
    const result = checkAllPlatformQuality(campaign);

    expect(result.requiredIssues + result.recommendedIssues).toBe(
      result.platforms.flatMap(p => p.issues).length
    );
  });

  test('accepts custom rules', () => {
    const customRules: QualityRule[] = [
      {
        pattern: 'custom test pattern',
        category: 'anti-pattern',
        priority: 'required',
        shortExplanation: 'Custom test issue',
        suggestedFix: 'Fix it',
      },
    ];
    const campaign = buildMockCampaign({
      twitter: 'This has a custom test pattern inside. Schedule a tour.',
    });
    const result = checkAllPlatformQuality(campaign, customRules);

    const twitterResult = result.platforms.find(p => p.platform === 'twitter');
    expect(twitterResult!.issues.length).toBeGreaterThanOrEqual(1);
    expect(twitterResult!.issues[0].issue).toBe('Custom test issue');
  });
});

// ============================
// buildQualityCheatSheet Tests
// ============================
describe('buildQualityCheatSheet', () => {
  test('generates cheat sheet with subcategory sections', () => {
    const sheet = buildQualityCheatSheet();
    expect(sheet).toContain('Ad Quality Cheat Sheet');
    expect(sheet).toContain('Vague Praise');
    expect(sheet).toContain('Euphemism');
    expect(sheet).toContain('MUST AVOID');
  });

  test('includes demographic guidance when specified', () => {
    const sheet = buildQualityCheatSheet({ demographic: 'first-time buyer' });
    expect(sheet).toContain('first-time buyer');
    expect(sheet).toContain('Target Demographic');
  });

  test('includes property type guidance when specified', () => {
    const sheet = buildQualityCheatSheet({ propertyType: 'luxury estate' });
    expect(sheet).toContain('luxury estate');
    expect(sheet).toContain('Property Type');
  });

  test('omits demographic section when not specified', () => {
    const sheet = buildQualityCheatSheet();
    expect(sheet).not.toContain('Target Demographic');
  });
});
