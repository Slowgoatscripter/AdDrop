import { montanaCompliance } from '../montana';
import { allFederalTerms } from '../federal';

describe('Montana compliance config', () => {
  test('total term count is unchanged after refactor', () => {
    expect(montanaCompliance.prohibitedTerms.length).toBe(227);
  });

  test('includes all federal terms', () => {
    const montanaTerms = new Set(montanaCompliance.prohibitedTerms.map(t => t.term));
    for (const fedTerm of allFederalTerms) {
      expect(montanaTerms.has(fedTerm.term)).toBe(true);
    }
  });

  test('has no duplicate terms', () => {
    const terms = montanaCompliance.prohibitedTerms.map(t => t.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });

  test('has correct state metadata', () => {
    expect(montanaCompliance.state).toBe('Montana');
    expect(montanaCompliance.mlsName).toBe('Montana Regional MLS');
    expect(montanaCompliance.maxDescriptionLength).toBe(1000);
  });

  test('includes Montana-specific age terms', () => {
    const ageTerms = montanaCompliance.prohibitedTerms.filter(t => t.category === 'age');
    expect(ageTerms.length).toBeGreaterThanOrEqual(18);
  });

  test('includes Montana-specific marital status terms', () => {
    const maritalTerms = montanaCompliance.prohibitedTerms.filter(t => t.category === 'marital-status');
    expect(maritalTerms.length).toBeGreaterThanOrEqual(13);
  });

  test('includes Montana-specific creed terms', () => {
    const creedTerms = montanaCompliance.prohibitedTerms.filter(t => t.category === 'creed');
    expect(creedTerms.length).toBeGreaterThanOrEqual(14);
  });

  test('includes Montana MCA law citations', () => {
    const mcaTerms = montanaCompliance.prohibitedTerms.filter(t => t.law.includes('MCA'));
    expect(mcaTerms.length).toBeGreaterThan(0);
  });

  test('includes Montana MLS Rules misleading claims', () => {
    const mtMlsTerms = montanaCompliance.prohibitedTerms.filter(
      t => t.category === 'misleading-claims' && t.law.includes('Montana MLS Rules')
    );
    expect(mtMlsTerms.length).toBe(6);
  });

  test('has rules array', () => {
    expect(montanaCompliance.rules.length).toBeGreaterThan(0);
  });

  test('has required disclosures', () => {
    expect(montanaCompliance.requiredDisclosures.length).toBeGreaterThan(0);
  });

  test('has docPaths for Montana state docs', () => {
    expect(montanaCompliance.docPaths?.state).toEqual(
      expect.arrayContaining([expect.stringContaining('montana')])
    );
  });
});
