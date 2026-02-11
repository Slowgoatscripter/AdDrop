import type { LandingStat, FAQItem } from '@/lib/types/settings';

export const settingsDefaults: Record<string, unknown> = {
  'ai.model': 'gpt-5.2',
  'ai.temperature': 0.7,
  'ai.max_tokens': 16000,
  'ai.quality_model': 'gpt-4o-mini',
  'ai.quality_temperature': 0.3,
  'compliance.enabled': true,
  'compliance.state': 'MT',
  'compliance.max_description_length': 1000,
  'compliance.categories': [
    'steering', 'familial-status', 'disability', 'race-color-national-origin',
    'religion', 'sex-gender', 'age', 'marital-status', 'political-beliefs',
    'economic-exclusion', 'misleading-claims',
  ],
  'landing.hero_title_prefix': 'Ad',
  'landing.hero_title_accent': 'Drop',
  'landing.hero_tagline': 'Your Listing. 12 Platforms. Zero Effort.',
  'landing.hero_description': 'Enter your property details and get a complete ad campaign — Instagram, Facebook, Google, print, direct mail — in under 60 seconds.',
  'landing.hero_cta': 'Start Creating Ads',
  'landing.stats': [
    { value: '12+', label: 'Ad Platforms' },
    { value: '5', label: 'Tone Options' },
    { value: '100%', label: 'Compliance Checked' },
    { value: '<60s', label: 'Generation Time' },
  ] as LandingStat[],
  'landing.faq': [
    { question: 'Is AdDrop really free?', answer: 'Yes — AdDrop is completely free during our beta period. No account, no credit card, no catch. We want you to try it and tell us what you think.' },
    { question: 'What information do I need to get started?', answer: 'Just your property address, a few photos, and basic details like beds, baths, and price. It takes about a minute to fill out — then AdDrop handles the rest.' },
    { question: 'How does the AI know what to write?', answer: "AdDrop's AI is trained specifically for real estate marketing. It understands platform best practices, character limits, tone variations, and fair housing compliance. It writes ads that sound like they came from a professional copywriter." },
    { question: 'Is the ad copy compliant with fair housing laws?', answer: 'AdDrop includes built-in compliance checking that automatically flags and corrects problematic language. Currently optimized for Montana MLS requirements, with more states coming soon.' },
    { question: 'Can I edit the generated ads?', answer: 'Absolutely. Every ad is fully editable. Use the AI output as a starting point and customize it to match your voice and brand.' },
    { question: 'What platforms are supported?', answer: "Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print ads, direct mail postcards, magazine ads, and more. We're adding new platforms regularly." },
  ] as FAQItem[],
  'landing.cta_headline': 'Your Next Listing Deserves Better Marketing',
  'landing.cta_text': 'Create Your First Campaign',
  'landing.cta_beta': 'Free during beta. No account needed. Seriously.',
};
