import type { ComplianceAgentResult } from './compliance'
import type { ListingData } from './listing'

// --- Test Properties (replaces ComplianceTestAd) ---

export interface ComplianceTestProperty {
  id: string
  name: string
  state: string
  listing_data: ListingData
  risk_category: string // e.g., 'economic-exclusion', 'religion-steering', 'clean'
  is_seed: boolean
  tags: string[]
  created_at: string
  created_by: string | null
}

// --- Snapshots ---

export interface PropertySnapshot {
  id: string
  property_id: string
  generated_text: Record<string, string> // platform -> text
  created_at: string
  approved: boolean
}

// --- Test Runs ---

export type TestRunMode = 'snapshot' | 'full-pipeline'

export interface ComplianceTestRun {
  id: string
  run_type: 'single-state' | 'full-suite'
  run_mode: TestRunMode
  state: string | null
  triggered_by: 'manual' | 'scheduled'
  run_by: string | null
  run_at: string
  duration_ms: number
  summary: RunSummary
  results: PropertyTestResult[]
  created_at: string
}

export interface RunSummary {
  totalProperties: number
  passed: number
  failed: number
  totalViolationsFound: number
  totalAutoFixes: number
  averageViolationsPerProperty: number
}

export interface PropertyTestResult {
  propertyId: string
  propertyName: string
  state: string
  riskCategory: string
  passed: boolean // final output is clean after auto-fix
  complianceResult: ComplianceAgentResult
  generatedText?: Record<string, string> // only in full-pipeline mode
  /** @deprecated Use qualitySuggestionsCount instead */
  qualityFixesApplied?: number // only in full-pipeline mode
  qualitySuggestionsCount?: number;
  regexFindingsCount?: number;
}

// --- Scanner ---

export interface ScanRequest {
  text: string
  state: string
  platform?: string
}

export interface ScanResponse {
  violations: ComplianceAgentResult['violations']
  autoFixes: ComplianceAgentResult['autoFixes']
  verdict: ComplianceAgentResult['campaignVerdict']
  summary: {
    total: number
    hard: number
    soft: number
    autoFixed: number
  }
}

// --- API Request/Response ---

export interface RunRequest {
  state?: string
  mode: TestRunMode
}

export interface RunResponse {
  runId: string
  summary: RunSummary
  results: PropertyTestResult[]
  durationMs: number
}
