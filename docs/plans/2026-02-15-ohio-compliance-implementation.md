# Ohio Real Estate Advertising Compliance — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Ohio as a second supported state in the compliance system, introducing a new `military-status` protected category and integrating with the existing AI agent, QA system, and admin UI.

**Architecture:** The compliance system uses a GPT-5.2 AI agent for context-aware violation scanning. State configs live in `src/lib/compliance/terms/` as `MLSComplianceConfig` exports, registered in a `complianceConfigs` map. The QA backend (scanner, test runner, corpus, cron) is already multi-state — only UI components need Ohio additions.

**Tech Stack:** Next.js 14 (App Router), TypeScript, OpenAI GPT-5.2 (compliance agent), Supabase (DB), Jest (tests)

**Reference:** Full research at `.claude/plans/ohio-compliance-plan.md`

---

## Task 1: Fix Compliance Re-Check Bug

The `/api/compliance/check` endpoint ignores `campaign.stateCode` and always uses global settings. If a user generates an Ohio campaign but later switches settings to Montana, "Fix All" re-checks against the wrong state.

**Files:**
- Modify: `src/app/api/compliance/check/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/compliance/check/__tests__/route.test.ts`:

```typescript
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock auth to always pass
jest.mock('@/lib/supabase/auth-helpers', () => ({
  requireAuth: jest.fn().mockResolvedValue({ error: null }),
}))

// Mock compliance agent
const mockCheckCompliance = jest.fn().mockResolvedValue({
  platforms: [],
  campaignVerdict: 'compliant',
  violations: [],
  autoFixes: [],
  totalViolations: 0,
  totalAutoFixes: 0,
})
jest.mock('@/lib/compliance/agent', () => ({
  checkComplianceWithAgent: (...args: any[]) => mockCheckCompliance(...args),
}))

// Mock settings — returns Montana config
const mockMontanaConfig = { state: 'Montana', prohibitedTerms: [] }
jest.mock('@/lib/compliance/compliance-settings', () => ({
  getComplianceSettings: jest.fn().mockResolvedValue({
    enabled: true,
    config: mockMontanaConfig,
    stateCode: 'MT',
  }),
}))

// Mock complianceConfigs with Ohio
const mockOhioConfig = { state: 'Ohio', prohibitedTerms: [] }
jest.mock('@/lib/compliance/terms/montana', () => ({
  complianceConfigs: { MT: mockMontanaConfig, OH: mockOhioConfig },
  montanaCompliance: mockMontanaConfig,
}))

describe('POST /api/compliance/check', () => {
  beforeEach(() => {
    mockCheckCompliance.mockClear()
  })

  it('uses campaign stateCode over global settings', async () => {
    const req = new NextRequest('http://localhost/api/compliance/check', {
      method: 'POST',
      body: JSON.stringify({
        campaign: { stateCode: 'OH', id: 'test' },
      }),
    })

    await POST(req)

    // Should have been called with Ohio config, not Montana
    expect(mockCheckCompliance).toHaveBeenCalledWith(
      expect.objectContaining({ stateCode: 'OH' }),
      expect.objectContaining({ state: 'Ohio' }),
    )
  })

  it('falls back to global settings when no stateCode', async () => {
    const req = new NextRequest('http://localhost/api/compliance/check', {
      method: 'POST',
      body: JSON.stringify({
        campaign: { id: 'test' },
      }),
    })

    await POST(req)

    expect(mockCheckCompliance).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test' }),
      expect.objectContaining({ state: 'Montana' }),
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/app/api/compliance/check/__tests__/route.test.ts --no-cache`
Expected: FAIL — campaign.stateCode is ignored, Ohio config never used

**Step 3: Write the fix**

