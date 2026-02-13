# Fair Housing Compliance System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a tiered fair housing compliance system that teaches the AI why laws exist, validates all generated copy, and gives agents one-click fix tools.

**Architecture:** Three-layer system — markdown legal docs (AI textbook), restructured categorized config (AI cheat sheet), expanded compliance engine (all-platform validation + auto-fix). UI gets global banner, per-platform badges, and expandable violation details.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS, Radix UI, Jest

---

## Team Workstreams

This plan is organized into 3 parallel workstreams for agent team execution. Each workstream has clear file ownership — no two teammates touch the same file.

### Workstream Overview

| Workstream | Teammate | Focus | Files Owned |
|-----------|----------|-------|-------------|
| A: Research & Docs | `researcher` | Write 14 compliance markdown docs with real legal citations | `/compliance-docs/**/*.md` |
| B: Backend | `backend` | Types, config, engine, prompt builder, generate.ts | `src/lib/types/*`, `src/lib/compliance/*`, `src/lib/ai/*` |
| C: Frontend | `frontend` | New UI components, update existing cards, campaign page | `src/components/campaign/*`, `src/app/campaign/[id]/page.tsx` |

### Dependency Graph

```
Workstream A (Researcher) ──────────────────────────────────────→ Done
     │
     │ (docs ready)
     ↓
Workstream B (Backend)
  B1: Types ──→ B2: Config ──→ B3: Engine ──→ B4: Prompt ──→ B5: Generate ──→ Done
     │                │              │
     │ (types ready)  │              │
     ↓                ↓              ↓
Workstream C (Frontend) — starts after B1 (types)
  C1: Badge ──→ C2: Violation Details ──→ C3: Banner ──→ C4: Update Cards ──→ C5: Integration ──→ Done
```

- **A (Researcher)** can start immediately, no dependencies
- **B (Backend)** can start immediately with B1 (types), but B4 (prompt builder) needs A's docs
- **C (Frontend)** starts after B1 (types are defined)

---

## Workstream A: Research & Compliance Docs

**Owner:** `researcher`
**File ownership:** Everything under `/compliance-docs/`

The researcher must produce accurate, well-sourced compliance documentation. Each doc follows the template from the design doc. Legal citations must be real — Fair Housing Act sections, Montana Code Annotated references, HUD guidelines, NAR Code of Ethics articles.

### Task A1: Create directory structure and doc template

**Files:**
- Create: `compliance-docs/TEMPLATE.md`

Create the base directory structure:
```
compliance-docs/
├── federal/
├── state/
│   └── montana/
├── industry/
└── TEMPLATE.md
```

Template content:
```markdown
# [Category Name]

## Law
[Specific law citation — e.g., Fair Housing Act, 42 U.S.C. §3604(c)]

## What It Prohibits
[Plain-English explanation]

## Why It Matters
[Real-world harm, who it protects, consequences of violation]

## Protected Class(es)
[Which protected classes this relates to]

## Examples

### Violations
- "[phrase]" — [why it's a violation]

### Compliant Alternatives
- "[phrase]" — [why it's acceptable]

## Edge Cases
[Borderline scenarios and guidance]

## Sources
- [URL or legal citation]
```

### Task A2: Write federal/fair-housing-overview.md

Research and write a comprehensive overview of the Fair Housing Act (42 U.S.C. §3601-3619). Cover:
- History and purpose (1968 Civil Rights Act, 1988 amendments)
- The 7 federal protected classes
- What §3604(c) specifically says about advertising
- HUD advertising guidelines (24 CFR Part 100)
- Penalties for violations
- How it applies to real estate marketing specifically

### Task A3: Write federal/steering.md

Research steering laws thoroughly. Cover:
- Legal definition of steering under Fair Housing Act
- How advertising language can constitute steering
- Examples: neighborhood demographics, school quality as proxy for race, "safe area" as coded language
- Key HUD enforcement cases
- 15-20 prohibited terms/phrases with explanations of WHY each is steering

### Task A4: Write federal/familial-status.md

Research familial status protections (added 1988). Cover:
- What familial status means legally (families with children under 18, pregnant women, people securing custody)
- Housing for Older Persons Act (HOPA) exemption
- Why "family neighborhood," "perfect for couples," "adult community" are problematic
- 10-15 prohibited terms/phrases with explanations

### Task A5: Write federal/disability.md

