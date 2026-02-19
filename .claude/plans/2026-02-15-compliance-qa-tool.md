# Compliance QA Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a database-backed compliance QA tool into the admin panel that lets admins test, validate, and monitor the compliance engine across states.

**Architecture:** New admin page at `/admin/compliance-qa` with four tab views (Ad Hoc Scanner, Corpus Manager, Suite Runner, Scorecard). Two Supabase tables for test ads and run history. Server-side API routes for scanning and suite execution. Cross-state isolation uses citation-based detection.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), shadcn/ui, Jest, gold accent theme

**Design Doc:** `.claude/plans/compliance-qa-tool-design.md`

---

## Task 1: Database Migration — Create Tables

**Files:**
- Create: `supabase/migrations/20260215_create_compliance_qa_tables.sql`

**Step 1: Write the migration**

```sql
-- Compliance QA: Test corpus and run history tables

-- Test ads corpus
CREATE TABLE IF NOT EXISTS compliance_test_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  name text NOT NULL,
  text text NOT NULL,
  expected_violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_clean boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE compliance_test_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view test ads"
  ON compliance_test_ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can create test ads"
  ON compliance_test_ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update test ads"
  ON compliance_test_ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete test ads"
  ON compliance_test_ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Test run history
CREATE TABLE IF NOT EXISTS compliance_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('single-state', 'full-suite', 'ad-hoc')),
  state text,
  triggered_by text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled')),
  run_by uuid REFERENCES auth.users(id),
  run_at timestamptz DEFAULT now(),
  duration_ms integer,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  cross_state jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view test runs"
  ON compliance_test_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can create test runs"
  ON compliance_test_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for common queries
CREATE INDEX idx_compliance_test_ads_state ON compliance_test_ads(state);
CREATE INDEX idx_compliance_test_runs_state ON compliance_test_runs(state);
CREATE INDEX idx_compliance_test_runs_run_at ON compliance_test_runs(run_at DESC);
```

**Step 2: Apply migration**

Run: `npx supabase db push` (or apply via Supabase dashboard SQL editor)
Expected: Tables created, RLS enabled, policies active

**Step 3: Commit**

```bash
git add supabase/migrations/20260215_create_compliance_qa_tables.sql
git commit -m "feat: add compliance QA tables (test_ads + test_runs)"
```

---

## Task 2: TypeScript Types for QA Tool

**Files:**
- Create: `src/lib/types/compliance-qa.ts`
- Modify: `src/lib/types/index.ts` (add export)

**Step 1: Write the types**

Create `src/lib/types/compliance-qa.ts`:

```typescript
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

// --- Result types ---

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

// --- API request/response types ---

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
```

**Step 2: Add export to barrel file**

In `src/lib/types/index.ts`, add:

```typescript
export * from './compliance-qa'
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/types/compliance-qa.ts src/lib/types/index.ts
git commit -m "feat: add TypeScript types for compliance QA tool"
```

---

## Task 3: QA Engine — Core Test Logic

**Files:**
- Create: `src/lib/compliance/qa-engine.ts`
- Test: `src/lib/compliance/qa-engine.test.ts`

**Step 1: Write failing tests**

Create `src/lib/compliance/qa-engine.test.ts`:

```typescript
import {
  compareViolations,
  classifyViolationLayer,
  runCrossStateIsolation,
} from './qa-engine'
import type { ExpectedViolation } from '@/lib/types/compliance-qa'
import type { ComplianceViolation } from '@/lib/types/compliance'

describe('QA Engine', () => {
  describe('classifyViolationLayer', () => {
    it('classifies federal citations as federal', () => {
      expect(classifyViolationLayer('42 U.S.C. § 3604(c)')).toBe('federal')
    })

    it('classifies Montana citations as state', () => {
      expect(classifyViolationLayer('MCA § 49-2-305')).toBe('state')
    })

    it('classifies Ohio citations as state', () => {
      expect(classifyViolationLayer('ORC §4112.02(H)')).toBe('state')
    })

    it('classifies NAR citations as industry', () => {
      expect(classifyViolationLayer('NAR Code of Ethics Art. 10')).toBe('industry')
    })

    it('classifies unknown citations as federal (safe default)', () => {
      expect(classifyViolationLayer('some other citation')).toBe('federal')
    })
  })

  describe('compareViolations', () => {
    const makeViolation = (term: string, category: string, severity: string): ComplianceViolation => ({
      platform: 'general',
      term,
      category: category as any,
      severity: severity as any,
      explanation: '',
      law: '',
      alternative: '',
      context: '',
    })

    it('returns passed=true when actual matches expected', () => {
      const expected: ExpectedViolation[] = [
        { term: 'no veterans', category: 'military-status', severity: 'hard' },
      ]
      const actual = [makeViolation('no veterans', 'military-status', 'hard')]
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(true)
      expect(result.mismatches).toHaveLength(0)
    })

    it('detects false positives (found but not expected)', () => {
      const expected: ExpectedViolation[] = []
      const actual = [makeViolation('restricted', 'steering', 'soft')]
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(false)
      expect(result.mismatches).toHaveLength(1)
      expect(result.mismatches[0].type).toBe('false-positive')
    })

    it('detects missed violations (expected but not found)', () => {
      const expected: ExpectedViolation[] = [
        { term: 'no veterans', category: 'military-status', severity: 'hard' },
      ]
      const actual: ComplianceViolation[] = []
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(false)
      expect(result.mismatches).toHaveLength(1)
      expect(result.mismatches[0].type).toBe('missed')
    })

    it('matches case-insensitively on term', () => {
      const expected: ExpectedViolation[] = [
        { term: 'No Veterans', category: 'military-status', severity: 'hard' },
      ]
      const actual = [makeViolation('no veterans', 'military-status', 'hard')]
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(true)
    })
  })

  describe('runCrossStateIsolation', () => {
    it('identifies state-specific violations as leaks in other states', () => {
      const violations = [
        { ...makeViolation('no veterans', 'military-status', 'hard'), law: 'ORC §4112.02(H)' },
      ]
      const result = runCrossStateIsolation(violations, 'OH', 'MT')
      expect(result.stateLeaks).toHaveLength(1)
      expect(result.passed).toBe(false)
    })

    it('ignores federal violations (expected to fire everywhere)', () => {
      const violations = [
        { ...makeViolation('no handicapped', 'disability', 'hard'), law: '42 U.S.C. § 3604(c)' },
      ]
      const result = runCrossStateIsolation(violations, 'OH', 'MT')
      expect(result.stateLeaks).toHaveLength(0)
      expect(result.passed).toBe(true)
    })
  })
})

function makeViolation(term: string, category: string, severity: string): ComplianceViolation {
  return {
    platform: 'general',
    term,
    category: category as any,
    severity: severity as any,
    explanation: '',
    law: '',
    alternative: '',
    context: '',
  }
}
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/compliance/qa-engine.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Implement the QA engine**

Create `src/lib/compliance/qa-engine.ts`:

```typescript
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