Replace the contents of `src/app/api/compliance/check/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { checkComplianceWithAgent } from '@/lib/compliance/agent'
import { getComplianceSettings } from '@/lib/compliance/compliance-settings'
import { complianceConfigs } from '@/lib/compliance/terms/montana'
import type { CampaignKit } from '@/lib/types/campaign'

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { campaign } = (await req.json()) as { campaign: CampaignKit }

  if (!campaign) {
    return NextResponse.json({ error: 'campaign is required' }, { status: 400 })
  }

  const { config: settingsConfig, stateCode: settingsState } = await getComplianceSettings()

  // Prefer the campaign's state (set during generation) over global settings
  const effectiveState = campaign.stateCode || settingsState
  const config = complianceConfigs[effectiveState.toUpperCase()] ?? settingsConfig

  const result = await checkComplianceWithAgent(campaign, config)

  return NextResponse.json(result)
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/app/api/compliance/check/__tests__/route.test.ts --no-cache`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/compliance/check/route.ts src/app/api/compliance/check/__tests__/route.test.ts
git commit -m "fix: compliance re-check prefers campaign stateCode over global settings"
```

---

## Task 2: Add `military-status` to ViolationCategory Type

**Files:**
- Modify: `src/lib/types/compliance.ts:1-12`

**Step 1: Add to union type**

In `src/lib/types/compliance.ts`, add `| 'military-status'` after `| 'misleading-claims'`:

```typescript
export type ViolationCategory =
  | 'steering'
  | 'familial-status'
  | 'disability'
  | 'race-color-national-origin'
  | 'religion'
  | 'sex-gender'
  | 'age'
  | 'marital-status'
  | 'creed'
  | 'economic-exclusion'
  | 'misleading-claims'
  | 'military-status';
```

**Step 2: Run TypeScript to find all broken exhaustive maps**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: FAIL — errors in `prompt.ts` (exhaustive `Record<ViolationCategory, string>` missing `military-status`)

**Step 3: Commit type change alone**

```bash
git add src/lib/types/compliance.ts
git commit -m "feat: add military-status to ViolationCategory union type"
```

---

## Task 3: Update All Exhaustive Category Maps

Fix every location that TypeScript errors on after Task 2. There are 4 locations.

**Files:**
- Modify: `src/lib/ai/prompt.ts:83-95`
- Modify: `src/components/campaign/violation-details.tsx:14-26` and `:28-40`
- Modify: `src/lib/compliance/agent.ts` (2 locations in prompt strings)

**Step 1: Fix `prompt.ts` categoryLabels**

In `src/lib/ai/prompt.ts`, add to the `categoryLabels` record (after `'misleading-claims'` entry):

```typescript
  'military-status': 'Military / Veteran Status',
```

**Step 2: Fix `violation-details.tsx` categoryColors**

In `src/components/campaign/violation-details.tsx`, add to `categoryColors` (after `'misleading-claims'` entry):

```typescript
  'military-status': 'bg-green-100 text-green-800',
```

**Step 3: Fix `violation-details.tsx` categoryLabels**

Same file, add to `categoryLabels` (after `'misleading-claims'` entry):

```typescript
  'military-status': 'Military Status',
```

**Step 4: Fix `agent.ts` — first prompt (checkComplianceWithAgent)**

In `src/lib/compliance/agent.ts`, find the category union string in the JSON schema prompt (~line 66):

```
"category": "steering" | "familial-status" | "disability" | "race-color-national-origin" | "religion" | "sex-gender" | "age" | "marital-status" | "creed" | "economic-exclusion" | "misleading-claims",
```

Replace with:

```
"category": "steering" | "familial-status" | "disability" | "race-color-national-origin" | "religion" | "sex-gender" | "age" | "marital-status" | "creed" | "economic-exclusion" | "misleading-claims" | "military-status",
```

**Step 5: Fix `agent.ts` — second prompt (scanTextWithAgent)**

Same file, find the identical category union string in the second prompt (~line 179) and make the same addition.

**Step 6: Verify TypeScript passes**

Run: `npx tsc --noEmit`
Expected: PASS — zero errors

**Step 7: Commit**

```bash
git add src/lib/ai/prompt.ts src/components/campaign/violation-details.tsx src/lib/compliance/agent.ts
git commit -m "feat: add military-status to all category maps and agent prompts"
```

---

## Task 4: Update Admin Settings (Category + State Dropdown + Defaults)

**Files:**
- Modify: `src/components/admin/compliance-settings-form.tsx:7-19` and `:109-113`
- Modify: `src/lib/settings/defaults.ts:13-16` and `:33`

**Step 1: Add military-status to CATEGORIES array**

In `src/components/admin/compliance-settings-form.tsx`, add after the `misleading-claims` entry in `CATEGORIES`:

```typescript
  { key: 'military-status', label: 'Military / Veteran Status' },
