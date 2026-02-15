import type { ViolationCategory, ViolationSeverity, ComplianceViolation } from './compliance'

// --- Database row types ---

export interface ComplianceTestAd {
  id: string
  state: string
  name: string
  text: string
  expected_violations: ExpectedViolation[]
  is_clean: boolean
  tags: string[]
  source: string
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ExpectedViolation {
  term: string
  category: ViolationCategory
  severity: ViolationSeverity
}

export interface ComplianceTestRun {
  id: string
  run_type: 'single-state' | 'full-suite' | 'ad-hoc'
  state: string | null
  triggered_by: 'manual' | 'scheduled'
  run_by: string | null
  run_at: string
  duration_ms: number | null
  summary: RunSummary
  results: AdTestResult[]
  cross_state: CrossStateResult[] | null
  created_at: string
}

export interface RunSummary {
  totalAds: number
  passed: number
  failed: number
  falsePositives: number
  missedViolations: number
  coverage: CategoryCoverage[]
}

export interface CategoryCoverage {
  category: ViolationCategory
  testAdCount: number
  covered: boolean
}

export interface AdTestResult {
  adId: string
  adName: string
  state: string
  passed: boolean
  expectedViolations: ExpectedViolation[]
  actualViolations: ComplianceViolation[]
  mismatches: ViolationMismatch[]
}

export interface ViolationMismatch {
  type: 'false-positive' | 'missed'
  term: string
  category: ViolationCategory
  severity: ViolationSeverity
}

export interface CrossStateResult {
  adId: string
  adName: string
  adState: string
  testedAgainst: string
  stateLeaks: ComplianceViolation[]
  passed: boolean
}

export interface ScanRequest {
  text: string
  state: string
  platform?: string
}

export interface ScanResponse {
  violations: ComplianceViolation[]
  summary: {
    total: number
    hard: number
    soft: number
  }
  layerBreakdown: {
    state: ComplianceViolation[]
    federal: ComplianceViolation[]
    industry: ComplianceViolation[]
  }
}

export interface RunRequest {
  state?: string
}

export interface RunResponse {
  runId: string
  summary: RunSummary
  results: AdTestResult[]
  crossState: CrossStateResult[]
  durationMs: number
}
