import { scanForProhibitedTerms } from '../regex-scan';
import { montanaCompliance } from '../terms/montana';

const makeTexts = (texts: Record<string, string>): [string, string][] =>
  Object.entries(texts);

describe('scanForProhibitedTerms', () => {
  test('detects exact match of prohibited term (case-insensitive)', () => {
    const texts = makeTexts({ 'instagram.casual': 'This exclusive neighborhood awaits you' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].term).toBe('exclusive neighborhood');
    expect(results[0].platform).toBe('instagram.casual');
    expect(results[0].severity).toBe('hard');
  });

  test('is case-insensitive', () => {
    const texts = makeTexts({ twitter: 'An EXCLUSIVE NEIGHBORHOOD for you' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results.some(r => r.term === 'exclusive neighborhood')).toBe(true);
  });

  test('does not flag allowed context: family room', () => {
    const texts = makeTexts({ zillow: 'Spacious family room with fireplace' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    const familyMatches = results.filter(r => r.term.includes('family'));
    expect(familyMatches).toHaveLength(0);
  });

  test('does not flag allowed context: master bedroom', () => {
    const texts = makeTexts({ zillow: 'Large master bedroom with ensuite' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    const masterMatches = results.filter(r => r.term.includes('master'));
    expect(masterMatches).toHaveLength(0);
  });

  test('flags multi-word phrases', () => {
    const texts = makeTexts({ 'facebook.professional': 'This is a safe neighborhood to raise kids' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results.some(r => r.term === 'safe neighborhood')).toBe(true);
  });

  test('returns empty array when no violations found', () => {
    const texts = makeTexts({ twitter: 'Beautiful 3-bed home with updated kitchen' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results).toHaveLength(0);
  });

  test('includes category and severity from config term', () => {
    const texts = makeTexts({ 'metaAd.headline': 'No children allowed' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    const match = results.find(r => r.term === 'no children');
    expect(match).toBeDefined();
    expect(match!.category).toBe('familial-status');
    expect(match!.severity).toBe('hard');
  });
});
