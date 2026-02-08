import { getComplianceConfig, getDefaultCompliance, checkCompliance } from './index';
import { montanaCompliance } from './montana';
import { MLSComplianceConfig } from '@/lib/types';

describe('Montana Compliance Config', () => {
  test('exports Montana compliance configuration', () => {
    expect(montanaCompliance).toBeDefined();
    expect(montanaCompliance.state).toBe('Montana');
    expect(montanaCompliance.mlsName).toBe('Montana Regional MLS');
  });

  test('includes required MLS rules', () => {
    expect(montanaCompliance.rules).toContain('Must include listing broker name');
    expect(montanaCompliance.rules).toContain('Fair housing compliance required');
  });

  test('includes required disclosures', () => {
    expect(montanaCompliance.requiredDisclosures).toContain('Equal Housing Opportunity');
    expect(montanaCompliance.requiredDisclosures.length).toBeGreaterThan(0);
  });

  test('includes prohibited terms', () => {
    expect(montanaCompliance.prohibitedTerms).toContain('guaranteed appreciation');
    expect(montanaCompliance.prohibitedTerms).toContain('exclusive neighborhood');
    expect(montanaCompliance.prohibitedTerms).toContain('family neighborhood');
  });

  test('sets max description length', () => {
    expect(montanaCompliance.maxDescriptionLength).toBe(1000);
  });
});

describe('getComplianceConfig', () => {
  test('returns Montana config for MT state code', () => {
    const config = getComplianceConfig('MT');
    expect(config).toBeDefined();
    expect(config?.state).toBe('Montana');
  });

  test('returns Montana config for lowercase mt', () => {
    const config = getComplianceConfig('mt');
    expect(config).toBeDefined();
    expect(config?.state).toBe('Montana');
  });

  test('returns null for unsupported state code', () => {
    const config = getComplianceConfig('CA');
    expect(config).toBeNull();
  });

  test('returns null for invalid state code', () => {
    const config = getComplianceConfig('INVALID');
    expect(config).toBeNull();
  });
});

describe('getDefaultCompliance', () => {
  test('returns Montana compliance as default', () => {
    const config = getDefaultCompliance();
    expect(config).toBeDefined();
    expect(config.state).toBe('Montana');
    expect(config).toEqual(montanaCompliance);
  });
});

describe('checkCompliance', () => {
  const testConfig: MLSComplianceConfig = {
    state: 'Test',
    mlsName: 'Test MLS',
    rules: ['Rule 1'],
    requiredDisclosures: ['Disclosure 1'],
    prohibitedTerms: ['guaranteed appreciation', 'exclusive neighborhood'],
    maxDescriptionLength: 100,
  };

  test('passes when text contains no prohibited terms', () => {
    const text = 'Beautiful home with spacious kitchen and modern updates';
    const results = checkCompliance(text, testConfig);

    const prohibitedTermResults = results.filter(r => r.rule.includes('No prohibited term'));
    expect(prohibitedTermResults.every(r => r.passed)).toBe(true);
  });

  test('fails when text contains prohibited term', () => {
    const text = 'This property offers guaranteed appreciation in an exclusive neighborhood';
    const results = checkCompliance(text, testConfig);

    const appreciationResult = results.find(r => r.rule.includes('guaranteed appreciation'));
    expect(appreciationResult?.passed).toBe(false);
    expect(appreciationResult?.detail).toContain('Found "guaranteed appreciation"');

    const exclusiveResult = results.find(r => r.rule.includes('exclusive neighborhood'));
    expect(exclusiveResult?.passed).toBe(false);
    expect(exclusiveResult?.detail).toContain('Found "exclusive neighborhood"');
  });

  test('is case-insensitive when checking prohibited terms', () => {
    const text = 'GUARANTEED APPRECIATION and Exclusive Neighborhood';
    const results = checkCompliance(text, testConfig);

    const appreciationResult = results.find(r => r.rule.includes('guaranteed appreciation'));
    expect(appreciationResult?.passed).toBe(false);

    const exclusiveResult = results.find(r => r.rule.includes('exclusive neighborhood'));
    expect(exclusiveResult?.passed).toBe(false);
  });

  test('passes when text is within length limit', () => {
    const text = 'Short description';
    const results = checkCompliance(text, testConfig);

    const lengthResult = results.find(r => r.rule.includes('Max'));
    expect(lengthResult?.passed).toBe(true);
    expect(lengthResult?.detail).toBeUndefined();
  });

  test('fails when text exceeds length limit', () => {
    const text = 'a'.repeat(150);
    const results = checkCompliance(text, testConfig);

    const lengthResult = results.find(r => r.rule.includes('Max'));
    expect(lengthResult?.passed).toBe(false);
    expect(lengthResult?.detail).toContain('150 characters');
    expect(lengthResult?.detail).toContain('50 over limit');
  });

  test('handles config without maxDescriptionLength', () => {
    const configNoLimit: MLSComplianceConfig = {
      ...testConfig,
      maxDescriptionLength: undefined,
    };

    const text = 'a'.repeat(5000);
    const results = checkCompliance(text, configNoLimit);

    const lengthResult = results.find(r => r.rule.includes('Max'));
    expect(lengthResult).toBeUndefined();
  });

  test('returns all check results', () => {
    const text = 'Test description';
    const results = checkCompliance(text, testConfig);

    // Should have results for each prohibited term + length check
    const expectedCount = testConfig.prohibitedTerms.length + 1;
    expect(results.length).toBe(expectedCount);
  });
});