Research disability protections under FHA. Cover:
- Physical and mental disabilities covered
- Reasonable accommodation and modification requirements
- Why descriptive language about accessibility can be discriminatory (e.g., "must be able to climb stairs")
- 10-15 prohibited terms/phrases with explanations

### Task A6: Write federal/race-color-national-origin.md

Research race, color, and national origin protections. Cover:
- Historical context — these were the original 1968 protections
- How neighborhood descriptions can be proxies for race
- "Ethnic" food, cultural references, demographic descriptions
- 15-20 prohibited terms/phrases with explanations

### Task A7: Write federal/religion.md

Research religious protections in housing advertising. Cover:
- Why religious landmarks as selling points are problematic
- "Walking distance to church/synagogue/mosque"
- Holiday-specific marketing concerns
- 10-15 prohibited terms/phrases with explanations

### Task A8: Write federal/sex-gender.md

Research sex/gender protections. Cover:
- Original 1974 addition of sex as protected class
- 2021 executive order extending to sexual orientation and gender identity
- Gendered language in listings ("bachelor pad," "man cave," "mother-in-law suite" debate)
- 10-15 prohibited terms/phrases with explanations

### Task A9: Write federal/advertising-rules.md

Research HUD advertising guidelines specifically. Cover:
- 24 CFR Part 100 Subpart C — Discriminatory Advertising
- The "ordinary reader" test
- Human models in advertising guidance
- Fair Housing logo requirements
- Equal Housing Opportunity statement requirements
- Publisher liability

### Task A10: Write state/montana/human-rights-act.md

Research Montana Human Rights Act (MCA §49-2-305). Cover:
- How Montana law extends beyond federal protections
- Montana Human Rights Bureau enforcement
- State-specific penalties and complaint process
- Montana-specific advertising requirements

### Task A11: Write state/montana/age-protections.md

Research Montana age protections in housing. Cover:
- MCA §49-2-305 age provisions
- How this differs from federal (federal only covers familial status, not age directly)
- "Young professionals," "retiree community," age-targeting language
- 5-10 prohibited terms/phrases

### Task A12: Write state/montana/marital-status.md

Research Montana marital status protections. Cover:
- MCA §49-2-305 marital status provisions
- "Perfect for couples," "singles welcome," "newlyweds" language
- How this intersects with familial status
- 5-10 prohibited terms/phrases

### Task A13: Write state/montana/political-beliefs.md

