export type QualityCategory =
  | 'platform-format'
  | 'cta-effectiveness'
  | 'anti-pattern'
  | 'power-avoid-words'
  | 'formatting'
  | 'hook-strength'
  | 'specificity'
  | 'feature-to-benefit'
  | 'tone-consistency'
  | 'variation-redundancy'
  | 'platform-optimization'
  | 'demographic-fit'
  | 'property-type-fit'
  | 'emotional-triggers';

export type QualityPriority = 'required' | 'recommended';

/** Regex rule unit — mirrors ProhibitedTerm from compliance */
export interface QualityRule {
  pattern: string;
  category: QualityCategory;
  priority: QualityPriority;
  shortExplanation: string;
  suggestedFix: string;
  platforms?: string[];
  subcategory?: string;
}

/** AI scoring result per category per platform */
export interface QualityScore {
  category: QualityCategory;
  platform: string;
  score: number;
  priority: QualityPriority;
  issue?: string;
  suggestedFix?: string;
  context?: string;
}

/** Unified issue format (both regex and AI produce these) */
export interface QualityIssue {
  platform: string;
  category: QualityCategory;
  priority: QualityPriority;
  source: 'regex' | 'ai';
  issue: string;
  suggestedFix: string;
  context?: string;
  score?: number;
  originalText?: string;
  fixedText?: string;
}

/** Per-platform result */
export interface PlatformQualityResult {
  platform: string;
  issues: QualityIssue[];
  passed: boolean;
}

/** Campaign-wide result */
export interface CampaignQualityResult {
  platforms: PlatformQualityResult[];
  totalChecks: number;
  totalPassed: number;
  requiredIssues: number;
  recommendedIssues: number;
  allPassed: boolean;
  overallScore?: number;
  improvementsApplied: number;
}

/** Platform format constraints */
export interface PlatformFormat {
  maxChars?: number;
  truncationPoint?: number;
  maxHashtags?: number;
  minHashtags?: number;
  requiresCTA: boolean;
}
