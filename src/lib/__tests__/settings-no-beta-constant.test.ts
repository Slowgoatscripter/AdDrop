import { SETTING_KEYS } from '@/lib/types/settings';

/**
 * Verifies the SETTING_KEYS object uses v1 naming conventions.
 * The LANDING_CTA_BETA constant should have been renamed to LANDING_CTA_NOTICE
 * while keeping the DB key 'landing.cta_beta' for backward compatibility.
 */
describe('Settings constants — v1 naming', () => {
  test('does not export LANDING_CTA_BETA constant name', () => {
    expect('LANDING_CTA_BETA' in SETTING_KEYS).toBe(false);
  });

  test('exports LANDING_CTA_NOTICE constant name', () => {
    expect('LANDING_CTA_NOTICE' in SETTING_KEYS).toBe(true);
  });

  test('LANDING_CTA_NOTICE maps to legacy DB key for backward compatibility', () => {
    expect((SETTING_KEYS as Record<string, string>).LANDING_CTA_NOTICE).toBe('landing.cta_beta');
  });
});
