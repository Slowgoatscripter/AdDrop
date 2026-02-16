import { MLSComplianceConfig } from '@/lib/types';
import { getSetting } from '@/lib/settings/server';
import { complianceConfigs, montanaCompliance } from './terms/montana';

/**
 * Fetch compliance settings from the database and return a filtered config.
 * Server-only — uses async settings lookup via next/headers.
 */
export async function getComplianceSettings(stateOverride?: string): Promise<{
  enabled: boolean;
  config: MLSComplianceConfig;
  stateCode: string;
}> {
  const enabled = await getSetting<boolean>('compliance.enabled');
  const stateCode = stateOverride || await getSetting<string>('compliance.state');
  const activeCategories = await getSetting<string[]>('compliance.categories');
  const maxDescLength = await getSetting<number>('compliance.max_description_length');

  const baseConfig = complianceConfigs[stateCode.toUpperCase()] ?? montanaCompliance;

  const filteredConfig: MLSComplianceConfig = {
    ...baseConfig,
    maxDescriptionLength: maxDescLength,
    prohibitedTerms: baseConfig.prohibitedTerms.filter(
      (term) => activeCategories.includes(term.category)
    ),
  };

  return { enabled, config: filteredConfig, stateCode: stateCode.toUpperCase() };
}