/**
 * Classify a violation's law citation into state/federal/industry layer.
 */
export function classifyViolationLayer(law: string): 'state' | 'federal' | 'industry' {
  // State law patterns
  if (/\bMCA\b/.test(law)) return 'state'        // Montana
  if (/\bORC\b/.test(law)) return 'state'         // Ohio
  if (/\bOAC\b/.test(law)) return 'state'         // Ohio Admin Code
  if (/\bARM\b/.test(law)) return 'state'         // Montana Admin Rules

  // Industry patterns
  if (/\bNAR\b/.test(law)) return 'industry'

  // Federal is the safe default (42 U.S.C., Fair Housing Act, etc.)
  return 'federal'
}

/**
 * Compare expected violations against actual violations found by the engine.
 * Returns pass/fail and a list of mismatches.
 */
export function compareViolations(
  expected: ExpectedViolation[],
  actual: ComplianceViolation[]
): { passed: boolean; mismatches: ViolationMismatch[] } {
  const mismatches: ViolationMismatch[] = []

  // Check for missed violations (expected but not found)
  for (const exp of expected) {
    const found = actual.some(
      (a) =>
        a.term.toLowerCase() === exp.term.toLowerCase() &&
        a.category === exp.category
    )
    if (!found) {
      mismatches.push({
        type: 'missed',
        term: exp.term,
        category: exp.category,
        severity: exp.severity,
      })
    }
  }

  // Check for false positives (found but not expected)
  for (const act of actual) {
    const wasExpected = expected.some(
      (e) =>
        e.term.toLowerCase() === act.term.toLowerCase() &&
        e.category === act.category
    )
    if (!wasExpected) {
      mismatches.push({
        type: 'false-positive',
        term: act.term,
        category: act.category,
        severity: act.severity,
      })
    }
  }

  return {
    passed: mismatches.length === 0,
    mismatches,
  }
}

/**
 * Check if violations from running a test ad through another state's engine
 * contain state-specific leaks (state law terms that shouldn't fire).
 */
export function runCrossStateIsolation(
  violations: ComplianceViolation[],
  adState: string,
  testedAgainst: string
): Pick<CrossStateResult, 'stateLeaks' | 'passed'> {
  const stateLeaks = violations.filter(
    (v) => classifyViolationLayer(v.law) === 'state'
  )
  return {
    stateLeaks,
    passed: stateLeaks.length === 0,
  }
}

/**
 * Scan a single ad text and return structured results with layer breakdown.
 */
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

/**
 * Run the test suite for a set of test ads. Returns per-ad results and overall summary.
 */
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

  // Build category coverage
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
    testAdCount: ads.filter((a) =>
      a.expected_violations.some((v) => v.category === cat)
    ).length,
    covered: coveredCategories.has(cat),
  }))

  const summary: RunSummary = {
    totalAds: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    falsePositives: results.reduce(
      (sum, r) => sum + r.mismatches.filter((m) => m.type === 'false-positive').length,
      0
    ),
    missedViolations: results.reduce(
      (sum, r) => sum + r.mismatches.filter((m) => m.type === 'missed').length,
      0
    ),
    coverage,
  }

  return { results, summary }
}

/**
 * Run cross-state isolation checks for a set of test ads.
 * Tests each ad against all OTHER configured states.
 */
