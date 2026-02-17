import { ohioCompliance } from '../ohio';
import { allFederalTerms } from '../federal';

describe('Ohio compliance config', () => {
  test('total term count is unchanged after refactor', () => {
    expect(ohioCompliance.prohibitedTerms.length).toBe(219);
  });

  test('includes all federal terms', () => {
    const ohioTerms = new Set(ohioCompliance.prohibitedTerms.map(t => t.term));
    for (const fedTerm of allFederalTerms) {
      expect(ohioTerms.has(fedTerm.term)).toBe(true);
    }
  });

  test('has no duplicate terms', () => {
    const terms = ohioCompliance.prohibitedTerms.map(t => t.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('has correct state metadata', () => {
    expect(ohioCompliance.state).toBe('Ohio');
    expect(ohioCompliance.mlsName).toBe('Ohio MLS (multi-board)');
    expect(ohioCompliance.maxDescriptionLength).toBe(1500);
  });

  it('includes military-status terms', () => {
    const militaryTerms = ohioCompliance.prohibitedTerms.filter(
      t => t.category === 'military-status'
    );
    expect(militaryTerms.length).toBeGreaterThanOrEqual(21);
  });

  it('includes ancestry terms under race-color-national-origin', () => {
    const ancestryTerms = ohioCompliance.prohibitedTerms.filter(
      t => t.category === 'race-color-national-origin' && t.law.includes('4112')
    );
    expect(ancestryTerms.length).toBeGreaterThanOrEqual(5);
  });

  it('does NOT include creed/political-beliefs terms', () => {
    const creedTerms = ohioCompliance.prohibitedTerms.filter(t => t.category === 'creed');
    expect(creedTerms).toHaveLength(0);
  });

  it('does NOT include age or marital-status terms', () => {
    const ageTerms = ohioCompliance.prohibitedTerms.filter(t => t.category === 'age');
    const maritalTerms = ohioCompliance.prohibitedTerms.filter(t => t.category === 'marital-status');
    expect(ageTerms).toHaveLength(0);
    expect(maritalTerms).toHaveLength(0);
  });

  it('uses Ohio/federal citations, not Montana MCA', () => {
    const mcaTerms = ohioCompliance.prohibitedTerms.filter(t => t.law.includes('MCA'));
    expect(mcaTerms).toHaveLength(0);
  });

  it('has required disclosures', () => {
    expect(ohioCompliance.requiredDisclosures.length).toBeGreaterThan(0);
  });

  it('has docPaths for Ohio state docs', () => {
    expect(ohioCompliance.docPaths?.state).toEqual(
      expect.arrayContaining([expect.stringContaining('ohio')])
    );
  });

  it('includes Ohio-specific steering additions', () => {
    const terms = ohioCompliance.prohibitedTerms.map(t => t.term);
    expect(terms).toContain('board approval');
    expect(terms).toContain('membership approval');
  });

  it('includes Ohio misleading claims additions', () => {
    const terms = ohioCompliance.prohibitedTerms.map(t => t.term);
    expect(terms).toContain('guaranteed sale');
    expect(terms).toContain('no commission');
  });

  it('includes NAR settlement terms', () => {
    const narTerms = ohioCompliance.prohibitedTerms.filter(t => t.law.includes('NAR'));
    expect(narTerms.length).toBeGreaterThanOrEqual(4);
  });

  it('has rules array with Ohio-specific requirements', () => {
    expect(ohioCompliance.rules).toEqual(
      expect.arrayContaining([
        expect.stringContaining('license number'),
      ])
    );
  });
});