```

**Step 2: Add Ohio to state dropdown**

Same file, find the state `<select>` (~line 110). Replace:

```typescript
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="MT">Montana</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">More states coming soon.</p>
```

With:

```typescript
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="MT">Montana</option>
            <option value="OH">Ohio</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Select the state where your brokerage operates.</p>
```

**Step 3: Add military-status to default categories**

In `src/lib/settings/defaults.ts`, update the `compliance.categories` array (lines 13-16):

```typescript
  'compliance.categories': [
    'steering', 'familial-status', 'disability', 'race-color-national-origin',
    'religion', 'sex-gender', 'age', 'marital-status', 'creed',
    'economic-exclusion', 'misleading-claims', 'military-status',
  ],
```

**Step 4: Update FAQ text**

Same file, find the FAQ answer about compliance (~line 33). Replace:

```typescript
'Currently optimized for Montana MLS requirements, with more states coming soon.'
```

With:

```typescript
'Currently supports Montana and Ohio MLS requirements, with more states planned.'
```

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/admin/compliance-settings-form.tsx src/lib/settings/defaults.ts
git commit -m "feat: add military-status category and Ohio state to admin settings"
```

---

## Task 5: Create Ohio Compliance Terms

This is the largest task (~1800 lines). Create the Ohio prohibited terms file mirroring Montana's structure.

**Files:**
- Create: `src/lib/compliance/terms/ohio.ts`

**Step 1: Write the failing test**

Add to `src/lib/compliance/agent.test.ts` (or create a new `src/lib/compliance/terms/__tests__/ohio.test.ts`):

```typescript
import { ohioCompliance } from '../ohio'

describe('Ohio compliance config', () => {
  it('has correct state metadata', () => {
    expect(ohioCompliance.state).toBe('Ohio')
    expect(ohioCompliance.mlsName).toBe('Ohio MLS (multi-board)')
    expect(ohioCompliance.maxDescriptionLength).toBe(1500)
  })

  it('includes military-status terms', () => {
    const militaryTerms = ohioCompliance.prohibitedTerms.filter(
      t => t.category === 'military-status'
    )
    expect(militaryTerms.length).toBeGreaterThanOrEqual(13) // 13 hard + 8 soft
  })

  it('includes ancestry terms under race-color-national-origin', () => {
    const ancestryTerms = ohioCompliance.prohibitedTerms.filter(
      t => t.category === 'race-color-national-origin' && t.law.includes('4112')
    )
    expect(ancestryTerms.length).toBeGreaterThanOrEqual(5)
  })

  it('does NOT include creed/political-beliefs terms', () => {
    const creedTerms = ohioCompliance.prohibitedTerms.filter(
      t => t.category === 'creed'
    )
    expect(creedTerms).toHaveLength(0)
  })

  it('does NOT include age or marital-status terms', () => {
    const ageTerms = ohioCompliance.prohibitedTerms.filter(t => t.category === 'age')
    const maritalTerms = ohioCompliance.prohibitedTerms.filter(t => t.category === 'marital-status')
    expect(ageTerms).toHaveLength(0)
    expect(maritalTerms).toHaveLength(0)
  })

  it('uses Ohio/federal citations, not Montana MCA', () => {
    const mcaTerms = ohioCompliance.prohibitedTerms.filter(
      t => t.law.includes('MCA')
    )
    expect(mcaTerms).toHaveLength(0)
  })

  it('has required disclosures', () => {
    expect(ohioCompliance.requiredDisclosures.length).toBeGreaterThan(0)
  })

  it('has docPaths for Ohio state docs', () => {
    expect(ohioCompliance.docPaths?.state).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ohio'),
      ])
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/compliance/terms/__tests__/ohio.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../ohio'`

