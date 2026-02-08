import { MLSComplianceConfig } from '@/lib/types';
import { montanaCompliance } from './montana';

const complianceConfigs: Record<string, MLSComplianceConfig> = {
  MT: montanaCompliance,
};

export function getComplianceConfig(stateCode: string): MLSComplianceConfig | null {
  return complianceConfigs[stateCode.toUpperCase()] ?? null;
}

export function getDefaultCompliance(): MLSComplianceConfig {
  return montanaCompliance;
}

export function checkCompliance(
  text: string,
  config: MLSComplianceConfig
): { passed: boolean; rule: string; detail?: string }[] {
  const results: { passed: boolean; rule: string; detail?: string }[] = [];

  for (const term of config.prohibitedTerms) {
    const found = text.toLowerCase().includes(term.toLowerCase());
    results.push({
      passed: !found,
      rule: `No prohibited term: "${term}"`,
      detail: found ? `Found "${term}" in description` : undefined,
    });
  }

  if (config.maxDescriptionLength) {
    const withinLimit = text.length <= config.maxDescriptionLength;
    results.push({
      passed: withinLimit,
      rule: `Max ${config.maxDescriptionLength} characters`,
      detail: withinLimit
        ? undefined
        : `Description is ${text.length} characters (${text.length - config.maxDescriptionLength} over limit)`,
    });
  }

  return results;
}
