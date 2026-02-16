// Re-export all client-safe engine functions
export {
  findQualityIssues,
  checkPlatformFormat,
  checkFormattingAbuse,
  checkAllPlatformQuality,
  extractPlatformTexts,
} from './engine';

// Re-export rules
export { formattingRules, platformFormats } from './rules';

// Re-export server-only doc loader
export { loadQualityDocs, buildQualityCheatSheet } from './docs';

// Re-export AI scorer
export { scoreAllPlatformQuality, mergeQualityResults } from './scorer';

// Re-export auto-fix
export { autoFixQuality, autoFixTextRegex } from './auto-fix';
