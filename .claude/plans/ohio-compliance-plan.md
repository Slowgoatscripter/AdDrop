# Ohio Real Estate Advertising Compliance -- Implementation Plan

**Status:** Updated for AI Agent Architecture | Ready for Implementation
**Date:** 2026-02-15 (Updated)
**Architecture:** GPT-5.2 AI Compliance Agent (replaces regex engine)
**Team:** 5 agents (2 researchers, 2 planners, 1 devil's advocate)

---

## Executive Summary

Ohio real estate advertising is governed by **ORC Chapter 4735** and **Ohio Administrative Code 1301:5-1**, enforced by the **Ohio Division of Real Estate and Professional Licensing**. Ohio's civil rights statute **ORC Chapter 4112** provides fair housing protections beyond federal law, adding **military status** and **ancestry** as protected classes.

### Current System Architecture

The compliance system uses a **GPT-5.2 AI agent** (`src/lib/compliance/agent.ts`) for context-aware violation detection -- NOT regex pattern matching. The flow is:

```
Property Data → GPT-5.2 generates ads → Quality checks → Quality AI scoring
→ Quality auto-fix → Compliance Agent (GPT-5.2) [FINAL GATE] → Output
```

Key components:
- **AI Agent** (`src/lib/compliance/agent.ts`) -- context-aware scanner, receives state-specific terms
- **Terms** (`src/lib/compliance/terms/montana.ts`) -- prohibited terms + `MLSComplianceConfig` + `complianceConfigs` registry
- **Settings** (`src/lib/compliance/compliance-settings.ts`) -- loads state config from DB, filters by active categories
- **Docs** (`src/lib/compliance/docs.ts`) -- markdown docs injected into AI prompts
- **QA System** (`src/app/api/admin/compliance-qa/`) -- scanner, test runner, corpus, snapshots, cron

### Key Differences from Montana

| Area | Montana | Ohio |
|------|---------|------|
| Governing law | MCA §49-2-305 | ORC §4735 + ORC §4112 |
| Enforcement | MT Human Rights Bureau | Ohio Division of RE + Ohio Civil Rights Commission |
| License # display | Recommended | **Mandatory** in all advertising (ORC §4735.16) |
| Brokerage name | Required | **Required** -- registered name, equal prominence (ORC §4735.16) |
| Team advertising | Not specifically regulated | Equal or greater prominence for brokerage (OAC 1301:5-1-02) |
| State protected classes | Age, marital status, political beliefs | **Military/veteran status, ancestry** (ORC §4112.02) |
| Political beliefs | Protected | **NOT protected** -- omit from Ohio config |
| Digital ad rules | General | Specific internet rules (OAC 1301:5-1-02(G)) |
| Penalties | Varies | $200/violation, $2,500 max/citation, 3 in 12 months = discipline |

---

## PHASE 0: Bug Fix (1 remaining)

### Bug Status (verified 2026-02-15)

| Bug | Status | Notes |
|-----|--------|-------|
| A: Server-side hardcoded Montana | **FIXED** | `generate.ts` now uses `getComplianceSettings()` |
| C: Docs path traversal | **FIXED** | `docs.ts` now uses `'compliance-docs'` correctly |
| B: Client-side re-check ignores campaign state | **OPEN** | See below |

### Bug B: Compliance Re-Check Ignores Campaign State

**Problem:** When a user clicks "Fix All" or "Replace" in `campaign-shell.tsx`, the client POSTs to `/api/compliance/check`. That endpoint calls `getComplianceSettings()` which reads from the **user's global settings**, NOT from `campaign.stateCode`. If a user generates an Ohio campaign, then switches their settings to Montana, re-checks will use Montana rules.

**Files:**
- `src/app/api/compliance/check/route.ts` (line 17) -- uses `getComplianceSettings()` instead of `campaign.stateCode`

**Fix:** Update the check endpoint to prefer `campaign.stateCode` when present:
```typescript
// BEFORE (line 17)
const { config } = await getComplianceSettings()

// AFTER
const { config: settingsConfig, stateCode: settingsState } = await getComplianceSettings()
const effectiveState = campaign.stateCode || settingsState
const config = complianceConfigs[effectiveState.toUpperCase()] ?? settingsConfig
```

**Files touched:** `src/app/api/compliance/check/route.ts`

---

## PHASE 1: Type System & Category Maps

### Task 1: Add `military-status` to ViolationCategory

**File:** `src/lib/types/compliance.ts` (lines 1-12)

Add `| 'military-status'` to the union type.

**Note:** Ancestry maps into existing `race-color-national-origin` (consensus decision).

### Task 2: Update all exhaustive category maps (4 locations)

1. **`src/lib/ai/prompt.ts`** (lines 83-95): Add `'military-status': 'Military / Veteran Status'` to `categoryLabels` (exhaustive `Record<ViolationCategory, string>` -- will TypeScript-error without it)

2. **`src/components/campaign/violation-details.tsx`** (lines 14-26): Add `'military-status': 'bg-green-100 text-green-800'` to `categoryColors`

3. **`src/components/campaign/violation-details.tsx`** (lines 28-40): Add `'military-status': 'Military Status'` to `categoryLabels`

4. **`src/lib/compliance/agent.ts`** (lines 66, 179): Add `"military-status"` to the category union in the AI agent's system prompt (both `checkComplianceWithAgent` and `scanTextWithAgent` functions)

---

## PHASE 2: Ohio Configuration

### Task 3: Add military-status to admin CATEGORIES

**File:** `src/components/admin/compliance-settings-form.tsx` (lines 7-19)

Add `{ key: 'military-status', label: 'Military / Veteran Status' }` to the CATEGORIES array.

### Task 4: Update settings defaults

**File:** `src/lib/settings/defaults.ts` (lines 12-16)

Add `'military-status'` to the `compliance.categories` array.

### Task 5: Create `src/lib/compliance/terms/ohio.ts` (NEW FILE, ~1800 lines)

Mirror `montana.ts` structure in `src/lib/compliance/terms/`:

```typescript
export const ohioCompliance: MLSComplianceConfig = {
  state: 'Ohio',
  mlsName: 'Ohio MLS (multi-board)',
  lastUpdated: '2026-02-15',
  version: '1.0',
  rules: [/* Ohio-specific MLS rules */],
  requiredDisclosures: [/* Ohio-specific disclosures */],
  prohibitedTerms: allProhibitedTerms,
  maxDescriptionLength: 1500,
  docPaths: {
    federal: [/* same as Montana */],
    state: [
      'compliance-docs/state/ohio/ohio-revised-code-4735.md',
      'compliance-docs/state/ohio/ohio-civil-rights-4112.md',
      'compliance-docs/state/ohio/ohio-military-status.md',
      'compliance-docs/state/ohio/ohio-team-advertising.md',
    ],
    industry: [/* same as Montana */],
  },
}
```

**Include categories:** steering, familial-status, disability, race-color-national-origin (+ ancestry terms), religion, sex-gender, economic-exclusion, misleading-claims, military-status

**Omit:** age, marital-status, creed/political-beliefs (Montana-only)

All terms must use Ohio/federal law citations (NOT Montana MCA references). ~196 total prohibited terms.

### Task 6: Register Ohio in config registry

**File:** `src/lib/compliance/terms/montana.ts` (line 1953) -- the `complianceConfigs` export lives here.

**Option A (simple):** Add Ohio import and merge into `complianceConfigs` in `montana.ts`:
```typescript
import { ohioCompliance } from './ohio'

export const complianceConfigs: Record<string, MLSComplianceConfig> = {
  MT: montanaCompliance,
  OH: ohioCompliance,
}
```

**Option B (cleaner, for 3+ states):** Create `src/lib/compliance/terms/index.ts` as a registry:
```typescript
import { complianceConfigs as mtConfigs, formatTermsForPrompt } from './montana'
import { complianceConfigs as ohConfigs } from './ohio'

export const complianceConfigs = { ...mtConfigs, ...ohConfigs }
export { formatTermsForPrompt }
```
Then update imports in `compliance-settings.ts` (line 3) and `index.ts` (line 11).

**Recommendation:** Option A for now. Refactor to Option B when adding a 3rd state.

### Task 7: Add Ohio to state dropdown

**File:** `src/components/admin/compliance-settings-form.tsx` (lines 106-113)

- Add `<option value="OH">Ohio</option>`
- Change help text from `"More states coming soon."` to `"Select the state where your brokerage operates."`

---

## PHASE 3: Compliance Documentation (can parallelize with Phase 2)

### Task 8: Create `compliance-docs/state/ohio/` (4 files)

1. **`ohio-revised-code-4735.md`** (~200 lines) -- ORC §4735.16 advertising requirements, ORC §4735.18 prohibited practices, OAC 1301:5-1-02 advertising rules, internet/digital advertising
2. **`ohio-civil-rights-4112.md`** (~150 lines) -- ORC §4112.02(H) housing discrimination, 9 protected classes, Ohio Civil Rights Commission enforcement
3. **`ohio-military-status.md`** (~100 lines) -- Military status definition and scope, prohibited language, VASH voucher interaction
4. **`ohio-team-advertising.md`** (~80 lines) -- OAC 1301:5-1-21 team rules, prominence requirements, compliant vs non-compliant examples

These docs get injected into the AI generation prompt via `loadComplianceDocs()` using the `docPaths` in `ohioCompliance`.

---

## PHASE 4: QA System Integration

### QA Backend Status (verified 2026-02-15)

The QA backend is **already multi-state**. No backend changes needed:

| Component | Status | Notes |
|-----------|--------|-------|
| Scanner API (`scan/route.ts`) | Ready | Accepts `state` param, passes to `scanTextWithAgent()` |
| Test Runner API (`run/route.ts`) | Ready | Filters properties by state, state stored in results |
| Corpus API (`corpus/route.ts`) | Ready | Properties have `state` field, filters work |
| Cron Job (`cron/compliance-qa/route.ts`) | Ready | Runs all states, no filter (correct behavior) |
| Database Schema | Ready | `state text NOT NULL`, indexed, no enum constraint |
| Types (`compliance-qa.ts`) | Ready | `state: string` throughout, not Montana-specific |

### Task 9: Update QA UI Components (2 files)

**`src/components/admin/compliance-qa/scanner-view.tsx`:**
```typescript
// BEFORE
const STATES = [
  { code: 'MT', name: 'Montana' },
]

// AFTER
const STATES = [
  { code: 'MT', name: 'Montana' },
  { code: 'OH', name: 'Ohio' },
]
```

**`src/components/admin/compliance-qa/corpus-view.tsx`:**
- Update `INITIAL_FORM` default `state` and `addressState` from hardcoded `'MT'` to empty string (force user selection) or keep `'MT'` and add Ohio as option in the state dropdown.

**Note:** `runner-view.tsx` already dynamically detects states from the corpus -- no changes needed.

### Task 10: Create Ohio Test Corpus (5-10 seed properties)

Create Ohio seed properties via the Corpus API or UI covering risk categories:

| Property | City | Risk Category | Purpose |
|----------|------|---------------|---------|
| Columbus Modern Condo | Columbus | clean | Baseline clean property |
| Cleveland Lakefront Home | Cleveland | moderate | Proximity language (lake, waterfront) |
| Cincinnati Historic District | Cincinnati | high | Heritage/ancestry triggers |
| Dayton Military Adjacent | Dayton | high | Near Wright-Patterson AFB, military terms |
| Toledo Mixed-Use | Toledo | moderate | Economic exclusion terms |
| Akron Family Home | Akron | moderate | Familial status triggers |

After creating properties:
1. Generate snapshots for each via the snapshot API
2. Review and approve baselines
3. Run Ohio-only test suite: `{ state: 'OH', mode: 'snapshot' }`

---

## PHASE 5: Testing

### Task 11: Ohio compliance agent tests

**File:** `src/lib/compliance/agent.test.ts`

Add Ohio-specific tests alongside existing Montana tests:

- `scanTextWithAgent()` with `state: 'OH'` and Ohio config detects military-status violations
- `scanTextWithAgent()` with Ohio config does NOT flag political-beliefs (Montana-only)
- `checkComplianceWithAgent()` with Ohio campaign kit produces correct verdicts
- Context-awareness: "family room" is NOT a violation, "perfect for military families" IS
- Auto-fix: Ohio soft violations get safe alternatives
- All existing Montana tests still pass (regression)

### Task 12: Ohio config unit tests

**File:** New or existing test file for terms

- `complianceConfigs['OH']` returns non-null
- Case insensitive: `complianceConfigs['OH']` works (verify lookup in `compliance-settings.ts`)
- Ohio config has correct `state`, `mlsName`, `rules`, `disclosures`
- Ohio config includes `military-status` terms
- Ohio config does NOT include `creed` / political-beliefs terms
- Ohio config terms use ORC citations, not MCA citations
- `tsc --noEmit` passes

### Task 13: Ohio prompt tests

**File:** `src/lib/ai/__tests__/prompt.test.ts`

- AI prompt includes Ohio rules when state is OH
- Cheat sheet includes military-status terms
- Ohio compliance docs are loaded (verify `docPaths` resolve)

---

## PHASE 6: Polish

### Task 14: Update FAQ text

**File:** `src/lib/settings/defaults.ts` (line 33)

Change "Montana MLS requirements, with more states coming soon" to mention Ohio.

### Task 15 (Optional): Ohio property presets

Add Columbus suburban, Cleveland lakefront, Cincinnati historic presets for the generation UI.

---

## Ohio-Specific Prohibited Terms

### Military / Veteran Status (NEW Category -- ORC §4112.02)

**Hard violations:**
| Term | Law | Alternative |
|------|-----|-------------|
| no veterans | ORC §4112.02(H) | all applicants welcome |
| no military | ORC §4112.02(H) | all welcome |
| civilian tenants only | ORC §4112.02(H) | remove entirely |
| no active duty | ORC §4112.02(H) | all applicants welcome |
| military not welcome | ORC §4112.02(H) | remove entirely |
| no National Guard | ORC §4112.02(H) | all applicants welcome |
| no reservists | ORC §4112.02(H) | all applicants welcome |
| perfect for military families | ORC §4112.02(H) | spacious home |
| civilian tenants preferred | ORC §4112.02(H) | remove entirely |
| no deployments | ORC §4112.02(H) | remove entirely |
| non-military preferred | ORC §4112.02(H) | remove entirely |
| military families not preferred | ORC §4112.02(H) | remove entirely |
| no military housing allowance | ORC §4112.02(H) | income verification required |

**Soft warnings:**
| Term | Law | Alternative |
|------|-----|-------------|
| military housing | ORC §4112.02(H) | describe property features |
| near military base | ORC §4112.02(H) | use actual base name |
| veteran community | ORC §4112.02(H) | established community |
| military community | ORC §4112.02(H) | describe location features |
| military town | ORC §4112.02(H) | name the city/area |
| veteran housing | ORC §4112.02(H) | describe property features |
| military discount | ORC §4112.02(H) | describe actual pricing |
| veteran-friendly | ORC §4112.02(H) | all welcome |

### Ancestry Terms (Under race-color-national-origin -- ORC §4112.02)

**Hard violations:**
| Term | Law | Alternative |
|------|-----|-------------|
| Appalachian area | ORC §4112.02(H)(7) | neighborhood |
| no Appalachians | ORC §4112.02(H)(7) | remove entirely |
| hillbilly neighborhood | ORC §4112.02(H)(7) | remove entirely |
| old-country charm | ORC §4112.02(H)(7) | charming character |
| heritage community | ORC §4112.02(H)(7) | established community |

**Soft warnings:**
| Term | Law | Alternative |
|------|-----|-------------|
| Appalachian | ORC §4112.02(H)(7) | describe property features |
| ethnic heritage neighborhood | ORC §4112.02(H)(7) | neighborhood |

### Ohio Steering Additions
| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| board approval | hard | ORC §4112.02(H)(7) | HOA review process |
| membership approval | hard | ORC §4112.02(H)(7) | application process |
| board approval required | hard | ORC §4112.02(H)(7) | HOA review process |
| private | soft | ORC §4112.02(H)(7) | gated |

### Ohio Misleading Claims Additions
| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| guaranteed sale | hard | ORC §4735.18 | marketing services included |
| we guarantee | hard | ORC §4735.18 | we are committed to |
| guaranteed closing | hard | ORC §4735.18 | smooth transaction process |
| no commission | hard | ORC §4735.18 | disclose actual fee structure |
| free home evaluation | soft | ORC §1345 | complimentary market analysis |

### NAR Settlement Terms (nationwide, Ohio-enforced)
| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| free buyer representation | hard | NAR Settlement 2024 | buyer representation available |
| no cost to buyer | hard | NAR Settlement 2024 | buyer consultation available |
| buyer pays nothing | hard | NAR Settlement 2024 | contact agent for details |
| our services are free | hard | NAR Settlement 2024 | contact agent for details |

---

## Complete File Change Matrix

### NEW Files (5)
| File | Est. Lines |
|------|-----------|
| `src/lib/compliance/terms/ohio.ts` | ~1800 |
| `compliance-docs/state/ohio/ohio-revised-code-4735.md` | ~200 |
| `compliance-docs/state/ohio/ohio-civil-rights-4112.md` | ~150 |
| `compliance-docs/state/ohio/ohio-military-status.md` | ~100 |
| `compliance-docs/state/ohio/ohio-team-advertising.md` | ~80 |

### MODIFIED Files (11)
| File | Change |
|------|--------|
| `src/app/api/compliance/check/route.ts` | Bug fix: prefer `campaign.stateCode` over global settings |
| `src/lib/types/compliance.ts` | Add `'military-status'` to ViolationCategory |
| `src/lib/compliance/agent.ts` | Add `"military-status"` to agent prompt category lists (2 locations) |
| `src/lib/ai/prompt.ts` | Add military-status to categoryLabels |
| `src/components/campaign/violation-details.tsx` | Add military-status colors + labels |
| `src/lib/compliance/terms/montana.ts` | Import ohio, add OH to `complianceConfigs` registry |
| `src/components/admin/compliance-settings-form.tsx` | Add category + state option |
| `src/lib/settings/defaults.ts` | Add category default + FAQ |
| `src/components/admin/compliance-qa/scanner-view.tsx` | Add Ohio to STATES array |
| `src/components/admin/compliance-qa/corpus-view.tsx` | Update default state handling |
| `src/lib/compliance/agent.test.ts` | Add Ohio tests |

**Total: 5 new + 11 modified = 16 files**

---

## Edge Cases and Gotchas

1. **Compliance re-check bug (OPEN):** `/api/compliance/check` ignores `campaign.stateCode`, uses global settings
2. **Agent prompt hardcoded categories:** `agent.ts` lines 66 and 179 have inline category unions -- must add `military-status` to both
3. **Exhaustive Record in prompt.ts:** Will TypeScript-error if military-status not added to categoryLabels
4. **Political beliefs NOT in Ohio:** Must omit from Ohio config
5. **Montana law citations:** Ohio terms must use ORC/federal citations, NOT MCA
6. **Silent Montana fallback:** `compliance-settings.ts` falls back to Montana if state code not found in `complianceConfigs`
7. **Multiple Ohio MLS boards:** Use generic name for v1, per-MLS is future enhancement
8. **Source of income:** Soft warning statewide, hard in ~19 cities (Columbus, Toledo, etc.)
9. **Team name rules:** Licensing requirement, not ad content -- document only
10. **Equal prominence:** Visual rule, can't regex-enforce -- add to AI prompt + presence check
11. **14-day update rule:** Operational concern -- document in compliance docs
12. **NAR Settlement:** No buyer broker compensation on MLS, can't imply "free" services
13. **QA corpus seeding:** Ohio seed properties must cover military-status and ancestry edge cases specifically
14. **Agent temperature:** Must remain 0 for both Montana and Ohio compliance checks (deterministic)

---

## Dependency Graph

```
Phase 0 (bug):    B (compliance check endpoint)
                  |
Phase 1 (types):  1 → 2
                  |
Phase 2 (config): 3 + 4 + 5 → 6 → 7
                              |
Phase 3 (docs):   8 (parallel with Phase 2)
                              |
Phase 4 (QA):     9 + 10 (parallel with Phase 5)
                              |
Phase 5 (tests):  11 + 12 + 13
                              |
Phase 6 (polish): 14 + 15
```

---

## Scope Summary

- **New code:** ~1800 lines (ohio.ts) + ~530 lines (docs) + ~150 lines (tests)
- **Modified code:** ~60 lines across 11 files
- **Risk:** Low -- architecture designed for multi-state, QA backend already state-agnostic
- **Database migrations:** None (schema already supports multi-state)
- **Breaking API changes:** None
- **Backward compatible:** Montana unchanged
- **QA System:** Backend ready, UI needs 2 minor updates, corpus needs Ohio seed data