**Step 3: Create `src/lib/compliance/terms/ohio.ts`**

Create the file following Montana's exact structure. The file should contain:

1. **Import:** `import { MLSComplianceConfig, ProhibitedTerm } from '@/lib/types'`
2. **Category arrays** (each as `const xxxTerms: ProhibitedTerm[]`):
   - `steeringTerms` — Federal terms (same as Montana) + Ohio additions (`board approval`, `membership approval`, `board approval required`, `private`)
   - `familialStatusTerms` — Federal terms (same as Montana)
   - `disabilityTerms` — Federal terms (same as Montana)
   - `raceColorNationalOriginTerms` — Federal terms (same as Montana) + Ohio ancestry additions (`Appalachian area`, `no Appalachians`, `hillbilly neighborhood`, `old-country charm`, `heritage community`, `Appalachian`, `ethnic heritage neighborhood`)
   - `religionTerms` — Federal terms (same as Montana)
   - `sexGenderTerms` — Federal terms (same as Montana)
   - `economicExclusionTerms` — Federal terms (same as Montana)
   - `misleadingClaimsTerms` — Federal terms + Ohio additions (`guaranteed sale`, `we guarantee`, `guaranteed closing`, `no commission`, `free home evaluation`) + NAR Settlement terms
   - `militaryStatusTerms` — **NEW** — 13 hard + 8 soft terms from the plan (see `.claude/plans/ohio-compliance-plan.md` "Ohio-Specific Prohibited Terms" section)
3. **NO** `ageTerms`, `maritalStatusTerms`, or `creedTerms` arrays — these are Montana-only
4. **Combine:** `const allProhibitedTerms = [...steeringTerms, ...familialStatusTerms, ...]`
5. **Export:**

```typescript
export const ohioCompliance: MLSComplianceConfig = {
  state: 'Ohio',
  mlsName: 'Ohio MLS (multi-board)',
  lastUpdated: '2026-02-15',
  version: '1.0',
  rules: [
    'Must display license number in all advertising (ORC §4735.16)',
    'Must include registered brokerage name with equal or greater prominence (ORC §4735.16)',
    'Team name must not appear more prominent than brokerage name (OAC 1301:5-1-02)',
    'Internet ads must include licensee identification on every viewable page (OAC 1301:5-1-02(G))',
    'No guaranteed or promised appreciation language (ORC §4735.18)',
    'Fair housing compliance required (ORC §4112.02)',
    'Must disclose if property is in a flood zone (if known)',
    'Listing information must be updated within 14 days of material changes',
  ],
  requiredDisclosures: [
    'Listing courtesy of [Broker Name]',
    'Information deemed reliable but not guaranteed',
    'Equal Housing Opportunity',
    'License # [number] (ORC §4735.16)',
  ],
  prohibitedTerms: allProhibitedTerms,
  maxDescriptionLength: 1500,
  docPaths: {
    federal: [
      'compliance-docs/federal/fair-housing-overview.md',
      'compliance-docs/federal/steering.md',
      'compliance-docs/federal/familial-status.md',
      'compliance-docs/federal/disability.md',
      'compliance-docs/federal/race-color-national-origin.md',
      'compliance-docs/federal/religion.md',
      'compliance-docs/federal/sex-gender.md',
      'compliance-docs/federal/advertising-rules.md',
    ],
    state: [
      'compliance-docs/state/ohio/ohio-revised-code-4735.md',
      'compliance-docs/state/ohio/ohio-civil-rights-4112.md',
      'compliance-docs/state/ohio/ohio-military-status.md',
      'compliance-docs/state/ohio/ohio-team-advertising.md',
    ],
    industry: [
      'compliance-docs/industry/nar-ethics-guidelines.md',
      'compliance-docs/industry/common-pitfalls.md',
    ],
  },
}
```

