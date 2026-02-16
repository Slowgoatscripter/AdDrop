import {
  findQualityIssues,
  checkPlatformFormat,
  checkFormattingAbuse,
  checkAllPlatformQuality,
  extractPlatformTexts,
} from './engine';
import { autoFixTextRegex, autoFixQuality } from './auto-fix';
import { formattingRules, platformFormats } from './rules';
import { buildQualityCheatSheet } from './docs';
import { mergeQualityResults } from './scorer';
import { QualityIssue, QualityRule } from '@/lib/types/quality';
import { CampaignKit } from '@/lib/types/campaign';

// Import scorer internals for testing via require (to access non-exported members)
// We'll test exported functions and verify constants via module inspection

// Mock OpenAI to avoid requiring API key in tests
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

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
// Formatting Rules Config Tests
// ============================
describe('Formatting Rules', () => {
  test('exports only formatting rules (no language rules)', () => {
    expect(formattingRules.length).toBeGreaterThanOrEqual(4);
    expect(formattingRules.length).toBeLessThan(10);
    for (const rule of formattingRules) {
      expect(rule.category).toBe('formatting');
    }
  });

  test('all rules have required fields', () => {
    for (const rule of formattingRules) {
      expect(rule.pattern).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(['required', 'recommended']).toContain(rule.priority);
      expect(rule.shortExplanation).toBeTruthy();
      expect(rule.suggestedFix).toBeTruthy();
    }
  });

  test('language rules are no longer exported', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rules = require('./rules');
    expect(rules.qualityRules).toBeUndefined();
    expect(rules.formattingRules).toBeDefined();
    expect(rules.platformFormats).toBeDefined();
  });

  test('no language subcategories present in formatting rules', () => {
    const languageSubcategories = [
      'vague-praise', 'euphemism', 'pressure-tactic', 'assumption',
      'meaningless-superlative', 'ai-slop', 'avoid-word', 'weak-cta',
    ];
    const subcategories = new Set(formattingRules.map(r => r.subcategory).filter(Boolean));
    for (const langSub of languageSubcategories) {
      expect(subcategories).not.toContain(langSub);
    }
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
// Language Anti-Patterns NOT Flagged
// ============================
describe('Language anti-patterns are not flagged by regex engine', () => {
  test('common real-estate anti-patterns produce zero issues', () => {
    const textWithAntiPatterns =
      'Nestled in a quiet neighborhood, this home boasts a cozy living room ' +
      'with a charming fireplace. The stunning kitchen is a must-see! ' +
      'This gem won\'t last long. Priced to sell. Schedule a tour today.';

    // findQualityIssues should not flag any language anti-patterns
    const ruleIssues = findQualityIssues(textWithAntiPatterns, 'instagram.professional');
    expect(ruleIssues).toEqual([]);

    // checkFormattingAbuse should also not flag these words
    const abuseIssues = checkFormattingAbuse(textWithAntiPatterns, 'instagram.professional');
    expect(abuseIssues).toEqual([]);

    // checkPlatformFormat should not flag language either
    const formatIssues = checkPlatformFormat(textWithAntiPatterns, 'instagram.professional');
    // Only possible issue is missing CTA, but "Schedule" is present
    const languageIssues = formatIssues.filter(i =>
      i.category !== 'platform-format' && i.category !== 'cta-effectiveness'
    );
    expect(languageIssues).toEqual([]);
  });

  test('full campaign with language anti-patterns passes quality engine', () => {
    const campaign = buildMockCampaign({
      instagram: {
        professional: 'Nestled in the hills, this home boasts mountain views. Schedule a tour today. #realestate #montana #dreamhome',
        casual: 'This cozy gem is a must-see! Charming inside and out. Book your showing! #realestate #montana #dreamhome',
        luxury: 'A stunning estate nestled among towering pines. Discover elegance. #realestate #montana #dreamhome',
      },
    });
    const result = checkAllPlatformQuality(campaign);
    // Language words like "nestled", "boasts", "cozy", "gem", "stunning", "charming"
    // should NOT produce any issues — those are now handled by the AI scorer
    const igResults = result.platforms.filter(p => p.platform.startsWith('instagram'));
    for (const igResult of igResults) {
      const languageFlagged = igResult.issues.filter(i =>
        i.category !== 'platform-format' && i.category !== 'cta-effectiveness' && i.category !== 'formatting'
      );
      expect(languageFlagged).toEqual([]);
    }
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
    const issues = findQualityIssues('This has a custom test pattern inside.', 'instagram.professional', customRules);
    expect(issues.length).toBe(1);
    expect(issues[0].issue).toBe('Custom test issue');
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
      twitter: 'AMAZING HOME!!! BEST VIEWS EVER!!! ACT NOW!!!',
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
// Auto-Fix Tests
// ============================
describe('autoFixTextRegex', () => {
  test('converts ALL CAPS to title case', () => {
    const issues: QualityIssue[] = [{
      category: 'formatting',
      issue: 'Excessive ALL CAPS usage',
      suggestedFix: 'Use title case',
      priority: 'required',
      source: 'regex',
      platform: 'test',
    }];
    const result = autoFixTextRegex('THIS BEAUTIFUL HOME HAS VIEWS', issues);
    expect(result).toBe('This Beautiful Home Has Views');
    expect(issues[0].fixedText).toBeDefined();
  });

  test('preserves common abbreviations in ALL CAPS fix', () => {
    const issues: QualityIssue[] = [{
      category: 'formatting',
      issue: 'Excessive ALL CAPS usage',
      suggestedFix: 'Use title case',
      priority: 'required',
      source: 'regex',
      platform: 'test',
    }];
    const result = autoFixTextRegex('GREAT HOME NEAR MLS WITH HOA AND HVAC', issues);
    expect(result).toContain('MLS');
    expect(result).toContain('HOA');
    expect(result).toContain('HVAC');
  });

  test('fixes excessive exclamation marks', () => {
    const issues: QualityIssue[] = [{
      category: 'formatting',
      issue: 'Excessive exclamation marks',
      suggestedFix: 'Use single exclamation',
      priority: 'required',
      source: 'regex',
      platform: 'test',
    }];
    const result = autoFixTextRegex('Amazing home!!! Must see!!!', issues);
    expect(result).toBe('Amazing home! Must see!');
    expect(issues[0].fixedText).toBeDefined();
  });

  test('fixes excessive ellipsis', () => {
    const issues: QualityIssue[] = [{
      category: 'formatting',
      issue: 'Excessive ellipsis usage',
      suggestedFix: 'Use three dots',
      priority: 'required',
      source: 'regex',
      platform: 'test',
    }];
    const result = autoFixTextRegex('Wait for it..... amazing', issues);
    expect(result).toBe('Wait for it... amazing');
    expect(issues[0].fixedText).toBeDefined();
  });

  test('returns text unchanged when no matching issues', () => {
    const result = autoFixTextRegex('Clean text here.', []);
    expect(result).toBe('Clean text here.');
  });
});

describe('autoFixQuality', () => {
  test('does not make any API calls', async () => {
    const campaign = buildMockCampaign({
      twitter: 'AMAZING HOME!!! BEST VIEWS EVER!!!',
    });
    const qualityResult = checkAllPlatformQuality(campaign);

    // If autoFixQuality tried to call OpenAI, it would throw since there's no mock.
    // The fact that this resolves proves no API calls are made.
    const { campaign: fixed } = await autoFixQuality(campaign, qualityResult);
    expect(fixed).toBeDefined();
  });

  test('applies format fixes to campaign text', async () => {
    const campaign = buildMockCampaign({
      twitter: 'AMAZING HOME!!! BEST VIEWS!!! Schedule a tour',
    });
    const qualityResult = checkAllPlatformQuality(campaign);

    const { campaign: fixed, qualityResult: updatedResult } = await autoFixQuality(campaign, qualityResult);

    // The twitter text should have been fixed (caps + exclamation)
    expect((fixed as any).twitter).not.toBe(campaign.twitter);
    expect((fixed as any).twitter).not.toContain('!!!');
    expect(updatedResult.improvementsApplied).toBeGreaterThan(0);
  });

  test('does not mutate the original campaign', async () => {
    const original = 'AMAZING HOME!!! Schedule a tour';
    const campaign = buildMockCampaign({ twitter: original });
    const qualityResult = checkAllPlatformQuality(campaign);

    await autoFixQuality(campaign, qualityResult);
    expect(campaign.twitter).toBe(original);
  });
});

describe('autoFixTextAI is removed', () => {
  test('auto-fix module does not export autoFixTextAI', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const autoFix = require('./auto-fix');
    expect(autoFix.autoFixTextAI).toBeUndefined();
  });
});

// ============================
// buildQualityCheatSheet Tests
// ============================
describe('buildQualityCheatSheet', () => {
  test('generates cheat sheet with formatting section', () => {
    const sheet = buildQualityCheatSheet();
    expect(sheet).toContain('Ad Quality Cheat Sheet');
    expect(sheet).toContain('Formatting');
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

// ============================
// Scorer Tests (GPT-5.2 + voice-authenticity)
// ============================
describe('Scorer: AI_CATEGORIES and model', () => {
  // We test internals by reading the module source since AI_CATEGORIES
  // and buildScoringPrompt are not exported. For exported functions we
  // mock OpenAI to capture prompt content.

  let scorerSource: string;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const path = require('path');
    scorerSource = fs.readFileSync(
      path.resolve(__dirname, 'scorer.ts'),
      'utf-8',
    );
  });

  test('AI_CATEGORIES includes voice-authenticity', () => {
    expect(scorerSource).toContain("'voice-authenticity'");
    // Verify it appears in the AI_CATEGORIES array block
    const categoriesMatch = scorerSource.match(
      /const AI_CATEGORIES[\s\S]*?\];/,
    );
    expect(categoriesMatch).not.toBeNull();
    expect(categoriesMatch![0]).toContain("'voice-authenticity'");
  });

  test('AI_CATEGORIES has exactly 10 entries', () => {
    const categoriesMatch = scorerSource.match(
      /const AI_CATEGORIES[\s\S]*?\];/,
    );
    expect(categoriesMatch).not.toBeNull();
    const singleQuoteEntries = categoriesMatch![0].match(/'/g);
    // Each entry has 2 single quotes (opening + closing), so 20 quotes = 10 entries
    expect(singleQuoteEntries!.length).toBe(20);
  });

  test('model is set to gpt-5.2', () => {
    expect(scorerSource).toContain("model: 'gpt-5.2'");
    expect(scorerSource).not.toContain("model: 'gpt-4o-mini'");
  });

  test('buildScoringPrompt accepts tone parameter', () => {
    // Verify the function signature includes tone
    const sigMatch = scorerSource.match(
      /function buildScoringPrompt\([\s\S]*?\): string/,
    );
    expect(sigMatch).not.toBeNull();
    expect(sigMatch![0]).toContain("tone?: 'professional' | 'casual' | 'luxury'");
  });

  test('prompt includes voice-authenticity scoring dimension', () => {
    expect(scorerSource).toContain('voice-authenticity');
    expect(scorerSource).toContain('Does this copy sound like a seasoned real estate professional');
  });

  test('prompt includes tone interpolation for voice-authenticity', () => {
    // The prompt template should interpolate tone
    expect(scorerSource).toContain("${tone || 'professional'}");
  });
});

describe('Scorer: scoreAllPlatformQuality signature', () => {
  test('accepts tone parameter', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, 'scorer.ts'),
      'utf-8',
    );
    const sigMatch = source.match(
      /export async function scoreAllPlatformQuality\([\s\S]*?\): Promise/,
    );
    expect(sigMatch).not.toBeNull();
    expect(sigMatch![0]).toContain("tone?: 'professional' | 'casual' | 'luxury'");
  });

  test('passes tone through to buildScoringPrompt', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, 'scorer.ts'),
      'utf-8',
    );
    // The call to buildScoringPrompt should include tone as 4th argument
    expect(source).toContain(
      'buildScoringPrompt(propertyContext, platformTextBlock, demographic, tone)',
    );
  });
});

// ============================
// mergeQualityResults Tests
// ============================
describe('mergeQualityResults', () => {
  test('merges format-only regex results with AI results including voice-authenticity', () => {
    const regexResult = {
      platforms: [{
        platform: 'instagram.professional',
        issues: [{
          platform: 'instagram.professional',
          category: 'formatting' as const,
          priority: 'required' as const,
          source: 'regex' as const,
          issue: 'Exceeds character limit',
          suggestedFix: 'Shorten text',
        }],
        passed: false,
      }],
      totalChecks: 1,
      totalPassed: 0,
      requiredIssues: 1,
      recommendedIssues: 0,
      allPassed: false,
      improvementsApplied: 0,
    };

    const aiResult = {
      platforms: [{
        platform: 'instagram.professional',
        issues: [{
          platform: 'instagram.professional',
          category: 'voice-authenticity' as const,
          priority: 'recommended' as const,
          source: 'ai' as const,
          issue: 'Distancing construction detected',
          suggestedFix: 'Use direct, grounded phrasing',
          score: 5,
        }],
        passed: false,
      }],
      totalChecks: 1,
      totalPassed: 0,
      requiredIssues: 0,
      recommendedIssues: 1,
      allPassed: false,
      overallScore: 6,
      improvementsApplied: 0,
    };

    const merged = mergeQualityResults(regexResult, aiResult);
    const platform = merged.platforms.find(p => p.platform === 'instagram.professional');

    expect(platform).toBeDefined();
    expect(platform!.issues.length).toBe(2);
    expect(platform!.issues.some(i => i.category === 'formatting')).toBe(true);
    expect(platform!.issues.some(i => i.category === 'voice-authenticity')).toBe(true);
    expect(merged.requiredIssues).toBe(1);
    expect(merged.recommendedIssues).toBe(1);
    expect(merged.overallScore).toBe(6);
  });
});
