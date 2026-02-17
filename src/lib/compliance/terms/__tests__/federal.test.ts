import { allFederalTerms } from '../federal';

describe('federal terms', () => {
  test('contains expected term count', () => {
    expect(allFederalTerms.length).toBeGreaterThanOrEqual(160);
    expect(allFederalTerms.length).toBeLessThanOrEqual(180);
  });

  test('no duplicate terms', () => {
    const termStrings = allFederalTerms.map(t => t.term.toLowerCase());
    const unique = new Set(termStrings);
    expect(unique.size).toBe(termStrings.length);
  });

  test('all terms have required fields', () => {
    for (const term of allFederalTerms) {
      expect(term.term).toBeTruthy();
      expect(term.category).toBeTruthy();
      expect(['hard', 'soft']).toContain(term.severity);
      expect(term.shortExplanation).toBeTruthy();
      expect(term.law).toBeTruthy();
      expect(term.suggestedAlternative).toBeTruthy();
    }
  });

  test('no terms reference state-specific law', () => {
    for (const term of allFederalTerms) {
      expect(term.law).not.toContain('Montana');
      expect(term.law).not.toContain('ORC');
      expect(term.law).not.toContain('Ohio');
    }
  });
});
