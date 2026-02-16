// Mock OpenAI before imports
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

import { checkComplianceWithAgent, scanTextWithAgent } from './agent';
import { montanaCompliance } from './terms/montana';
import type { CampaignKit } from '@/lib/types/campaign';

// Helper: build minimal mock campaign
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
    complianceResult: { platforms: [], campaignVerdict: 'compliant', violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
    hashtags: ['#realestate'],
    callsToAction: ['Call now'],
    targetingNotes: 'Clean notes',
    sellingPoints: ['Great views'],
    ...overrides,
  };
}

describe('checkComplianceWithAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns compliant verdict when no violations found', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'instagram.professional', verdict: 'pass', violationCount: 0, autoFixCount: 0 }
            ],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const campaign = buildMockCampaign();
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.campaignVerdict).toBe('compliant');
    expect(result.totalViolations).toBe(0);
    expect(result.violations).toEqual([]);
    expect(result.autoFixes).toEqual([]);
  });

  test('detects exact term matches', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'twitter', verdict: 'fail', violationCount: 1, autoFixCount: 0 }
            ],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'twitter',
              term: 'exclusive neighborhood',
              category: 'steering',
              severity: 'hard',
              explanation: 'Implies racial or economic exclusion',
              law: 'Fair Housing Act §3604(c)',
              isContextual: false
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const campaign = buildMockCampaign({ twitter: 'Located in an exclusive neighborhood' });
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.campaignVerdict).toBe('non-compliant');
    expect(result.totalViolations).toBe(1);
    expect(result.violations[0].term).toBe('exclusive neighborhood');
    expect(result.violations[0].isContextual).toBe(false);
  });

  test('detects contextual violations that regex would miss', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'twitter', verdict: 'fail', violationCount: 1, autoFixCount: 0 }
            ],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'twitter',
              term: 'perfect for families',
              category: 'familial-status',
              severity: 'hard',
              explanation: 'Targets families and excludes other household compositions',
              law: 'Fair Housing Act §3604(c)',
              isContextual: true
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const campaign = buildMockCampaign({ twitter: 'This home is perfect for families with children' });
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.totalViolations).toBe(1);
    expect(result.violations[0].isContextual).toBe(true);
    expect(result.violations[0].category).toBe('familial-status');
  });

  test('provides auto-fixes for soft violations', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'mlsDescription', verdict: 'pass', violationCount: 1, autoFixCount: 1 }
            ],
            campaignVerdict: 'needs-review',
            violations: [{
              platform: 'mlsDescription',
              term: 'master bedroom',
              category: 'sex-gender',
              severity: 'soft',
              explanation: 'Problematic historical connotations',
              law: 'NAR guidelines',
              isContextual: false
            }],
            autoFixes: [{
              platform: 'mlsDescription',
              before: 'Features a master bedroom',
              after: 'Features a primary bedroom',
              violationTerm: 'master bedroom',
              category: 'sex-gender'
            }],
            totalViolations: 1,
            totalAutoFixes: 1,
          })
        }
      }]
    });

    const campaign = buildMockCampaign({ mlsDescription: 'Features a master bedroom' });
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.campaignVerdict).toBe('needs-review');
    expect(result.totalViolations).toBe(1);
    expect(result.totalAutoFixes).toBe(1);
    expect(result.autoFixes[0].before).toContain('master bedroom');
    expect(result.autoFixes[0].after).toContain('primary bedroom');
  });

  test('returns needs-review when all violations auto-fixed', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'twitter', verdict: 'pass', violationCount: 1, autoFixCount: 1 }
            ],
            campaignVerdict: 'needs-review',
            violations: [{
              platform: 'twitter',
              term: 'master bedroom',
              category: 'sex-gender',
              severity: 'soft',
              explanation: 'Problematic term',
              law: 'NAR guidelines',
              isContextual: false
            }],
            autoFixes: [{
              platform: 'twitter',
              before: 'Has a master bedroom',
              after: 'Has a primary bedroom',
              violationTerm: 'master bedroom',
              category: 'sex-gender'
            }],
            totalViolations: 1,
            totalAutoFixes: 1,
          })
        }
      }]
    });

    const campaign = buildMockCampaign({ twitter: 'Has a master bedroom' });
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.campaignVerdict).toBe('needs-review');
  });

  test('returns non-compliant when hard violations cannot be auto-fixed', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'twitter', verdict: 'fail', violationCount: 1, autoFixCount: 0 }
            ],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'twitter',
              term: 'no children',
              category: 'familial-status',
              severity: 'hard',
              explanation: 'Directly excludes families',
              law: 'Fair Housing Act §3604(c)',
              isContextual: false
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const campaign = buildMockCampaign({ twitter: 'Great home, no children allowed' });
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.campaignVerdict).toBe('non-compliant');
    expect(result.totalViolations).toBe(1);
    expect(result.totalAutoFixes).toBe(0);
  });

  test('handles API errors with fallback result', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null
        }
      }]
    });

    const campaign = buildMockCampaign();
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.campaignVerdict).toBe('needs-review');
    expect(result.platforms).toEqual([]);
    expect(result.violations).toEqual([]);
  });

  test('calls OpenAI with temperature 0 and json_object format', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const campaign = buildMockCampaign();
    await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0,
        response_format: { type: 'json_object' },
      })
    );
  });

  test('includes compliance docs in prompt', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const campaign = buildMockCampaign();
    await checkComplianceWithAgent(campaign, montanaCompliance);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
    expect(userMessage.content).toContain('COMPLIANCE DOCUMENTATION');
  });
});

describe('scanTextWithAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('scans single text string for violations', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'general', verdict: 'fail', violationCount: 1, autoFixCount: 0 }
            ],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'general',
              term: 'exclusive neighborhood',
              category: 'steering',
              severity: 'hard',
              explanation: 'Implies exclusion',
              law: 'Fair Housing Act §3604(c)',
              isContextual: false
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const result = await scanTextWithAgent(
      'This exclusive neighborhood is perfect',
      'MT',
      'instagram',
      montanaCompliance
    );

    expect(result.totalViolations).toBe(1);
    expect(result.violations[0].term).toBe('exclusive neighborhood');
  });

  test('uses provided platform name', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'twitter', verdict: 'pass', violationCount: 0, autoFixCount: 0 }
            ],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const result = await scanTextWithAgent('Clean text', 'MT', 'twitter', montanaCompliance);

    expect(result.platforms[0].platform).toBe('twitter');
  });

  test('defaults to general platform when not specified', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [
              { platform: 'general', verdict: 'pass', violationCount: 0, autoFixCount: 0 }
            ],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const result = await scanTextWithAgent('Clean text', 'MT', undefined, montanaCompliance);

    expect(result.platforms[0].platform).toBe('general');
  });

  test('handles empty text gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const result = await scanTextWithAgent('', 'MT', 'general', montanaCompliance);

    expect(result.campaignVerdict).toBe('compliant');
    expect(result.totalViolations).toBe(0);
  });

  test('handles null response content with fallback', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null
        }
      }]
    });

    const result = await scanTextWithAgent('Test text', 'MT', 'general', montanaCompliance);

    expect(result.campaignVerdict).toBe('needs-review');
    expect(result.platforms).toEqual([]);
  });
});