**Important rules:**
- Every Ohio-specific term MUST cite ORC/OAC/federal law, NOT Montana MCA
- Federal terms shared with Montana should cite federal law (42 U.S.C. § 3604, etc.)
- Copy federal term arrays from Montana, but do NOT copy Montana-only categories
- The `militaryStatusTerms` array is entirely new — use the exact terms from the plan

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/compliance/terms/__tests__/ohio.test.ts --no-cache`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/compliance/terms/ohio.ts src/lib/compliance/terms/__tests__/ohio.test.ts
git commit -m "feat: create Ohio compliance terms with military-status category"
```

---

## Task 6: Register Ohio in Config Registry

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:1953-1956`
- Modify: `src/lib/compliance/index.ts:11`

**Step 1: Write the failing test**

Add to the Ohio test file from Task 5 (or `compliance-settings` test):

```typescript
import { complianceConfigs } from '../montana'

describe('complianceConfigs registry', () => {
  it('includes Ohio', () => {
    expect(complianceConfigs['OH']).toBeDefined()
    expect(complianceConfigs['OH'].state).toBe('Ohio')
  })

  it('still includes Montana', () => {
    expect(complianceConfigs['MT']).toBeDefined()
    expect(complianceConfigs['MT'].state).toBe('Montana')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/compliance/terms/__tests__/ohio.test.ts --no-cache`
Expected: FAIL — `complianceConfigs['OH']` is undefined

**Step 3: Register Ohio in montana.ts**

In `src/lib/compliance/terms/montana.ts`, add the import at the top (after the existing import):

```typescript
import { ohioCompliance } from './ohio';
```

Then update the `complianceConfigs` export at the bottom (~line 1953):

```typescript
export const complianceConfigs: Record<string, MLSComplianceConfig> = {
  MT: montanaCompliance,
  OH: ohioCompliance,
};
```

**Step 4: Update index.ts exports**

In `src/lib/compliance/index.ts`, update the terms export line:

```typescript
// Terms data
export { montanaCompliance, complianceConfigs, formatTermsForPrompt } from './terms/montana'
export { ohioCompliance } from './terms/ohio'
```

**Step 5: Run test to verify it passes**

Run: `npx jest src/lib/compliance/terms/__tests__/ohio.test.ts --no-cache`
Expected: PASS

**Step 6: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/compliance/terms/montana.ts src/lib/compliance/index.ts
git commit -m "feat: register Ohio in complianceConfigs registry"
```

---

## Task 7: Create Ohio Compliance Documentation

4 markdown files that get injected into the AI generation prompt via `loadComplianceDocs()`.

**Files:**
- Create: `compliance-docs/state/ohio/ohio-revised-code-4735.md`
- Create: `compliance-docs/state/ohio/ohio-civil-rights-4112.md`
- Create: `compliance-docs/state/ohio/ohio-military-status.md`
- Create: `compliance-docs/state/ohio/ohio-team-advertising.md`

**Step 1: Create `ohio-revised-code-4735.md` (~200 lines)**

Follow the structure of `compliance-docs/state/montana/human-rights-act.md`. Include:

```markdown
# Ohio Revised Code §4735 — Real Estate Licensing and Advertising

## Law

**ORC §4735.16** — Advertising requirements for licensed real estate professionals

**ORC §4735.18** — Prohibited practices

**OAC 1301:5-1-02** — Advertising rules

Enforcement: **Ohio Division of Real Estate and Professional Licensing**

## What It Requires

### Advertising Requirements (ORC §4735.16)
- License number must appear in ALL advertising
- Registered brokerage name required in all advertising
- [expand with full requirements]

### Internet/Digital Advertising (OAC 1301:5-1-02(G))
- Licensee identification on every viewable page or one click away
- [expand with digital-specific rules]

### Prohibited Practices (ORC §4735.18)
- No guaranteed sale or appreciation language
- No misleading claims about property value
- [expand with full list]

### Penalties
- $200 per violation
- $2,500 maximum per citation
- 3 citations within 12 months triggers disciplinary action
```

**Step 2: Create `ohio-civil-rights-4112.md` (~150 lines)**

```markdown
# Ohio Civil Rights Act §4112 — Housing Discrimination

## Law

**ORC §4112.02(H)** — Unlawful discriminatory practices in housing

Enforcement: **Ohio Civil Rights Commission**

## Protected Classes

Ohio protects 9 classes in housing (federal 7 + 2 additional):

### Federal Protected Classes (also enforced in Ohio)
1. Race
2. Color
3. National Origin
4. Religion
5. Sex (including gender identity and sexual orientation)
6. Familial Status
7. Disability

### Ohio Additional Protected Classes
8. **Military Status** — active duty, veterans, National Guard, reservists
9. **Ancestry** — broader than national origin, includes regional heritage (e.g., Appalachian)

[expand with enforcement details, penalties, case examples]
```

**Step 3: Create `ohio-military-status.md` (~100 lines)**

```markdown
# Ohio Military Status Protections in Housing

## Law

**ORC §4112.02(H)** — Prohibits discrimination based on military status in housing

## Definition of Military Status

Covers current and former members of:
- Active duty armed forces
- National Guard
- Reserves
- Veterans (honorably discharged)

## Prohibited Language in Advertising

### Explicit Exclusion (Hard Violations)
- "no veterans," "no military," "civilian tenants only"
- "no active duty," "military not welcome"
- Any language that excludes based on military service

### Preferential Language (Hard Violations)
- "perfect for military families" — steers toward military
- "civilian tenants preferred" — excludes military
- "non-military preferred" — explicit preference

### Contextual Caution (Soft Warnings)
- "military housing" — describe property features instead
- "near military base" — use the actual base name
- "veteran community" — use "established community"

## VASH Voucher Considerations
[expand with Veterans Affairs Supportive Housing details]
```

**Step 4: Create `ohio-team-advertising.md` (~80 lines)**

```markdown
# Ohio Team Advertising Rules

## Law

**OAC 1301:5-1-21** — Team advertising requirements

## Equal Prominence Rule

The brokerage name must appear with **equal or greater prominence** compared to team name.

### Compliant Examples
- "Smith Team | ABC Realty" (equal size)
- "**ABC Realty** — Smith Team" (brokerage larger)

### Non-Compliant Examples
- "**SMITH TEAM** — abc realty" (team more prominent)
- "Smith Team" (missing brokerage entirely)

[expand with specific formatting rules, digital vs print]
```

**Step 5: Verify docs load**

Run a quick check that the docs exist and the path resolver works. This will be fully tested in Task 9.

**Step 6: Commit**

```bash
git add compliance-docs/state/ohio/
git commit -m "docs: add Ohio compliance documentation (4 files)"
```

---

## Task 8: Update QA UI Components

**Files:**
- Modify: `src/components/admin/compliance-qa/scanner-view.tsx:7-8`
- Modify: `src/components/admin/compliance-qa/corpus-view.tsx:85-104`

**Step 1: Add Ohio to scanner STATES**

In `src/components/admin/compliance-qa/scanner-view.tsx`, replace:

```typescript
const STATES = [
  { code: 'MT', name: 'Montana' },
]
```

With:

```typescript
const STATES = [
  { code: 'MT', name: 'Montana' },
  { code: 'OH', name: 'Ohio' },
]
```

**Step 2: Update corpus INITIAL_FORM defaults**

In `src/components/admin/compliance-qa/corpus-view.tsx`, change `INITIAL_FORM` (line 85-104). Replace `state: 'MT'` and `addressState: 'MT'` with empty strings:

```typescript
const INITIAL_FORM = {
  name: '',
  state: '',
  risk_category: 'clean',
  is_seed: false,
  tags: '',
  street: '',
  city: '',
  addressState: '',
  zip: '',
  price: '',
  beds: '',
  baths: '',
  sqft: '',
  lotSize: '',
  yearBuilt: '',
  propertyType: 'Single Family',
  features: '',
  description: '',
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/admin/compliance-qa/scanner-view.tsx src/components/admin/compliance-qa/corpus-view.tsx
git commit -m "feat: add Ohio to QA scanner and corpus UI"
```

---

## Task 9: Ohio Integration Tests (Agent + Prompt)

End-to-end tests that verify Ohio works through the full compliance pipeline.

**Files:**
- Modify: `src/lib/compliance/agent.test.ts`

**Step 1: Add Ohio agent tests**

Add these tests to `src/lib/compliance/agent.test.ts`:

```typescript
import { ohioCompliance } from './terms/ohio'

describe('Ohio compliance agent', () => {
  beforeEach(() => {
    mockCreate.mockClear()
  })

  it('detects military-status violations in Ohio', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'fail', violationCount: 1, autoFixCount: 0 }],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'zillow',
              term: 'no veterans',
              category: 'military-status',
              severity: 'hard',
              explanation: 'Excludes based on military status',
              law: 'ORC §4112.02(H)',
              isContextual: false,
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          }),
        },
      }],
    })

    const campaign = buildMockCampaign({ zillow: 'No veterans allowed in this building', stateCode: 'OH' })
    const result = await checkComplianceWithAgent(campaign, ohioCompliance)

    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].category).toBe('military-status')
    expect(result.campaignVerdict).toBe('non-compliant')
  })

  it('does NOT flag creed/political-beliefs for Ohio', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'pass', violationCount: 0, autoFixCount: 0 }],
            campaignVerdict: 'compliant',
            violations: [],
            autoFixes: [],
            totalViolations: 0,
            totalAutoFixes: 0,
          }),
        },
      }],
    })

    const campaign = buildMockCampaign({ zillow: 'Conservative neighborhood', stateCode: 'OH' })
    const result = await checkComplianceWithAgent(campaign, ohioCompliance)

    // Ohio doesn't protect political beliefs — agent should not flag this
    expect(result.violations).toHaveLength(0)
    expect(result.campaignVerdict).toBe('compliant')
  })

  it('auto-fixes Ohio soft military-status violations', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'pass', violationCount: 0, autoFixCount: 1 }],
            campaignVerdict: 'needs-review',
            violations: [],
            autoFixes: [{
              platform: 'zillow',
              before: 'near military base',
              after: 'near Wright-Patterson Air Force Base',
              violationTerm: 'near military base',
              category: 'military-status',
            }],
            totalViolations: 0,
            totalAutoFixes: 1,
          }),
        },
      }],
    })

    const campaign = buildMockCampaign({ zillow: 'Located near military base in Dayton', stateCode: 'OH' })
    const result = await checkComplianceWithAgent(campaign, ohioCompliance)

    expect(result.autoFixes).toHaveLength(1)
    expect(result.autoFixes[0].category).toBe('military-status')
    expect(result.campaignVerdict).toBe('needs-review')
  })
})

describe('Montana regression', () => {
  it('still detects creed violations for Montana', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            platforms: [{ platform: 'zillow', verdict: 'fail', violationCount: 1, autoFixCount: 0 }],
            campaignVerdict: 'non-compliant',
            violations: [{
              platform: 'zillow',
              term: 'conservative values',
              category: 'creed',
              severity: 'hard',
              explanation: 'Discriminates based on political beliefs',
              law: 'MCA § 49-2-305',
              isContextual: false,
            }],
            autoFixes: [],
            totalViolations: 1,
            totalAutoFixes: 0,
          }),
        },
      }],
    })

    const campaign = buildMockCampaign({ zillow: 'Conservative values neighborhood', stateCode: 'MT' })
    const result = await checkComplianceWithAgent(campaign, montanaCompliance)

    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].category).toBe('creed')
  })
})
```

**Step 2: Run tests**

Run: `npx jest src/lib/compliance/agent.test.ts --no-cache`
Expected: PASS — all new Ohio tests + all existing Montana tests

**Step 3: Commit**

```bash
git add src/lib/compliance/agent.test.ts
git commit -m "test: add Ohio compliance agent tests and Montana regression tests"
```

---

## Task 10: Full Build Verification

Final verification that everything compiles and all tests pass.

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS — zero errors

**Step 2: Full test suite**

Run: `npx jest --no-cache`
Expected: PASS — all tests including new Ohio tests

**Step 3: Next.js build**

Run: `npm run build`
Expected: PASS — clean build

**Step 4: Clear caches (post multi-file change)**

Run: `rm -rf .next/ node_modules/.cache/`
Then: `npm run build`
Expected: PASS — clean build after cache clear

**Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: verify Ohio compliance build passes"
```

---

## Dependency Graph

```
Task 1 (bug fix)         — independent, do first
Task 2 (type change)     — independent of Task 1
Task 3 (category maps)   — depends on Task 2
Task 4 (admin settings)  — depends on Task 2
Task 5 (ohio.ts)         — depends on Task 2
Task 6 (registry)        — depends on Task 5
Task 7 (docs)            — independent, can parallelize with Tasks 3-6
Task 8 (QA UI)           — independent, can parallelize with Tasks 3-6
Task 9 (integration tests) — depends on Tasks 5, 6
Task 10 (build verify)   — depends on all above
```

**Parallelizable groups:**
- Group A: Tasks 1, 2 (independent)
- Group B: Tasks 3, 4, 5, 7, 8 (all depend on Task 2 only, can parallelize)
- Group C: Task 6 (depends on Task 5)
- Group D: Task 9 (depends on Tasks 5, 6)
- Group E: Task 10 (final gate)

---

## File Change Summary

| Action | File | Task |
|--------|------|------|
| Create | `src/app/api/compliance/check/__tests__/route.test.ts` | 1 |
| Modify | `src/app/api/compliance/check/route.ts` | 1 |
| Modify | `src/lib/types/compliance.ts` | 2 |
| Modify | `src/lib/ai/prompt.ts` | 3 |
| Modify | `src/components/campaign/violation-details.tsx` | 3 |
| Modify | `src/lib/compliance/agent.ts` | 3 |
| Modify | `src/components/admin/compliance-settings-form.tsx` | 4 |
| Modify | `src/lib/settings/defaults.ts` | 4 |
| Create | `src/lib/compliance/terms/ohio.ts` | 5 |
| Create | `src/lib/compliance/terms/__tests__/ohio.test.ts` | 5 |
| Modify | `src/lib/compliance/terms/montana.ts` | 6 |
| Modify | `src/lib/compliance/index.ts` | 6 |
| Create | `compliance-docs/state/ohio/ohio-revised-code-4735.md` | 7 |
| Create | `compliance-docs/state/ohio/ohio-civil-rights-4112.md` | 7 |
| Create | `compliance-docs/state/ohio/ohio-military-status.md` | 7 |
| Create | `compliance-docs/state/ohio/ohio-team-advertising.md` | 7 |
| Modify | `src/components/admin/compliance-qa/scanner-view.tsx` | 8 |
| Modify | `src/components/admin/compliance-qa/corpus-view.tsx` | 8 |
| Modify | `src/lib/compliance/agent.test.ts` | 9 |

**Total: 8 new + 11 modified = 19 files across 10 tasks**
