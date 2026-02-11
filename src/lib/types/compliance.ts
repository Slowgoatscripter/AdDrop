export type ViolationCategory =
  | 'steering'
  | 'familial-status'
  | 'disability'
  | 'race-color-national-origin'
  | 'religion'
  | 'sex-gender'
  | 'age'
  | 'marital-status'
  | 'political-beliefs'
  | 'economic-exclusion'
  | 'misleading-claims';

export type ViolationSeverity = 'hard' | 'soft';

export interface ProhibitedTerm {
  term: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  shortExplanation: string;
  law: string;
  suggestedAlternative: string;
}

export interface MLSComplianceConfig {
  state: string;
  mlsName: string;
  rules: string[];
  requiredDisclosures: string[];
  prohibitedTerms: ProhibitedTerm[];
  maxDescriptionLength?: number;
  docPaths?: {
    federal: string[];
    state: string[];
    industry: string[];
  };
}

export interface ComplianceViolation {
  platform: string;
  term: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  explanation: string;
  law: string;
  alternative: string;
  context: string;
}

export interface PlatformComplianceResult {
  platform: string;
  violations: ComplianceViolation[];
  passed: boolean;
  hardCount: number;
  softCount: number;
}

export interface CampaignComplianceResult {
  platforms: PlatformComplianceResult[];
  totalChecks: number;
  totalPassed: number;
  hardViolations: number;
  softWarnings: number;
  allPassed: boolean;
}
