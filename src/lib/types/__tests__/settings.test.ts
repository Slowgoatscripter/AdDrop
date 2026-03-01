import { SETTING_KEYS } from '@/lib/types/settings';

describe('SETTING_KEYS', () => {
  it('has LANDING_CTA_DESCRIPTION key mapped to landing.cta_description', () => {
    expect(SETTING_KEYS.LANDING_CTA_DESCRIPTION).toBe('landing.cta_description');
  });

  it('does not have LANDING_CTA_BETA key', () => {
    expect('LANDING_CTA_BETA' in SETTING_KEYS).toBe(false);
  });
});
