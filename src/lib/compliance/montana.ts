import { MLSComplianceConfig } from '@/lib/types';

export const montanaCompliance: MLSComplianceConfig = {
  state: 'Montana',
  mlsName: 'Montana Regional MLS',
  rules: [
    'Must include listing broker name',
    'Must include MLS number if available',
    'No guaranteed or promised appreciation language',
    'Must disclose if property is in a flood zone (if known)',
    'Fair housing compliance required',
    'No discriminatory language per Fair Housing Act',
  ],
  requiredDisclosures: [
    'Listing courtesy of [Broker Name]',
    'Information deemed reliable but not guaranteed',
    'Equal Housing Opportunity',
  ],
  prohibitedTerms: [
    'guaranteed appreciation',
    'sure investment',
    'exclusive neighborhood',
    'no crime',
    'safe area',
    'best schools',
    'walking distance to church',
    'family neighborhood',
    'perfect for couples',
  ],
  maxDescriptionLength: 1000,
};
