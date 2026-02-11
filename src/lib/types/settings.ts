export const SETTING_KEYS = {
  AI_MODEL: 'ai.model',
  AI_TEMPERATURE: 'ai.temperature',
  AI_MAX_TOKENS: 'ai.max_tokens',
  AI_QUALITY_MODEL: 'ai.quality_model',
  AI_QUALITY_TEMPERATURE: 'ai.quality_temperature',
  COMPLIANCE_ENABLED: 'compliance.enabled',
  COMPLIANCE_STATE: 'compliance.state',
  COMPLIANCE_MAX_DESC_LENGTH: 'compliance.max_description_length',
  COMPLIANCE_CATEGORIES: 'compliance.categories',
  LANDING_HERO_TITLE_PREFIX: 'landing.hero_title_prefix',
  LANDING_HERO_TITLE_ACCENT: 'landing.hero_title_accent',
  LANDING_HERO_TAGLINE: 'landing.hero_tagline',
  LANDING_HERO_DESCRIPTION: 'landing.hero_description',
  LANDING_HERO_CTA: 'landing.hero_cta',
  LANDING_STATS: 'landing.stats',
  LANDING_FAQ: 'landing.faq',
  LANDING_CTA_HEADLINE: 'landing.cta_headline',
  LANDING_CTA_TEXT: 'landing.cta_text',
  LANDING_CTA_BETA: 'landing.cta_beta',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface AppSettingRow {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface LandingStat {
  value: string;
  label: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}
