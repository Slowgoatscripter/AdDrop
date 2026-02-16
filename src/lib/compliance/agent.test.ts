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
import { ohioCompliance } from './terms/ohio';
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

describe('Montana compliance audit fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should flag creed violations for Montana', async () => {
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
              term: 'conservative neighborhood',
              category: 'creed',
              severity: 'hard',
              explanation: 'Implies political or religious preference',
              law: 'Montana Human Rights Act §49-2-305',
              isContextual: true
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          })
        }
      }]
    });

    const result = await scanTextWithAgent(
      'Conservative neighborhood with like-minded neighbors',
      'MT',
      'general',
      montanaCompliance
    );

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some(v => v.category === 'creed')).toBe(true);
  });

  test('should not flag factual proximity statements', async () => {
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

    const result = await scanTextWithAgent(
      'Located near church and community center',
      'MT',
      'general',
      montanaCompliance
    );

    const proximityViolations = result.violations.filter(
      v => v.term === 'near church'
    );
    expect(proximityViolations).toHaveLength(0);
  });

  test('should not flag inclusive language like singles welcome', async () => {
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

    const result = await scanTextWithAgent(
      'Singles welcome to apply',
      'MT',
      'general',
      montanaCompliance
    );

    const maritalViolations = result.violations.filter(
      v => v.term === 'singles welcome'
    );
    expect(maritalViolations).toHaveLength(0);
  });

  test('should flag pregnancy discrimination', async () => {
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
              term: 'no pregnant women',
              category: 'sex-gender',
              severity: 'hard',
              explanation: 'Discriminates based on pregnancy status',
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
      'No pregnant women allowed in this building',
      'MT',
      'general',
      montanaCompliance
    );

    expect(result.violations.some(v => v.term === 'no pregnant women')).toBe(true);
  });
});

describe('Ohio compliance agent', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it('detects military-status violations in Ohio', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'fail', violationCount: 1, autoFixCount: 0 }],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'zillow',
              term: 'no veterans',
              category: 'military-status',
              severity: 'hard',
              explanation: 'Excludes based on military status',
              law: 'ORC §4112.02(H)',
              isContextual: false,
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          }),
        },
      }],
    });

    const campaign = buildMockCampaign({ zillow: 'No veterans allowed in this building', stateCode: 'OH' });
    const result = await checkComplianceWithAgent(campaign, ohioCompliance);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].category).toBe('military-status');
    expect(result.campaignVerdict).toBe('non-compliant');
  });

  it('does NOT flag creed/political-beliefs for Ohio', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'pass', violationCount: 0, autoFixCount: 0 }],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          }),
        },
      }],
    });

    const campaign = buildMockCampaign({ zillow: 'Conservative neighborhood', stateCode: 'OH' });
    const result = await checkComplianceWithAgent(campaign, ohioCompliance);

    expect(result.violations).toHaveLength(0);
    expect(result.campaignVerdict).toBe('compliant');
  });

  it('auto-fixes Ohio soft military-status violations', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'pass', violationCount: 0, autoFixCount: 1 }],
            campaignVerdict: 'needs-review',
            violations: [],
            autoFixes: [{
              platform: 'zillow',
              before: 'near military base',
              after: 'near Wright-Patterson Air Force Base',
              violationTerm: 'near military base',
              category: 'military-status',
            }],
            totalViolations: 0,
            totalAutoFixes: 1,
          }),
        },
      }],
    });

    const campaign = buildMockCampaign({ zillow: 'Located near military base in Dayton', stateCode: 'OH' });
    const result = await checkComplianceWithAgent(campaign, ohioCompliance);

    expect(result.autoFixes).toHaveLength(1);
    expect(result.autoFixes[0].category).toBe('military-status');
    expect(result.campaignVerdict).toBe('needs-review');
  });
});

describe('Montana regression', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it('still detects creed violations for Montana', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'fail', violationCount: 1, autoFixCount: 0 }],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'zillow',
              term: 'conservative values',
              category: 'creed',
              severity: 'hard',
              explanation: 'Discriminates based on political beliefs',
              law: 'MCA § 49-2-305',
              isContextual: false,
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          }),
        },
      }],
    });

    const campaign = buildMockCampaign({ zillow: 'Conservative values neighborhood', stateCode: 'MT' });
    const result = await checkComplianceWithAgent(campaign, montanaCompliance);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].category).toBe('creed');
  });
});
