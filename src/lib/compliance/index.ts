// Compliance agent (server-only)
export { checkComplianceWithAgent, scanTextWithAgent } from './agent'

// Shared utilities
export { extractPlatformTexts } from './utils'

// Docs loader (server-only)
export { loadComplianceDocs } from './docs'

// Terms data
export { montanaCompliance } from './terms/montana'
export { ohioCompliance } from './terms/ohio'
export { complianceConfigs } from './terms/registry'
export { formatTermsForPrompt } from './utils'
