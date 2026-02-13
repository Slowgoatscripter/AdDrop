// Re-export all client-safe engine functions
export {
  getComplianceConfig,
  getDefaultCompliance,
  findViolations,
  checkAllPlatforms,
  autoFixText,
  autoFixCampaign,
  checkCompliance,
  buildTermRegex,
} from './engine';

// Server-only: import getComplianceSettings directly from '@/lib/compliance/compliance-settings'
// (uses next/headers — cannot be barrel-exported without contaminating client bundles)

// Re-export server-only doc loader (uses fs, safe for Node/test but not client bundles)
export { loadComplianceDocs } from './docs';