export function runIsolationChecks(
  ads: Array<{
    id: string
    name: string
    state: string
    text: string
  }>,
  availableStates: string[]
): CrossStateResult[] {
  const results: CrossStateResult[] = []

  for (const ad of ads) {
    const otherStates = availableStates.filter((s) => s !== ad.state)

    for (const otherState of otherStates) {
      const config = getComplianceConfig(otherState)
      if (!config) continue

      const violations = findViolations(ad.text, 'general', config)
      const { stateLeaks, passed } = runCrossStateIsolation(
        violations,
        ad.state,
        otherState
      )

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
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/compliance/qa-engine.test.ts --no-coverage`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/lib/compliance/qa-engine.ts src/lib/compliance/qa-engine.test.ts
git commit -m "feat: add compliance QA engine with comparison and isolation logic"
```

---

## Task 4: API Routes — Scan and Corpus CRUD

**Files:**
- Create: `src/app/api/admin/compliance-qa/scan/route.ts`
- Create: `src/app/api/admin/compliance-qa/corpus/route.ts`
- Create: `src/app/api/admin/compliance-qa/corpus/[id]/route.ts`

**Step 1: Create scan route**

Create `src/app/api/admin/compliance-qa/scan/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { scanAd } from '@/lib/compliance/qa-engine'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { text, state, platform } = body

    if (!text || !state) {
      return NextResponse.json(
        { error: 'text and state are required' },
        { status: 400 }
      )
    }

    const result = scanAd(text, state.toUpperCase(), platform || 'general')

    if (!result) {
      return NextResponse.json(
        { error: `No compliance config found for state: ${state}` },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[compliance-qa/scan] Error:', error)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
```

**Step 2: Create corpus CRUD route**

Create `src/app/api/admin/compliance-qa/corpus/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAuth()
    if (authError) return authError

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const isClean = searchParams.get('is_clean')

    let query = supabase
      .from('compliance_test_ads')
      .select('*')
      .order('created_at', { ascending: false })

    if (state) query = query.eq('state', state.toUpperCase())
    if (isClean !== null && isClean !== undefined) {
      query = query.eq('is_clean', isClean === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('[compliance-qa/corpus] GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch corpus' }, { status: 500 })
    }

    return NextResponse.json({ ads: data })
  } catch (error) {
    console.error('[compliance-qa/corpus] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch corpus' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const supabase = await createClient()
    const body = await request.json()

    const { state, name, text, expected_violations, is_clean, tags, source } = body

    if (!state || !name || !text) {
      return NextResponse.json(
        { error: 'state, name, and text are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('compliance_test_ads')
      .insert({
        state: state.toUpperCase(),
        name,
        text,
        expected_violations: expected_violations || [],
        is_clean: is_clean || false,
        tags: tags || [],
        source: source || 'manual',
        created_by: user!.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[compliance-qa/corpus] POST error:', error)
      return NextResponse.json({ error: 'Failed to save test ad' }, { status: 500 })
    }

    return NextResponse.json({ ad: data }, { status: 201 })
  } catch (error) {
    console.error('[compliance-qa/corpus] Error:', error)
    return NextResponse.json({ error: 'Failed to save test ad' }, { status: 500 })
  }
}
```

**Step 3: Create corpus single-item route**

Create `src/app/api/admin/compliance-qa/corpus/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAuth()
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('compliance_test_ads')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[compliance-qa/corpus] PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update test ad' }, { status: 500 })
    }

    return NextResponse.json({ ad: data })
  } catch (error) {
    console.error('[compliance-qa/corpus] Error:', error)
    return NextResponse.json({ error: 'Failed to update test ad' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError } = await requireAuth()
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('compliance_test_ads')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[compliance-qa/corpus] DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete test ad' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[compliance-qa/corpus] Error:', error)
    return NextResponse.json({ error: 'Failed to delete test ad' }, { status: 500 })
  }
}
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/api/admin/compliance-qa/
git commit -m "feat: add compliance QA API routes (scan + corpus CRUD)"
```

---

## Task 5: API Routes — Suite Runner and Run History

**Files:**
- Create: `src/app/api/admin/compliance-qa/run/route.ts`
- Create: `src/app/api/admin/compliance-qa/runs/route.ts`

**Step 1: Create suite run route**

Create `src/app/api/admin/compliance-qa/run/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { runTestSuite, runIsolationChecks } from '@/lib/compliance/qa-engine'
import { getComplianceConfig } from '@/lib/compliance'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    const { state } = body
    const startTime = Date.now()

    // Fetch test ads from corpus
    let query = supabase.from('compliance_test_ads').select('*')
    if (state) query = query.eq('state', state.toUpperCase())

    const { data: ads, error: fetchError } = await query

    if (fetchError) {
      console.error('[compliance-qa/run] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch test ads' }, { status: 500 })
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json(
        { error: 'No test ads found' + (state ? ` for state: ${state}` : '') },
        { status: 404 }
      )
    }

    // Determine available states (states that have a compliance config)
    const statesInCorpus = [...new Set(ads.map((a) => a.state))]
    const availableStates = statesInCorpus.filter((s) => getComplianceConfig(s) !== null)

    // Run the test suite
    const { results, summary } = runTestSuite(ads)

    // Run cross-state isolation (only if 2+ states available)
    const crossState =
      availableStates.length >= 2
        ? runIsolationChecks(ads, availableStates)
        : []

    const durationMs = Date.now() - startTime

    // Store the run
    const { data: run, error: insertError } = await supabase
      .from('compliance_test_runs')
      .insert({
        run_type: state ? 'single-state' : 'full-suite',
        state: state ? state.toUpperCase() : null,
        triggered_by: 'manual',
        run_by: user!.id,
        duration_ms: durationMs,
        summary,
        results,
        cross_state: crossState.length > 0 ? crossState : null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[compliance-qa/run] Insert error:', insertError)
      // Still return results even if storage fails
    }

    return NextResponse.json({
      runId: run?.id || null,
      summary,
      results,
      crossState,
      durationMs,
    })
  } catch (error) {
    console.error('[compliance-qa/run] Error:', error)
    return NextResponse.json({ error: 'Suite run failed' }, { status: 500 })
  }
}
```

**Step 2: Create run history route**

Create `src/app/api/admin/compliance-qa/runs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAuth()
    if (authError) return authError

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let query = supabase
      .from('compliance_test_runs')
      .select('id, run_type, state, triggered_by, run_at, duration_ms, summary, cross_state')
      .order('run_at', { ascending: false })
      .limit(limit)

    if (state) query = query.eq('state', state.toUpperCase())

    const { data, error } = await query

    if (error) {
      console.error('[compliance-qa/runs] GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
    }

    return NextResponse.json({ runs: data })
  } catch (error) {
    console.error('[compliance-qa/runs] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
  }
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/admin/compliance-qa/run/ src/app/api/admin/compliance-qa/runs/
git commit -m "feat: add compliance QA suite runner and run history API routes"
```

---

## Task 6: Admin Page Shell and Navigation

**Files:**
- Create: `src/app/admin/compliance-qa/page.tsx`
- Create: `src/components/admin/compliance-qa/qa-tabs.tsx`
- Modify: `src/components/admin/sidebar.tsx` (add nav item)

**Step 1: Create the page**

Create `src/app/admin/compliance-qa/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { QATabs } from '@/components/admin/compliance-qa/qa-tabs'

export default async function ComplianceQAPage() {
  const supabase = await createClient()

  // Fetch initial data for all tabs
  const [{ data: ads }, { data: runs }] = await Promise.all([
    supabase
      .from('compliance_test_ads')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('compliance_test_runs')
      .select('id, run_type, state, triggered_by, run_at, duration_ms, summary, cross_state')
      .order('run_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Compliance QA</h1>
      <QATabs initialAds={ads || []} initialRuns={runs || []} />
    </div>
  )
}
```

**Step 2: Create tab shell component**

Create `src/components/admin/compliance-qa/qa-tabs.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { FlaskConical, Database, Play, BarChart3 } from 'lucide-react'
import type { ComplianceTestAd, ComplianceTestRun } from '@/lib/types/compliance-qa'

const tabs = [
  { id: 'scanner', label: 'Ad Hoc Scanner', icon: FlaskConical },
  { id: 'corpus', label: 'Test Corpus', icon: Database },
  { id: 'runner', label: 'Suite Runner', icon: Play },
  { id: 'scorecard', label: 'Scorecard', icon: BarChart3 },
] as const

type TabId = (typeof tabs)[number]['id']

interface QATabsProps {
  initialAds: ComplianceTestAd[]
  initialRuns: ComplianceTestRun[]
}

export function QATabs({ initialAds, initialRuns }: QATabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scanner')
  const [ads, setAds] = useState(initialAds)
  const [runs, setRuns] = useState(initialRuns)

  const refreshAds = async () => {
    const res = await fetch('/api/admin/compliance-qa/corpus')
    if (res.ok) {
      const data = await res.json()
      setAds(data.ads)
    }
  }

  const refreshRuns = async () => {
    const res = await fetch('/api/admin/compliance-qa/runs')
    if (res.ok) {
      const data = await res.json()
      setRuns(data.runs)
    }
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'scanner' && (
        <div className="text-muted-foreground text-sm">Scanner view — Task 7</div>
      )}
      {activeTab === 'corpus' && (
        <div className="text-muted-foreground text-sm">Corpus view — Task 8</div>
      )}
      {activeTab === 'runner' && (
        <div className="text-muted-foreground text-sm">Runner view — Task 9</div>
      )}
      {activeTab === 'scorecard' && (
        <div className="text-muted-foreground text-sm">Scorecard view — Task 10</div>
      )}
    </div>
  )
}
```

**Step 3: Add nav item to sidebar**

In `src/components/admin/sidebar.tsx`, add to the `navItems` array:

```typescript
{ href: '/admin/compliance-qa', label: 'Compliance QA', icon: FlaskConical },
```

Import `FlaskConical` from `lucide-react` if not already imported. Place after the Settings entry.

**Step 4: Verify it builds**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/admin/compliance-qa/ src/components/admin/compliance-qa/ src/components/admin/sidebar.tsx
git commit -m "feat: add compliance QA admin page shell with tab navigation"
```

---

## Task 7: Ad Hoc Scanner View

**Files:**
- Create: `src/components/admin/compliance-qa/scanner-view.tsx`
- Modify: `src/components/admin/compliance-qa/qa-tabs.tsx` (wire in)

**Step 1: Build the scanner component**

Create `src/components/admin/compliance-qa/scanner-view.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Search, Save, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { ScanResponse } from '@/lib/types/compliance-qa'
import type { ComplianceViolation } from '@/lib/types/compliance'

// Available states — will grow as states are added
const STATES = [
  { code: 'MT', name: 'Montana' },
]

interface ScannerViewProps {
  onSaveToCorpus: (ad: {
    state: string
    name: string
    text: string
    expected_violations: Array<{ term: string; category: string; severity: string }>
    is_clean: boolean
    tags: string[]
    source: string
  }) => Promise<void>
}

export function ScannerView({ onSaveToCorpus }: ScannerViewProps) {
  const [text, setText] = useState('')
  const [state, setState] = useState('MT')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Save-to-corpus form state
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [adName, setAdName] = useState('')
  const [adSource, setAdSource] = useState('manual')
  const [adTags, setAdTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Track which violations user has removed from expected (marking as false positive)
  const [excludedTerms, setExcludedTerms] = useState<Set<string>>(new Set())

  const handleScan = async () => {
    if (!text.trim()) return
    setScanning(true)
    setResult(null)
    setError(null)
    setShowSaveForm(false)
    setSaveSuccess(false)
    setExcludedTerms(new Set())

    try {
      const res = await fetch('/api/admin/compliance-qa/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, state }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Scan failed')
        return
      }

      setResult(await res.json())
    } catch {
      setError('Network error — scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    if (!adName.trim() || !result) return
    setSaving(true)

    const expectedViolations = result.violations
      .filter((v) => !excludedTerms.has(v.term))
      .map((v) => ({ term: v.term, category: v.category, severity: v.severity }))

    try {
      await onSaveToCorpus({
        state,
        name: adName,
        text,
        expected_violations: expectedViolations,
        is_clean: expectedViolations.length === 0,
        tags: adTags ? adTags.split(',').map((t) => t.trim()) : [],
        source: adSource,
      })
      setSaveSuccess(true)
      setShowSaveForm(false)
    } catch {
      setError('Failed to save to corpus')
    } finally {
      setSaving(false)
    }
  }

  const toggleExclude = (term: string) => {
    setExcludedTerms((prev) => {
      const next = new Set(prev)
      if (next.has(term)) next.delete(term)
      else next.add(term)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              Ad Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a real estate ad here..."
              rows={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-foreground">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleScan}
              disabled={scanning || !text.trim()}
              className="flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary banner */}
          {result.violations.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">
                Clean — no violations found
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">
                {result.summary.total} violation{result.summary.total !== 1 ? 's' : ''} found
                ({result.summary.hard} hard, {result.summary.soft} soft)
              </span>
            </div>
          )}

          {/* Layer breakdown */}
          {result.violations.length > 0 && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>State: {result.layerBreakdown.state.length}</span>
              <span>Federal: {result.layerBreakdown.federal.length}</span>
              <span>Industry: {result.layerBreakdown.industry.length}</span>
            </div>
          )}

          {/* Violations table */}
          {result.violations.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Term</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Severity</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Citation</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Context</th>
                    {showSaveForm && (
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Include</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.violations.map((v, i) => (
                    <tr key={i} className={excludedTerms.has(v.term) ? 'opacity-40' : ''}>
                      <td className="px-4 py-3 text-sm text-foreground font-mono">{v.term}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{v.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            v.severity === 'hard'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {v.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{v.law}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {v.context}
                      </td>
                      {showSaveForm && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExclude(v.term)}
                            className={`text-xs px-2 py-1 rounded ${
                              excludedTerms.has(v.term)
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {excludedTerms.has(v.term) ? 'Excluded' : 'Included'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Save to corpus */}
          {!saveSuccess && !showSaveForm && (
            <button
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted/50"
            >
              <Save className="w-4 h-4" />
              Save to Corpus
            </button>
          )}

          {showSaveForm && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Save to Test Corpus</h3>
              <p className="text-xs text-muted-foreground">
                Toggle violations above to exclude false positives from expected results.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Name</label>
                  <input
                    value={adName}
                    onChange={(e) => setAdName(e.target.value)}
                    placeholder="e.g., Montana clean suburban"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Source</label>
                  <input
                    value={adSource}
                    onChange={(e) => setAdSource(e.target.value)}
                    placeholder="e.g., zillow, manual"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Tags (comma-separated)</label>
                  <input
                    value={adTags}
                    onChange={(e) => setAdTags(e.target.value)}
                    placeholder="e.g., clean, suburban"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !adName.trim()}
                  className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold/90 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Saved to test corpus</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Wire into qa-tabs.tsx**

In `src/components/admin/compliance-qa/qa-tabs.tsx`, import and render:

```typescript
import { ScannerView } from './scanner-view'
```

Replace the scanner placeholder with:

```typescript
{activeTab === 'scanner' && (
  <ScannerView
    onSaveToCorpus={async (ad) => {
      const res = await fetch('/api/admin/compliance-qa/corpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ad),
      })
      if (!res.ok) throw new Error('Failed to save')
      await refreshAds()
    }}
  />
)}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/admin/compliance-qa/scanner-view.tsx src/components/admin/compliance-qa/qa-tabs.tsx
git commit -m "feat: add ad hoc scanner view with save-to-corpus flow"
```

---

## Task 8: Test Corpus Manager View

**Files:**
- Create: `src/components/admin/compliance-qa/corpus-view.tsx`
- Modify: `src/components/admin/compliance-qa/qa-tabs.tsx` (wire in)

**Step 1: Build the corpus manager**

Create `src/components/admin/compliance-qa/corpus-view.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Search, Trash2, Copy, Download, Upload, ChevronDown, ChevronRight } from 'lucide-react'
import type { ComplianceTestAd } from '@/lib/types/compliance-qa'

interface CorpusViewProps {
  ads: ComplianceTestAd[]
  onDelete: (id: string) => Promise<void>
  onDuplicate: (ad: ComplianceTestAd) => Promise<void>
  onRefresh: () => Promise<void>
}

export function CorpusView({ ads, onDelete, onDuplicate, onRefresh }: CorpusViewProps) {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [cleanFilter, setCleanFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Get unique states from corpus
  const states = [...new Set(ads.map((a) => a.state))].sort()

  // Filter ads
  const filtered = ads.filter((ad) => {
    if (stateFilter !== 'all' && ad.state !== stateFilter) return false
    if (cleanFilter === 'clean' && !ad.is_clean) return false
    if (cleanFilter === 'violations' && ad.is_clean) return false
    if (search && !ad.name.toLowerCase().includes(search.toLowerCase()) &&
        !ad.text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Stats
  const cleanCount = ads.filter((a) => a.is_clean).length
  const violationCount = ads.length - cleanCount
  const stateCounts = states.map((s) => `${s}: ${ads.filter((a) => a.state === s).length}`).join(', ')

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(ads, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-corpus-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        if (!Array.isArray(imported)) return

        for (const ad of imported) {
          await fetch('/api/admin/compliance-qa/corpus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state: ad.state,
              name: ad.name,
              text: ad.text,
              expected_violations: ad.expected_violations,
              is_clean: ad.is_clean,
              tags: ad.tags || [],
              source: ad.source || 'import',
            }),
          })
        }
        await onRefresh()
      } catch {
        // Silent fail on bad import
      }
    }
    input.click()
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await onDelete(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="text-sm text-muted-foreground">
        {ads.length} ads total — {stateCounts} — {cleanCount} clean, {violationCount} with violations
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or text..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={cleanFilter}
          onChange={(e) => setCleanFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All</option>
          <option value="clean">Clean Only</option>
          <option value="violations">With Violations</option>
        </select>
        <button
          onClick={handleImport}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-8 px-4 py-3"></th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">State</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Violations</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tags</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Source</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((ad) => (
              <>
                <tr key={ad.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button onClick={() => setExpandedId(expandedId === ad.id ? null : ad.id)}>
                      {expandedId === ad.id ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{ad.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {ad.state}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ad.is_clean
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {ad.is_clean ? 'Clean' : 'Violations'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {ad.expected_violations.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {ad.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{ad.source}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => onDuplicate(ad)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ad.id)}
                        disabled={deleting === ad.id}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === ad.id && (
                  <tr key={`${ad.id}-detail`}>
                    <td colSpan={8} className="px-8 py-4 bg-muted/20">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Ad Text</h4>
                          <p className="text-sm text-foreground whitespace-pre-wrap bg-background rounded p-3 border border-border">
                            {ad.text}
                          </p>
                        </div>
                        {ad.expected_violations.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Expected Violations</h4>
                            <div className="flex flex-wrap gap-2">
                              {ad.expected_violations.map((v, i) => (
                                <span key={i} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${
                                  v.severity === 'hard'
                                    ? 'bg-red-500/10 text-red-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {v.term} ({v.category})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {ads.length === 0 ? 'No test ads yet. Use the Scanner to add some.' : 'No ads match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: Wire into qa-tabs.tsx**

Import:
```typescript
import { CorpusView } from './corpus-view'
```

Replace corpus placeholder:
```typescript
{activeTab === 'corpus' && (
  <CorpusView
    ads={ads}
    onDelete={async (id) => {
      await fetch(`/api/admin/compliance-qa/corpus/${id}`, { method: 'DELETE' })
      await refreshAds()
    }}
    onDuplicate={async (ad) => {
      await fetch('/api/admin/compliance-qa/corpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: ad.state,
          name: `${ad.name} (copy)`,
          text: ad.text,
          expected_violations: ad.expected_violations,
          is_clean: ad.is_clean,
          tags: ad.tags,
          source: ad.source,
        }),
      })
      await refreshAds()
    }}
    onRefresh={refreshAds}
  />
)}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/admin/compliance-qa/corpus-view.tsx src/components/admin/compliance-qa/qa-tabs.tsx
git commit -m "feat: add test corpus manager view with filtering and import/export"
```

---

## Task 9: Suite Runner View

**Files:**
- Create: `src/components/admin/compliance-qa/runner-view.tsx`
- Modify: `src/components/admin/compliance-qa/qa-tabs.tsx` (wire in)

**Step 1: Build the runner component**

Create `src/components/admin/compliance-qa/runner-view.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Play, CheckCircle, XCircle, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import type { ComplianceTestAd, RunResponse, AdTestResult, CrossStateResult } from '@/lib/types/compliance-qa'

interface RunnerViewProps {
  ads: ComplianceTestAd[]
  onRunComplete: () => Promise<void>
}

export function RunnerView({ ads, onRunComplete }: RunnerViewProps) {
  const [running, setRunning] = useState<string | null>(null) // state code or 'all'
  const [result, setResult] = useState<RunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [showCrossState, setShowCrossState] = useState(false)

  // Get available states from corpus
  const states = [...new Set(ads.map((a) => a.state))].sort()

  const handleRun = async (state?: string) => {
    setRunning(state || 'all')
    setResult(null)
    setError(null)
    setExpandedResult(null)

    try {
      const res = await fetch('/api/admin/compliance-qa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state ? { state } : {}),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Run failed')
        return
      }

      setResult(await res.json())
      await onRunComplete()
    } catch {
      setError('Network error — run failed')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* State cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {states.map((s) => {
          const count = ads.filter((a) => a.state === s).length
          return (
            <button
              key={s}
              onClick={() => handleRun(s)}
              disabled={running !== null}
              className="rounded-lg border border-border bg-card p-4 text-left hover:border-gold/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-foreground">{s}</span>
                <Play className={`w-4 h-4 ${running === s ? 'text-gold animate-pulse' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-sm text-muted-foreground">{count} test ads</div>
            </button>
          )
        })}

        {/* Run All card */}
        <button
          onClick={() => handleRun()}
          disabled={running !== null || states.length === 0}
          className="rounded-lg border-2 border-dashed border-border bg-card/50 p-4 text-left hover:border-gold/50 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-foreground">All States</span>
            <Play className={`w-4 h-4 ${running === 'all' ? 'text-gold animate-pulse' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-sm text-muted-foreground">{ads.length} total ads</div>
        </button>
      </div>

      {states.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No test ads in corpus yet. Use the Scanner to add some first.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`rounded-lg border p-4 flex items-center justify-between ${
            result.summary.failed === 0
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            <div className="flex items-center gap-3">
              {result.summary.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`text-sm font-medium ${
                result.summary.failed === 0 ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {result.summary.passed}/{result.summary.totalAds} passed
                {result.summary.falsePositives > 0 && ` — ${result.summary.falsePositives} false positives`}
                {result.summary.missedViolations > 0 && ` — ${result.summary.missedViolations} missed`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{result.durationMs}ms</span>
          </div>

          {/* Per-ad results */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-8 px-4 py-3"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Test Ad</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">State</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Result</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expected</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actual</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Mismatches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.results.map((r) => (
                  <>
                    <tr key={r.adId} className={`hover:bg-muted/30 ${!r.passed ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        {r.mismatches.length > 0 && (
                          <button onClick={() => setExpandedResult(expandedResult === r.adId ? null : r.adId)}>
                            {expandedResult === r.adId ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.adName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {r.state}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.expectedViolations.length}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.actualViolations.length}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.mismatches.length}</td>
                    </tr>
                    {expandedResult === r.adId && r.mismatches.length > 0 && (
                      <tr key={`${r.adId}-detail`}>
                        <td colSpan={7} className="px-8 py-4 bg-muted/20">
                          <div className="space-y-2">
                            {r.mismatches.map((m, i) => (
                              <div key={i} className={`flex items-center gap-3 text-sm rounded p-2 ${
                                m.type === 'false-positive'
                                  ? 'bg-amber-500/10 text-amber-300'
                                  : 'bg-red-500/10 text-red-300'
                              }`}>
                                <span className="text-xs font-medium uppercase w-24">
                                  {m.type === 'false-positive' ? 'False +' : 'Missed'}
                                </span>
                                <span className="font-mono">{m.term}</span>
                                <span className="text-xs text-muted-foreground">({m.category}, {m.severity})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cross-state isolation */}
          {result.crossState && result.crossState.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setShowCrossState(!showCrossState)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Cross-State Isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  {result.crossState.every((r) => r.passed) ? (
                    <span className="text-xs text-emerald-400">All passed</span>
                  ) : (
                    <span className="text-xs text-red-400">
                      {result.crossState.filter((r) => !r.passed).length} leaks detected
                    </span>
                  )}
                  {showCrossState ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              {showCrossState && (
                <div className="border-t border-border divide-y divide-border">
                  {result.crossState.map((r, i) => (
                    <div key={i} className={`px-4 py-3 flex items-center justify-between text-sm ${
                      !r.passed ? 'bg-red-500/5' : ''
                    }`}>
                      <div>
                        <span className="text-foreground">{r.adName}</span>
                        <span className="text-muted-foreground"> ({r.adState} ad tested against {r.testedAgainst})</span>
                      </div>
                      <div>
                        {r.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-xs text-red-400">
                            {r.stateLeaks.length} state-specific leak{r.stateLeaks.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Wire into qa-tabs.tsx**

Import:
```typescript
import { RunnerView } from './runner-view'
```

Replace runner placeholder:
```typescript
{activeTab === 'runner' && (
  <RunnerView
    ads={ads}
    onRunComplete={refreshRuns}
  />
)}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/admin/compliance-qa/runner-view.tsx src/components/admin/compliance-qa/qa-tabs.tsx
git commit -m "feat: add suite runner view with cross-state isolation panel"
```

---

## Task 10: Scorecard Dashboard View

**Files:**
- Create: `src/components/admin/compliance-qa/scorecard-view.tsx`
- Modify: `src/components/admin/compliance-qa/qa-tabs.tsx` (wire in)

**Step 1: Build the scorecard component**

Create `src/components/admin/compliance-qa/scorecard-view.tsx`:

```typescript
'use client'

import { CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp } from 'lucide-react'
import type { ComplianceTestAd, ComplianceTestRun, RunSummary } from '@/lib/types/compliance-qa'

interface ScorecardViewProps {
  ads: ComplianceTestAd[]
  runs: ComplianceTestRun[]
}

function getStatusColor(passRate: number): { border: string; bg: string; text: string; icon: typeof CheckCircle } {
  if (passRate >= 95) return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle }
  if (passRate >= 80) return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangle }
  return { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', icon: XCircle }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ScorecardView({ ads, runs }: ScorecardViewProps) {
  const states = [...new Set(ads.map((a) => a.state))].sort()

  // Get latest run per state
  const latestRunByState = new Map<string, ComplianceTestRun>()
  for (const run of runs) {
    if (run.state && !latestRunByState.has(run.state)) {
      latestRunByState.set(run.state, run)
    }
  }

  // Latest full suite
  const latestFullSuite = runs.find((r) => r.run_type === 'full-suite')

  // Build per-state stats
  const stateStats = states.map((s) => {
    const stateAds = ads.filter((a) => a.state === s)
    const latestRun = latestRunByState.get(s)
    const summary = latestRun?.summary as RunSummary | undefined

    const totalAds = stateAds.length
    const passRate = summary ? Math.round((summary.passed / summary.totalAds) * 100) : null
    const coveredCategories = summary?.coverage?.filter((c) => c.covered).length ?? 0
    const totalCategories = summary?.coverage?.length ?? 0

    return {
      state: s,
      totalAds,
      passRate,
      coveredCategories,
      totalCategories,
      lastRun: latestRun?.run_at ?? null,
      summary,
    }
  })

  // Coverage gaps across all states
  const allGaps: Array<{ state: string; category: string }> = []
  for (const stat of stateStats) {
    if (stat.summary?.coverage) {
      for (const c of stat.summary.coverage) {
        if (!c.covered) {
          allGaps.push({ state: stat.state, category: c.category })
        }
      }
    }
  }

  // Trend data from recent runs
  const recentRuns = runs
    .filter((r) => r.run_type === 'full-suite' || r.run_type === 'single-state')
    .slice(0, 10)
    .reverse()

  return (
    <div className="space-y-6">
      {/* Overall banner */}
      {latestFullSuite ? (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">
              Last full suite: {formatTimeAgo(latestFullSuite.run_at)}
              {' — '}
              {(latestFullSuite.summary as RunSummary).passed}/{(latestFullSuite.summary as RunSummary).totalAds} passed
              {' across '}{states.length} state{states.length !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {latestFullSuite.triggered_by === 'scheduled' ? 'Scheduled' : 'Manual'}
          </span>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No full suite runs yet. Use the Suite Runner to run your first test.
        </div>
      )}

      {/* State health cards */}
      {stateStats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stateStats.map((stat) => {
            const status = stat.passRate !== null ? getStatusColor(stat.passRate) : null
            const StatusIcon = status?.icon ?? AlertTriangle

            return (
              <div
                key={stat.state}
                className={`rounded-lg border p-4 ${
                  status ? `${status.border} ${status.bg}` : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-foreground">{stat.state}</span>
                  {status && <StatusIcon className={`w-5 h-5 ${status.text}`} />}
                </div>

                {stat.passRate !== null ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pass Rate</span>
                      <span className={`font-medium ${status?.text ?? 'text-foreground'}`}>
                        {stat.passRate}%
                      </span>
                    </div>

                    {/* Pass rate bar */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stat.passRate >= 95 ? 'bg-emerald-500' :
                          stat.passRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stat.passRate}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{stat.totalAds} test ads</span>
                      <span>
                        {stat.coveredCategories}/{stat.totalCategories} categories
                      </span>
                    </div>

                    {stat.lastRun && (
                      <div className="text-xs text-muted-foreground">
                        Last run: {formatTimeAgo(stat.lastRun)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">{stat.totalAds} test ads</div>
                    <div className="text-xs text-muted-foreground">No runs yet</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-8">
          No test ads in corpus yet. Use the Scanner to add some first.
        </div>
      )}

      {/* Coverage gaps */}
      {allGaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <h3 className="text-sm font-medium text-amber-300 mb-2">Coverage Gaps</h3>
          <div className="space-y-1">
            {allGaps.map((g, i) => (
              <div key={i} className="text-xs text-amber-200/70">
                {g.state}: <span className="font-mono">{g.category}</span> has no test cases
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend */}
      {recentRuns.length >= 2 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Recent Runs</h3>
          </div>
          <div className="space-y-2">
            {recentRuns.map((run) => {
              const summary = run.summary as RunSummary
              const passRate = Math.round((summary.passed / summary.totalAds) * 100)
              const status = getStatusColor(passRate)

              return (
                <div key={run.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">
                      {run.state || 'All'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(run.run_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          passRate >= 95 ? 'bg-emerald-500' :
                          passRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-10 text-right ${status.text}`}>
                      {passRate}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Wire into qa-tabs.tsx**

Import:
```typescript
import { ScorecardView } from './scorecard-view'
```

Replace scorecard placeholder:
```typescript
{activeTab === 'scorecard' && (
  <ScorecardView ads={ads} runs={runs} />
)}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/admin/compliance-qa/scorecard-view.tsx src/components/admin/compliance-qa/qa-tabs.tsx
git commit -m "feat: add scorecard dashboard with state health cards and trend view"
```

---

## Task 11: Seed Initial Montana Test Corpus

**Files:**
- Create: `scripts/seed-compliance-corpus.ts`

This script creates initial test ads for Montana so the QA tool has data from day one.

**Step 1: Create seed script**

Create `scripts/seed-compliance-corpus.ts`:

```typescript
/**
 * Seed the compliance test corpus with initial Montana test ads.
 * Run with: npx tsx scripts/seed-compliance-corpus.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const montanaTestAds = [
  // Clean ads (should produce zero violations)
  {
    state: 'MT',
    name: 'MT clean suburban listing',
    text: 'Beautiful 4-bedroom home in Bozeman. Updated kitchen with granite countertops, spacious backyard, and attached two-car garage. Close to schools and parks. 2,400 sq ft on a quiet cul-de-sac.',
    expected_violations: [],
    is_clean: true,
    tags: ['clean', 'suburban', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT clean rural listing',
    text: 'Stunning mountain views from this 20-acre property outside Missoula. Custom-built log home with 3 bedrooms, 2 baths, wrap-around deck. Well and septic. Paved road access.',
    expected_violations: [],
    is_clean: true,
    tags: ['clean', 'rural', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT clean condo listing',
    text: 'Modern downtown Billings condo. 2BR/2BA, open floor plan, in-unit laundry, one reserved parking space. Walk to restaurants and shopping. HOA includes water and trash.',
    expected_violations: [],
    is_clean: true,
    tags: ['clean', 'condo', 'seed'],
    source: 'seed-script',
  },

  // Ads with known violations
  {
    state: 'MT',
    name: 'MT steering - exclusive neighborhood',
    text: 'Luxury home in an exclusive neighborhood. This prestigious property offers privacy and security in a gated community.',
    expected_violations: [
      { term: 'exclusive', category: 'steering', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['steering', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT familial status - no children',
    text: 'Quiet adult community. No children allowed. Perfect for retirees seeking peace and tranquility.',
    expected_violations: [
      { term: 'no children', category: 'familial-status', severity: 'hard' },
      { term: 'adult community', category: 'familial-status', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['familial-status', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT disability language',
    text: 'This home is not handicap accessible. Steps at all entrances. Not suitable for wheelchair users.',
    expected_violations: [
      { term: 'handicap', category: 'disability', severity: 'hard' },
      { term: 'not suitable for wheelchair', category: 'disability', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['disability', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT religion reference',
    text: 'Perfect home for a Christian family. Located in a faith-based community with shared values.',
    expected_violations: [
      { term: 'Christian family', category: 'religion', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['religion', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT economic exclusion',
    text: 'Executive home for professionals. No Section 8 accepted. Proof of high income required.',
    expected_violations: [
      { term: 'no section 8', category: 'economic-exclusion', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['economic-exclusion', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT misleading claims',
    text: 'Guaranteed sale in 30 days or your money back! This is the best deal in Montana. Waterfront property with amazing investment potential.',
    expected_violations: [
      { term: 'guaranteed sale', category: 'misleading-claims', severity: 'hard' },
      { term: 'best deal', category: 'misleading-claims', severity: 'soft' },
    ],
    is_clean: false,
    tags: ['misleading-claims', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT age discrimination',
    text: 'Perfect for young professionals. No retirees please. Active lifestyle community for those under 40.',
    expected_violations: [
      { term: 'young professionals', category: 'age', severity: 'soft' },
      { term: 'no retirees', category: 'age', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['age', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT sex/gender preference',
    text: 'Bachelor pad in downtown Missoula. Perfect for single men. Man cave included.',
    expected_violations: [
      { term: 'bachelor pad', category: 'sex-gender', severity: 'soft' },
      { term: 'single men', category: 'sex-gender', severity: 'hard' },
      { term: 'man cave', category: 'sex-gender', severity: 'soft' },
    ],
    is_clean: false,
    tags: ['sex-gender', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT marital status',
    text: 'Ideal for married couples. Divorced individuals need not apply. Family-oriented neighborhood.',
    expected_violations: [
      { term: 'married couples', category: 'marital-status', severity: 'hard' },
      { term: 'divorced', category: 'marital-status', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['marital-status', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT multiple category violations',
    text: 'Exclusive executive home in a private Christian community. No children, no Section 8. Perfect for married couples only. This is the best investment in Montana, guaranteed returns.',
    expected_violations: [
      { term: 'exclusive', category: 'steering', severity: 'hard' },
      { term: 'no children', category: 'familial-status', severity: 'hard' },
      { term: 'no section 8', category: 'economic-exclusion', severity: 'hard' },
      { term: 'married couples', category: 'marital-status', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['multi-category', 'seed'],
    source: 'seed-script',
  },
]

async function seed() {
  console.log(`Seeding ${montanaTestAds.length} Montana test ads...`)

  for (const ad of montanaTestAds) {
    const { error } = await supabase.from('compliance_test_ads').insert(ad)
    if (error) {
      console.error(`Failed to insert "${ad.name}":`, error.message)
    } else {
      console.log(`  + ${ad.name}`)
    }
  }

  console.log('Done.')
}

seed()
```

**Step 2: Run the seed script**

Run: `npx tsx scripts/seed-compliance-corpus.ts`
Expected: 13 Montana test ads seeded

**Step 3: Commit**

```bash
git add scripts/seed-compliance-corpus.ts
git commit -m "feat: add seed script for initial Montana compliance test corpus"
```

---

## Task 12: Integration Tests

**Files:**
- Create: `src/lib/compliance/qa-engine.integration.test.ts`

These tests run the full QA engine against the real Montana config to verify the seed corpus produces expected results.

**Step 1: Write integration tests**

Create `src/lib/compliance/qa-engine.integration.test.ts`:

```typescript
import { scanAd, runTestSuite, classifyViolationLayer } from './qa-engine'
import { getComplianceConfig } from './engine'

describe('QA Engine Integration (Montana)', () => {
  it('Montana config exists', () => {
    expect(getComplianceConfig('MT')).not.toBeNull()
  })

  describe('scanAd', () => {
    it('returns null for unknown state', () => {
      expect(scanAd('test', 'XX')).toBeNull()
    })

    it('finds zero violations in clean ad', () => {
      const result = scanAd(
        'Beautiful 4-bedroom home in Bozeman. Updated kitchen, spacious backyard.',
        'MT'
      )
      expect(result).not.toBeNull()
      expect(result!.violations).toHaveLength(0)
      expect(result!.summary.total).toBe(0)
    })

    it('finds violations in ad with prohibited terms', () => {
      const result = scanAd(
        'Exclusive neighborhood. No children allowed.',
        'MT'
      )
      expect(result).not.toBeNull()
      expect(result!.violations.length).toBeGreaterThan(0)
      expect(result!.summary.hard).toBeGreaterThan(0)
    })

    it('classifies violations into layers', () => {
      const result = scanAd(
        'No children. No section 8. Exclusive community.',
        'MT'
      )
      expect(result).not.toBeNull()
      // Should have at least some violations in state or federal layer
      const totalLayered =
        result!.layerBreakdown.state.length +
        result!.layerBreakdown.federal.length +
        result!.layerBreakdown.industry.length
      expect(totalLayered).toBe(result!.violations.length)
    })
  })

  describe('runTestSuite', () => {
    it('passes clean ad with empty expected violations', () => {
      const { results, summary } = runTestSuite([
        {
          id: 'test-clean',
          name: 'Clean ad',
          state: 'MT',
          text: 'Beautiful home in Bozeman with mountain views.',
          expected_violations: [],
          is_clean: true,
        },
      ])
      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(true)
      expect(summary.passed).toBe(1)
      expect(summary.failed).toBe(0)
    })

    it('fails when expected violation is not found', () => {
      const { results } = runTestSuite([
        {
          id: 'test-missed',
          name: 'Missing violation',
          state: 'MT',
          text: 'Beautiful home in Bozeman.',
          expected_violations: [
            { term: 'no children', category: 'familial-status', severity: 'hard' },
          ],
          is_clean: false,
        },
      ])
      expect(results[0].passed).toBe(false)
      expect(results[0].mismatches[0].type).toBe('missed')
    })

    it('builds category coverage correctly', () => {
      const { summary } = runTestSuite([
        {
          id: 'test-cov',
          name: 'Coverage test',
          state: 'MT',
          text: 'No children allowed.',
          expected_violations: [
            { term: 'no children', category: 'familial-status', severity: 'hard' },
          ],
          is_clean: false,
        },
      ])
      const familialCov = summary.coverage.find((c) => c.category === 'familial-status')
      expect(familialCov?.covered).toBe(true)
      expect(familialCov?.testAdCount).toBe(1)

      const steeringCov = summary.coverage.find((c) => c.category === 'steering')
      expect(steeringCov?.covered).toBe(false)
      expect(steeringCov?.testAdCount).toBe(0)
    })
  })
})
```

**Step 2: Run tests**

Run: `npx jest src/lib/compliance/qa-engine.integration.test.ts --no-coverage`
Expected: All tests PASS

**Step 3: Run full test suite to verify no regressions**

Run: `npx jest --no-coverage`
Expected: All existing tests still pass

**Step 4: Commit**

```bash
git add src/lib/compliance/qa-engine.integration.test.ts
git commit -m "test: add integration tests for compliance QA engine"
```

---

## Task 13: Final Wiring and Build Verification

**Files:**
- Modify: `src/components/admin/compliance-qa/qa-tabs.tsx` (verify all imports)

**Step 1: Verify all four views are wired**

Ensure `qa-tabs.tsx` has all four view components imported and rendered. The final file should have:

```typescript
import { ScannerView } from './scanner-view'
import { CorpusView } from './corpus-view'
import { RunnerView } from './runner-view'
import { ScorecardView } from './scorecard-view'
```

And all four tab content sections rendering the correct component.

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Run all tests**

Run: `npx jest --no-coverage`
Expected: All tests pass (existing + new QA engine tests)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete compliance QA tool — all four views wired"
```

---

## Complete File Matrix

### NEW Files (13)
| File | Task |
|------|------|
| `supabase/migrations/20260215_create_compliance_qa_tables.sql` | 1 |
| `src/lib/types/compliance-qa.ts` | 2 |
| `src/lib/compliance/qa-engine.ts` | 3 |
| `src/lib/compliance/qa-engine.test.ts` | 3 |
| `src/app/api/admin/compliance-qa/scan/route.ts` | 4 |
| `src/app/api/admin/compliance-qa/corpus/route.ts` | 4 |
| `src/app/api/admin/compliance-qa/corpus/[id]/route.ts` | 4 |
| `src/app/api/admin/compliance-qa/run/route.ts` | 5 |
| `src/app/api/admin/compliance-qa/runs/route.ts` | 5 |
| `src/app/admin/compliance-qa/page.tsx` | 6 |
| `src/components/admin/compliance-qa/qa-tabs.tsx` | 6 |
| `src/components/admin/compliance-qa/scanner-view.tsx` | 7 |
| `src/components/admin/compliance-qa/corpus-view.tsx` | 8 |
| `src/components/admin/compliance-qa/runner-view.tsx` | 9 |
| `src/components/admin/compliance-qa/scorecard-view.tsx` | 10 |
| `scripts/seed-compliance-corpus.ts` | 11 |
| `src/lib/compliance/qa-engine.integration.test.ts` | 12 |

### MODIFIED Files (2)
| File | Task | Change |
|------|------|--------|
| `src/lib/types/index.ts` | 2 | Add compliance-qa export |
| `src/components/admin/sidebar.tsx` | 6 | Add Compliance QA nav item |

**Total: 17 new + 2 modified = 19 file operations across 13 tasks**

---

## Dependency Graph

```
Task 1 (DB migration)
  └─> Task 2 (Types)
        └─> Task 3 (QA Engine + unit tests)
              ├─> Task 4 (API: scan + corpus)
              └─> Task 5 (API: run + history)
                    └─> Task 6 (Page shell + nav)
                          ├─> Task 7 (Scanner view)
                          ├─> Task 8 (Corpus view)
                          ├─> Task 9 (Runner view)
                          └─> Task 10 (Scorecard view)
                                └─> Task 11 (Seed corpus)
                                      └─> Task 12 (Integration tests)
                                            └─> Task 13 (Final build verification)
```

Tasks 7-10 can be parallelized (independent UI components).
