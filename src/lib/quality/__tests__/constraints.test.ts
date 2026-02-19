import { enforceConstraints } from '../constraints';

const makeCampaign = (overrides: Record<string, any> = {}) => ({
  id: 'test',
  listing: { address: { state: 'MT' } } as any,
  createdAt: '2026-01-01',
  twitter: 'A'.repeat(300),
  mlsDescription: 'B'.repeat(1200),
  complianceResult: { platforms: [], campaignVerdict: 'compliant' as const, violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
  hashtags: [],
  callsToAction: [],
  targetingNotes: '',
  sellingPoints: [],
  ...overrides,
});

const mockConfig = {
  maxDescriptionLength: 1000,
  requiredDisclosures: ['Equal Housing Opportunity'],
} as any;

describe('enforceConstraints', () => {
  test('truncates tweet over 280 chars', () => {
    const campaign = makeCampaign();
    const { campaign: fixed, constraints } = enforceConstraints(campaign, mockConfig);
    expect(fixed.twitter!.length).toBeLessThanOrEqual(280);
    expect(constraints.some(c => c.type === 'character-limit' && c.platform === 'twitter')).toBe(true);
  });

  test('truncates MLS description over maxDescriptionLength', () => {
    const campaign = makeCampaign();
    const { campaign: fixed, constraints } = enforceConstraints(campaign, mockConfig);
    expect(fixed.mlsDescription!.length).toBeLessThanOrEqual(1000);
    expect(constraints.some(c => c.type === 'character-limit' && c.platform === 'mlsDescription')).toBe(true);
  });

  test('returns empty constraints when everything is within limits', () => {
    const campaign = makeCampaign({ twitter: 'Short tweet', mlsDescription: 'Short desc' });
    const { constraints } = enforceConstraints(campaign, mockConfig);
    expect(constraints).toHaveLength(0);
  });

  test('constraint has autoFixed=true and fixedText when truncated', () => {
    const campaign = makeCampaign();
    const { constraints } = enforceConstraints(campaign, mockConfig);
    const twitterConstraint = constraints.find(c => c.platform === 'twitter');
    expect(twitterConstraint?.autoFixed).toBe(true);
    expect(twitterConstraint?.fixedText).toBeDefined();
    expect(twitterConstraint?.fixedText!.length).toBeLessThanOrEqual(280);
  });
});