Research Montana political beliefs protections (unique to Montana). Cover:
- MCA §49-2-305 political beliefs provisions
- Why this is unusual (most states don't protect this)
- Neighborhood political descriptions, HOA political rules
- 5-10 prohibited terms/phrases

### Task A14: Write industry/nar-ethics-guidelines.md

Research NAR Code of Ethics Article 10 and related standards. Cover:
- NAR Standard of Practice 10-1 through 10-5
- NAR advertising guidelines beyond legal requirements
- MLS system rules about listing descriptions
- Professional standards that go beyond legal minimums
- Terms NAR flags that aren't necessarily illegal but are risky

### Task A15: Write industry/common-pitfalls.md

Research common real estate advertising mistakes. Cover:
- "Master bedroom" debate and current industry guidance
- Describing neighborhoods by demographics vs. amenities
- School quality references as proxy for racial composition
- Accessibility descriptions that inadvertently exclude
- Social media-specific pitfalls (hashtags, emoji use)
- Photo/image selection concerns

### Task A16: Compile master term list

After all docs are written, create a `compliance-docs/MASTER-TERM-LIST.md` that compiles ALL prohibited terms/phrases from all docs into a single reference organized by category. Each entry must have:
- The term/phrase
- Category
- Severity (hard/soft)
- Short explanation (one sentence)
- Law citation
- Suggested alternative

This becomes the source of truth for the backend team's config.

---

## Workstream B: Backend

**Owner:** `backend`
**File ownership:** `src/lib/types/*`, `src/lib/compliance/*`, `src/lib/ai/*`

### Task B1: Restructure compliance types

**Files:**
- Modify: `src/lib/types/compliance.ts`
- Modify: `src/lib/types/campaign.ts`

Update `compliance.ts` — replace the simple `MLSComplianceConfig` with:

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
  context: string; // surrounding text snippet
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
```

Update `campaign.ts` — change `mlsComplianceChecklist: ComplianceCheckItem[]` to `complianceResult: CampaignComplianceResult`. Remove the old `ComplianceCheckItem` interface.

### Task B2: Build the categorized term config

**Files:**
- Modify: `src/lib/compliance/montana.ts`

**Depends on:** B1 (types), and ideally A16 (master term list) for accuracy. Can start with a partial list and update when researcher delivers the master list.

Restructure `montana.ts` to use the new `ProhibitedTerm` interface. Expand from 9 terms to 80-100+ organized by category. Each term must have a real law citation, a clear explanation, and a compliant alternative.

The config should also declare its doc paths:
```typescript
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
    'compliance-docs/state/montana/human-rights-act.md',
    'compliance-docs/state/montana/age-protections.md',
    'compliance-docs/state/montana/marital-status.md',
    'compliance-docs/state/montana/political-beliefs.md',
  ],
  industry: [
    'compliance-docs/industry/nar-ethics-guidelines.md',
    'compliance-docs/industry/common-pitfalls.md',
  ],
}
```

### Task B3: Rebuild the compliance engine

**Files:**
- Modify: `src/lib/compliance/index.ts`
- Modify: `src/lib/compliance/compliance.test.ts`

**Depends on:** B1, B2

Major rewrite of the compliance engine:

1. **`checkAllPlatforms(campaign, config)`** — Iterates through every text field in the CampaignKit (instagram.professional, instagram.casual, instagram.luxury, facebook.*, twitter, googleAds[].headline, googleAds[].description, metaAd.*, magazineFullPage.*.headline, magazineFullPage.*.body, magazineFullPage.*.cta, magazineHalfPage.*, postcard.*.front.*, postcard.*.back, zillow, realtorCom, homesComTrulia, mlsDescription, hashtags, callsToAction, targetingNotes, sellingPoints). Returns `CampaignComplianceResult`.

2. **`findViolations(text, platform, config)`** — Checks a single text string against all prohibited terms. Uses smarter matching:
   - Word boundary regex: `\b${term}\b` (not just substring includes)
   - Handles hyphenated variants: "family-friendly" matches "family friendly"
   - Case-insensitive
   - Returns context snippet (30 chars before and after the match)

3. **`autoFixText(text, violations)`** — Takes text and its violations, returns new text with flagged terms replaced by their suggested alternatives. Case-preserving replacement (if original was capitalized, replacement is too).

4. **`autoFixCampaign(campaign, complianceResult)`** — Applies autoFixText across all violated platforms. Returns a new CampaignKit with fixes applied.

5. **`loadComplianceDocs(config)`** — Reads the markdown files listed in config.docPaths using `fs.readFile`. Returns concatenated content for prompt injection. Handles missing files gracefully (logs warning, continues without).

6. Keep backward compatibility: `getComplianceConfig()`, `getDefaultCompliance()` still work.

**Tests must cover:**
- Word boundary matching (no false positives)
- Hyphenated variant matching
- Case-insensitive matching
- Context snippet extraction
- Auto-fix preserves case
- Auto-fix handles multiple violations in same text
- All platform fields are checked (none missed)
- Missing doc files handled gracefully
- Hard vs. soft severity correctly categorized
- Total counts are accurate

### Task B4: Update the prompt builder

**Files:**
- Modify: `src/lib/ai/prompt.ts`
- Modify: `src/lib/ai/__tests__/prompt.test.ts`

**Depends on:** B1, B2, B3, and A (docs should be ready)

Update `buildGenerationPrompt()` to compose the dual-layer compliance section:

**Layer 1 — Cheat Sheet:** Generated from the config. Organized by category. Each entry shows: term, why it's problematic (short), what to say instead.

**Layer 2 — Textbook:** The full markdown docs loaded via `loadComplianceDocs()`. Injected as a reference section the AI can draw on for understanding nuance and edge cases.

The prompt should explicitly instruct the AI:
- "You have been trained on fair housing law. The following section explains WHY certain language is prohibited, not just WHAT is prohibited."
- "Use your understanding of these principles to avoid violations even for terms not explicitly listed."
- "Apply these rules to ALL output — every platform, every tone variant."

Also handle the graceful fallback: if state docs don't exist, include a note in the prompt that only federal + industry guidelines are available for this state.

### Task B5: Update generate.ts

**Files:**
- Modify: `src/lib/ai/generate.ts`
- Modify: `src/lib/ai/__tests__/generate.test.ts`

**Depends on:** B1, B3, B4

Update `generateCampaign()`:
1. Replace `checkCompliance(generated.mlsDescription)` with `checkAllPlatforms(campaign, config)` — validate the entire campaign kit
2. Store result as `complianceResult: CampaignComplianceResult` instead of `mlsComplianceChecklist`
3. The prompt now includes the full compliance context from B4

---

## Workstream C: Frontend

**Owner:** `frontend`
**File ownership:** `src/components/campaign/*`, `src/app/campaign/[id]/page.tsx`

### Task C1: Create compliance-badge.tsx

**Files:**
- Create: `src/components/campaign/compliance-badge.tsx`

**Depends on:** B1 (needs the types)

A small inline component that shows compliance status for a single platform:
- Green checkmark icon if no violations
- Red badge with count if hard violations exist
- Amber badge with count if only soft warnings
- Clicking it scrolls to or expands the violation details for that platform

Props: `{ result: PlatformComplianceResult }`

### Task C2: Create violation-details.tsx

**Files:**
- Create: `src/components/campaign/violation-details.tsx`

**Depends on:** B1, C1

An expandable panel that shows violation details:
- Collapsible by default (click badge to expand)
- Lists each violation:
  - Term highlighted in context snippet
  - Category tag (colored by category)
  - Severity indicator (red dot for hard, amber for soft)
  - Short explanation text
  - "Learn more" expandable section (shows full legal context — could pull from compliance docs or just show the law citation + longer explanation)
  - "Replace" button next to each violation — replaces that single term with the suggested alternative
- After replacing, the violation visually updates to show "Fixed"

Props: `{ violations: ComplianceViolation[], onReplace: (platform, oldTerm, newTerm) => void }`

### Task C3: Create compliance-banner.tsx

**Files:**
- Create: `src/components/campaign/compliance-banner.tsx`

**Depends on:** B1, C1, C2

A full-width banner at the top of the campaign page:
- Shows: "X/Y checks passed" with breakdown of hard violations and soft warnings
- Green background + checkmark if all passed
- Red background if any hard violations, amber if only soft warnings
- "Fix All" button that triggers auto-fix across entire campaign
- After fix, banner updates to reflect new state
- Subtle animation on state change

Props: `{ result: CampaignComplianceResult, onFixAll: () => void }`

### Task C4: Update existing ad cards

**Files:**
- Modify: `src/components/campaign/ad-card.tsx`
- Modify: `src/components/campaign/google-ads-card.tsx`
- Modify: `src/components/campaign/meta-ad-card.tsx`
- Modify: `src/components/campaign/print-ad-card.tsx`
- Modify: `src/components/campaign/postcard-card.tsx`
- Modify: `src/components/campaign/marketing-card.tsx`
- Modify: `src/components/campaign/mls-card.tsx`

**Depends on:** C1, C2, C3

Add compliance badge to every ad card header. Each card receives its platform's compliance result and renders the badge. When violations exist, the violation-details panel renders below the ad copy within that card.

The `mls-card.tsx` specifically needs a bigger update — replace the old simple checklist with the new violation-details component.

### Task C5: Integrate into campaign page

**Files:**
- Modify: `src/app/campaign/[id]/page.tsx`

**Depends on:** C3, C4, B5

Wire everything together:
1. The campaign page receives the new `complianceResult` from the campaign data
2. Render `ComplianceBanner` at top with the full result
3. Pass per-platform results to each ad card
4. Implement the `onFixAll` handler — calls `autoFixCampaign()` from the compliance engine, updates the campaign state
5. Implement per-term `onReplace` handler — updates a single term in the campaign state
6. After any fix, re-run compliance check to update all badges and the banner

---

## Execution Order Summary

**Phase 1 (parallel start):**
- A1-A15: Researcher writes all compliance docs (can proceed independently)
- B1: Backend defines new types (no dependencies)

**Phase 2 (after B1):**
- B2: Backend builds term config (needs types, ideally A16 for accuracy)
- C1: Frontend starts badge component (needs types)

**Phase 3 (after B2):**
- B3: Backend rebuilds engine (needs types + config)
- C2: Frontend builds violation details (needs types + badge)

**Phase 4 (after B3 + A docs):**
- B4: Backend updates prompt builder (needs engine + docs)
- C3: Frontend builds banner (needs types + badge + details)

**Phase 5 (after B4):**
- B5: Backend updates generate.ts (needs prompt builder)
- C4: Frontend updates all cards (needs banner + badge + details)

**Phase 6 (after B5 + C4):**
- C5: Frontend integrates campaign page (needs everything)
- A16: Researcher compiles master term list (after all docs written)

**Phase 7:**
- Final review: Backend updates B2 config with researcher's master term list
- Full integration test
