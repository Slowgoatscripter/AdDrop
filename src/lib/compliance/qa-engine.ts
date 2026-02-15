import type { ComplianceViolation } from '@/lib/types/compliance'
import type {
  ExpectedViolation,
  ViolationMismatch,
  CrossStateResult,
  ScanResponse,
  RunSummary,
  AdTestResult,
  CategoryCoverage,
} from '@/lib/types/compliance-qa'
import { findViolations, getComplianceConfig } from './engine'
import type { ViolationCategory } from '@/lib/types/compliance'

export function classifyViolationLayer(law: string): 'state' | 'federal' | 'industry' {
  if (/\bMCA\b/.test(law)) return 'state'
  if (/\bORC\b/.test(law)) return 'state'
  if (/\bOAC\b/.test(law)) return 'state'
  if (/\bARM\b/.test(law)) return 'state'
  if (/\bNAR\b/.test(law)) return 'industry'
  return 'federal'
}

export function compareViolations(
  expected: ExpectedViolation[],
  actual: ComplianceViolation[]
): { passed: boolean; mismatches: ViolationMismatch[] } {
  const mismatches: ViolationMismatch[] = []

  for (const exp of expected) {
    const found = actual.some(
      (a) => a.term.toLowerCase() === exp.term.toLowerCase() && a.category === exp.category
    )
    if (!found) {
      mismatches.push({ type: 'missed', term: exp.term, category: exp.category, severity: exp.severity })
    }
  }

  for (const act of actual) {
    const wasExpected = expected.some(
      (e) => e.term.toLowerCase() === act.term.toLowerCase() && e.category === act.category
    )
    if (!wasExpected) {
      mismatches.push({ type: 'false-positive', term: act.term, category: act.category, severity: act.severity })
    }
  }

  return { passed: mismatches.length === 0, mismatches }
}

export function runCrossStateIsolation(
  violations: ComplianceViolation[],
  adState: string,
  testedAgainst: string
): Pick<CrossStateResult, 'stateLeaks' | 'passed'> {
  const stateLeaks = violations.filter((v) => classifyViolationLayer(v.law) === 'state')
  return { stateLeaks, passed: stateLeaks.length === 0 }
}

export function scanAd(
  text: string,
  stateCode: string,
  platform: string = 'general'
): ScanResponse | null {
  const config = getComplianceConfig(stateCode)
  if (!config) return null

  const violations = findViolations(text, platform, config)

  const state: ComplianceViolation[] = []
  const federal: ComplianceViolation[] = []
  const industry: ComplianceViolation[] = []

  for (const v of violations) {
    const layer = classifyViolationLayer(v.law)
    if (layer === 'state') state.push(v)
    else if (layer === 'industry') industry.push(v)
    else federal.push(v)
  }

  return {
    violations,
    summary: {
      total: violations.length,
      hard: violations.filter((v) => v.severity === 'hard').length,
      soft: violations.filter((v) => v.severity === 'soft').length,
    },
    layerBreakdown: { state, federal, industry },
  }
}

export function runTestSuite(
  ads: Array<{
    id: string
    name: string
    state: string
    text: string
    expected_violations: ExpectedViolation[]
    is_clean: boolean
  }>
): { results: AdTestResult[]; summary: RunSummary } {
  const results: AdTestResult[] = []

  for (const ad of ads) {
    const config = getComplianceConfig(ad.state)
    if (!config) continue

    const actual = findViolations(ad.text, 'general', config)
    const { passed, mismatches } = compareViolations(ad.expected_violations, actual)

    results.push({
      adId: ad.id,
      adName: ad.name,
      state: ad.state,
      passed,
      expectedViolations: ad.expected_violations,
      actualViolations: actual,
      mismatches,
    })
  }

  const allCategories: ViolationCategory[] = [
    'steering', 'familial-status', 'disability', 'race-color-national-origin',
    'religion', 'sex-gender', 'age', 'marital-status', 'political-beliefs',
    'economic-exclusion', 'misleading-claims',
  ]

  const coveredCategories = new Set(
    ads.flatMap((a) => a.expected_violations.map((v) => v.category))
  )

  const coverage: CategoryCoverage[] = allCategories.map((cat) => ({
    category: cat,
    testAdCount: ads.filter((a) => a.expected_violations.some((v) => v.category === cat)).length,
    covered: coveredCategories.has(cat),
  }))

  const summary: RunSummary = {
    totalAds: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    falsePositives: results.reduce((sum, r) => sum + r.mismatches.filter((m) => m.type === 'false-positive').length, 0),
    missedViolations: results.reduce((sum, r) => sum + r.mismatches.filter((m) => m.type === 'missed').length, 0),
    coverage,
  }

  return { results, summary }
}

export function runIsolationChecks(
  ads: Array<{ id: string; name: string; state: string; text: string }>,
  availableStates: string[]
): CrossStateResult[] {
  const results: CrossStateResult[] = []

  for (const ad of ads) {
    const otherStates = availableStates.filter((s) => s !== ad.state)

    for (const otherState of otherStates) {
      const config = getComplianceConfig(otherState)
      if (!config) continue

      const violations = findViolations(ad.text, 'general', config)
      const { stateLeaks, passed } = runCrossStateIsolation(violations, ad.state, otherState)

      results.push({
        adId: ad.id,
        adName: ad.name,
        adState: ad.state,
        testedAgainst: otherState,
        stateLeaks,
        passed,
      })
    }
  }

  return results
}
