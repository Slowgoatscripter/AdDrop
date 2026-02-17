import { extractAdCopyTexts, extractPlatformTexts } from '../utils';

const mockCampaign = {
  id: 'test',
  listing: {} as any,
  createdAt: '2026-01-01',
  instagram: { professional: 'pro text', casual: 'casual text', luxury: 'luxury text' },
  twitter: 'tweet text',
  hashtags: ['#realestate', '#home'],
  callsToAction: ['Schedule a tour'],
  targetingNotes: 'Target affluent neighborhoods',
  sellingPoints: ['Great location'],
  complianceResult: { platforms: [], campaignVerdict: 'compliant' as const, violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
} as any;

describe('extractAdCopyTexts', () => {
  test('excludes strategy fields (hashtags, CTAs, targeting, selling points)', () => {
    const texts = extractAdCopyTexts(mockCampaign);
    const labels = texts.map(([label]) => label);
    expect(labels).not.toContain('hashtags');
    expect(labels).not.toContain('callsToAction');
    expect(labels).not.toContain('targetingNotes');
    expect(labels).not.toContain('sellingPoints');
  });

  test('includes ad copy platform texts', () => {
    const texts = extractAdCopyTexts(mockCampaign);
    const labels = texts.map(([label]) => label);
    expect(labels).toContain('instagram.professional');
    expect(labels).toContain('instagram.casual');
    expect(labels).toContain('twitter');
  });

  test('returns same format as extractPlatformTexts minus strategy fields', () => {
    const allTexts = extractPlatformTexts(mockCampaign);
    const adTexts = extractAdCopyTexts(mockCampaign);
    const strategyLabels = ['hashtags', 'callsToAction', 'targetingNotes', 'sellingPoints'];
    const expectedTexts = allTexts.filter(([label]) => !strategyLabels.includes(label));
    expect(adTexts).toEqual(expectedTexts);
  });
});
