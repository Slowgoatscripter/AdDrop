import { MLSComplianceConfig } from '@/lib/types';
import { montanaCompliance } from './montana';
import { ohioCompliance } from './ohio';

/**
 * State compliance config registry.
 * Maps state codes to their MLSComplianceConfig.
 */
export const complianceConfigs: Record<string, MLSComplianceConfig> = {
  MT: montanaCompliance,
  OH: ohioCompliance,
};
