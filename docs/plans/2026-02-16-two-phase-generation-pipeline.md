# Two-Phase Generation Pipeline — Design Document

**Date:** 2026-02-16
**Status:** Reviewed — Pending Approval
**Review:** 2-agent design review completed 2026-02-16. Quality reviewer + Integration reviewer. All critical and high issues addressed. See `(Review Fix: XX)` annotations throughout.
**Goal:** Reduce compliance violations in generated ad copy by restructuring the generation pipeline into two distinct phases: creative generation and compliance enforcement.

**Tech Stack:** Next.js 14 (App Router), TypeScript, OpenAI GPT-5.2, Supabase (DB), Jest (tests)

---

## Problem Statement

The current single-prompt generation pipeline produces ad campaigns that frequently contain Fair Housing compliance violations — mostly soft, with occasional hard violations. Root causes:

1. **Competing priorities in one prompt:** The generation prompt asks the model to simultaneously be creative, hit platform formats, follow quality standards, AND comply with Fair Housing law. At temperature 0.7, compliance loses the attention war.
2. **Weak compliance signal in the generation prompt:** The cheat sheet omits severity labels (`hard`/`soft`) and law citations that the compliance agent receives. The model doesn't weight violations as seriously.
3. **Prompt structure:** Compliance rules are sandwiched in the middle of a massive prompt, losing both primacy and recency attention.
4. **Volume amplifies risk:** Generating 20-30+ text blocks (12 platforms x multiple tones) in one call creates many opportunities for slips.
5. **Quality auto-fix can introduce violations:** The quality system edits copy after generation, potentially reintroducing compliance issues that the compliance agent then has to catch.

The compliance agent (post-generation) catches most of these, but the goal is to reduce violations at the source so fewer fixes are needed downstream.

---

## Current Pipeline

```
Generate (GPT-5.2, temp 0.7, single massive prompt)
    ↓
Quality Regex Check (instant pattern matching)
    ↓
Quality AI Scoring (GPT-5.2, async)
    ↓
Quality Auto-Fix (regex fixes + AI rewrites — EDITS THE COPY)
    ↓
Compliance Agent (GPT-5.2, temp 0 — flags/fixes violations)
    ↓
Return campaign
```

**Problems with this flow:**
- Generation prompt has too many competing concerns
- Quality auto-fix edits copy AFTER generation, potentially introducing new violations
- Compliance runs last but has to fix problems from both generation AND quality fixes
- Circular dependency: quality fixes can break compliance, compliance fixes could hurt quality

---

## Proposed Pipeline

```
Phase 1: Creative Generation (GPT-5.2, temp 0.7, lean prompt)
    ↓
Constraint Enforcement (instant — char limits, required disclosures, required fields)
    ↓
Compliance Regex Scan (instant — exact prohibited term matching)
    ↓
Phase 2: Compliance Rewrite (GPT-5.2, temp 0, surgical edits only)
    ↓
Quality Check (regex + AI scoring — READ-ONLY, produces suggestions only)
    ↓
Return campaign + constraintResults + qualitySuggestions
```

### Key Principles

1. **Compliance is the last thing that touches the text.** Nothing edits after Phase 2.
2. **Quality becomes advisory.** Quality issues are surfaced as suggestions for the user, not auto-applied.
3. **Each model call has one job.** Phase 1 is creative. Phase 2 is compliance. No mixed priorities.
4. **Regex pre-screens for the AI.** Exact term matches are found instantly and fed to Phase 2 so the AI can focus on contextual violations.

---

## Multi-State Architecture

The pipeline must be fully state-aware. Each state has different prohibited terms, MLS rules, protected categories, and legal documentation. The system already supports this via:

- **State registry** (`src/lib/compliance/terms/registry.ts`): Maps state codes (MT, OH, ...) to `MLSComplianceConfig` exports
- **Per-state term lists**: Each state file (e.g., `montana.ts`, `ohio.ts`) defines its own prohibited terms, categories, severity levels, MLS name, rules, and required disclosures
- **Per-state doc paths**: Each config has `docPaths.federal` (shared) + `docPaths.state` (state-specific legal docs)
- **Runtime state resolution** (`getComplianceSettings(stateOverride?)`): Resolves from DB settings or override, filters by active categories, returns the correct config

### How state flows through the new pipeline

```
Listing address.state → getComplianceSettings(stateCode)
    ↓
Returns: { config: MLSComplianceConfig, stateCode }
    ↓
Phase 1: Gets state-specific MLS rules (char limits, disclosures) in the lean prompt
    ↓
Compliance Regex: Uses config.prohibitedTerms (state-specific term list)
    ↓
Phase 2: Gets loadComplianceDocs(config) → state-specific federal + state docs
         Gets formatTermsForPrompt(config.prohibitedTerms) → state-specific terms
    ↓
Quality Check: State-agnostic (quality rules are universal)
```

### Federal Term Extraction

Currently, 176 prohibited terms are copy-pasted identically across `montana.ts` and `ohio.ts`. As more states are added, this duplication becomes a maintenance hazard — a fix to one federal term requires updating every state file.

**Current structure:**
```
terms/montana.ts  → 223 terms (176 federal + 47 MT-specific)
terms/ohio.ts     → 217 terms (176 federal + 41 OH-specific)
terms/registry.ts → maps state codes to configs
```

**Proposed structure:**
```
terms/federal.ts  → 176 shared federal terms (NEW)
terms/montana.ts  → 47 MT-specific terms + imports federal
terms/ohio.ts     → 41 OH-specific terms + imports federal
terms/registry.ts → unchanged
```

#### New file: `src/lib/compliance/terms/federal.ts`

```typescript
import { ProhibitedTerm } from '@/lib/types';

// --- Federal Fair Housing Act terms (42 U.S.C. § 3604) ---
// These apply to ALL states. State files import and extend.

export const federalSteeringTerms: ProhibitedTerm[] = [
  // 27 terms...
];

export const federalFamilialStatusTerms: ProhibitedTerm[] = [
  // 27 terms...
];

export const federalDisabilityTerms: ProhibitedTerm[] = [
  // 22 terms...
];

export const federalRaceColorNationalOriginTerms: ProhibitedTerm[] = [
  // 32 terms...
];

export const federalReligionTerms: ProhibitedTerm[] = [
  // 18 terms (the shared subset)...
];

export const federalSexGenderTerms: ProhibitedTerm[] = [
  // 22 terms (the shared subset)...
];

export const federalEconomicExclusionTerms: ProhibitedTerm[] = [
  // 12 terms...
];

export const federalMisleadingClaimsTerms: ProhibitedTerm[] = [
  // 10 terms (only the ones with identical law citations)...
];

/** All federal terms combined. State files spread this + their additions. */
export const allFederalTerms: ProhibitedTerm[] = [
  ...federalSteeringTerms,
  ...federalFamilialStatusTerms,
  ...federalDisabilityTerms,
  ...federalRaceColorNationalOriginTerms,
  ...federalReligionTerms,
  ...federalSexGenderTerms,
  ...federalEconomicExclusionTerms,
  ...federalMisleadingClaimsTerms,
];
```

#### State files become thin overlays

```typescript
// montana.ts (simplified)
import { allFederalTerms, federalReligionTerms } from './federal';

// Montana-specific additions
const montanaAgeTerms: ProhibitedTerm[] = [ /* 18 terms */ ];
const montanaMaritalStatusTerms: ProhibitedTerm[] = [ /* 13 terms */ ];
const montanaCreedTerms: ProhibitedTerm[] = [ /* 14 terms */ ];
const montanaSexGenderAdditions: ProhibitedTerm[] = [ /* 1 term */ ];
const montanaReligionAdditions: ProhibitedTerm[] = [ /* 1 term */ ];

// 6 misleading-claims terms that cite Montana MLS Rules instead of federal-only
const montanaMisleadingClaimsOverrides: ProhibitedTerm[] = [ /* 6 terms */ ];

export const montanaCompliance: MLSComplianceConfig = {
  state: 'Montana',
  mlsName: 'Montana Regional MLS',
  // ...
  prohibitedTerms: [
    ...allFederalTerms,
    ...montanaAgeTerms,
    ...montanaMaritalStatusTerms,
    ...montanaCreedTerms,
    ...montanaSexGenderAdditions,
    ...montanaReligionAdditions,
    ...montanaMisleadingClaimsOverrides,  // state law citations
  ],
};
```

#### Edge case: Misleading-claims law citation split

6 misleading-claims terms (guaranteed appreciation, sure investment, etc.) are shared in concept but cite different state laws:
- Montana: `'Montana MLS Rules; FTC Act §5'`
- Ohio: `'ORC §4735.18; FTC Act §5'`

**Solution:** These 6 terms are NOT in `federalMisleadingClaimsTerms`. Instead, each state file defines them with the correct state law citation. The federal file only contains the 10 terms that are truly identical everywhere (like "act now or miss out" citing only `FTC Act §5`).

#### Adding a new state with this structure

1. Create `src/lib/compliance/terms/{state}.ts`
2. Import `allFederalTerms` from `./federal`
3. Define only state-specific additions (terms unique to that state's civil rights act)
4. Override any federal terms that need state-specific law citations
5. Export the `MLSComplianceConfig` with `[...allFederalTerms, ...stateAdditions, ...stateOverrides]`
6. Register in `registry.ts`

**Benefit:** New state files are ~50-100 lines instead of ~1800+. Federal term fixes propagate automatically.

### Key design rules for multi-state

1. **Regex scanner MUST use the state config's term list, not a hardcoded list.** `scanForProhibitedTerms(campaign, config)` receives the `MLSComplianceConfig` and iterates `config.prohibitedTerms`. When a new state is added, the regex scanner automatically picks up its terms.

2. **Phase 2 prompt MUST load state-specific docs.** `loadComplianceDocs(config)` already resolves `docPaths.state` per config — Ohio gets Ohio docs, Montana gets Montana docs. This flows into the compliance rewrite prompt unchanged.

3. **New states only require a new terms file + registry entry.** The pipeline itself never hardcodes state logic. Adding a new state means:
   - Create `src/lib/compliance/terms/{state}.ts` with `MLSComplianceConfig`
   - Add state-specific docs to `compliance-docs/state/{state}/`
   - Register in `registry.ts`: `{ XX: newStateCompliance }`
   - Everything else (regex scan, Phase 2, quality, admin QA) works automatically

4. **Ohio has `military-status` as a protected category that Montana does not.** The Phase 2 system prompt lists categories generically from the config — it doesn't hardcode which categories exist. State-specific categories flow through `config.prohibitedTerms[].category` and `formatTermsForPrompt`.

5. **MLS rules differ per state** (different MLS names, different max description lengths, different required disclosures). Phase 1 already interpolates these from the config into the generation prompt. No changes needed.

---

## Phase 1: Creative Generation

### Changes to `prompt.ts`

**Remove from the generation prompt:**
- The full Fair Housing cheat sheet (`buildCheatSheet` output)
- The Fair Housing Legal Reference textbook
- Detailed compliance rules and prohibited term lists

**Keep in the generation prompt:**
- Property details
- Quality standards (cheat sheet + textbook)
- MLS rules (character limits, required disclosures)
- Platform output templates
- Output format rules

**Add a lightweight compliance reminder** (replaces the full cheat sheet):
```
## Fair Housing Compliance (Summary)

You are generating real estate advertising copy. All output MUST comply with
the Fair Housing Act (42 U.S.C. § 3604). Key rules:

- NEVER target or exclude based on: race, color, national origin, religion,
  sex, familial status, disability, age, marital status, creed, or military status.
- NEVER use language that steers buyers toward/away from areas based on demographics.
- NEVER describe neighborhoods using safety, crime, or school quality language.
- NEVER use "exclusive," "prestigious," or similar terms that imply exclusion.
- Describe PROPERTY FEATURES, not the people who should live there.
- When in doubt, describe what the home HAS, not who it's FOR.

A compliance review will run after generation. Focus on writing compelling,
platform-native copy. Compliance will be enforced in a second pass.
```

This is enough to keep the model directionally compliant without overwhelming the prompt.

### Changes to `generate.ts`

**System message** — strengthen from the current throwaway:
```
You are a real estate marketing expert specializing in platform-native ad copy.
Generate compelling, specific marketing content. Always respond with valid JSON only.
No markdown, no code fences, no explanatory text.

Important: All copy must comply with the Fair Housing Act. Never target or exclude
based on protected classes. Describe property features, not ideal residents.
```

**Temperature:** Stays at 0.7 for creative output.

---

## Compliance Regex Scan (New)

### New file: `src/lib/compliance/regex-scan.ts`

A fast, synchronous function that scans generated text for exact matches of prohibited terms from the state config.

**Input:** Campaign text (extracted via `extractPlatformTexts`) + `MLSComplianceConfig`
**Output:** List of `{ platform, term, category, severity, position }` matches

**Purpose:** Pre-screen for the compliance AI so it knows what's already broken. This is NOT a replacement for the AI — it only catches exact string matches. Contextual violations (e.g., "perfect for families") require the AI.

**Behavior:**
- Case-insensitive matching
- **Scans ad copy only** — excludes strategy fields (hashtags, CTAs, targetingNotes, sellingPoints). Uses new `extractAdCopyTexts` variant.
- Respects the same allowlist logic the compliance agent uses (e.g., "family room" is acceptable)
- Returns structured results, not fixes (fixing is Phase 2's job)

**Regex strategy (Review Fix: H2):**

Different matching strategies depending on term type:

| Term Type | Strategy | Example |
|-----------|----------|---------|
| Multi-word phrases (2+ words) | Literal phrase match, case-insensitive | `"no children"` → `/\bno\s+children\b/i` |
| Single words | Word boundary `\b` match | `"exclusive"` → `/\bexclusive\b/i` |
| Hyphenated terms | Match with or without hyphen | `"family-friendly"` → `/\bfamily[- ]?friendly\b/i` |

**Allowlist for false positive prevention:**
```typescript
const ALLOWLIST: Record<string, RegExp[]> = {
  'family': [/\bfamily\s+room\b/i, /\bfamily\s+size\b/i],
  'master': [/\bmaster\s+(bedroom|bath|suite)\b/i],
  'walk': [/\bwalk[- ]?in\s+(closet|pantry|shower)\b/i],
};
```

For each match, check if the surrounding context matches an allowlist pattern. If so, skip it.

**Edge cases handled:**
- Apostrophes: `"bachelor's"` matches `"bachelor"` term (strip possessives before matching)
- Compound words: `"churchgoing"` does NOT match `"church"` (word boundary prevents it)
- Terms at start/end of text: `\b` handles these correctly

---

## Phase 2: Compliance Rewrite

### New function in `src/lib/compliance/agent.ts`

```typescript
export async function rewriteForCompliance(
  campaign: CampaignKit,
  config: MLSComplianceConfig,
  regexFindings: RegexScanResult[]
): Promise<{ campaign: CampaignKit; complianceResult: ComplianceAgentResult }>
```

### System Prompt

```
You are a Fair Housing compliance editor for real estate advertising copy.

Your job is SURGICAL: find and replace ONLY non-compliant language. You must:

1. Fix all violations identified by the automated scan (provided below)
2. Find and fix CONTEXTUAL violations that automated scanning missed
   (e.g., "perfect for families" when household-type targeting is prohibited)
3. Preserve the original tone, structure, platform formatting, and character limits EXACTLY
4. Do NOT rewrite sentences that are already compliant
5. Do NOT add disclaimers or compliance language unless required by MLS rules
6. Do NOT change the marketing angle or selling points — only the problematic words/phrases

IMPORTANT CONTEXT RULES:
- "family room" (describing a room type) is ACCEPTABLE
- "perfect for families" (targeting household type) is a VIOLATION
- Consider INTENT and CONTEXT, not just word matching

Return a JSON object with two keys:
{
  "rewrittenTexts": {
    "<platform>": "<fixed text>"
    // Only include platforms that were modified. Omit unchanged platforms.
  },
  "complianceResult": {
    // Same ComplianceAgentResult structure as today
    "platforms": [...],
    "campaignVerdict": "compliant" | "needs-review" | "non-compliant",
    "violations": [...],
    "autoFixes": [...],
    "totalViolations": number,
    "totalAutoFixes": number
  }
}
```

### User Prompt

```
COMPLIANCE DOCUMENTATION:
{complianceDocs}

PROHIBITED TERMS:
{formattedTerms}

AUTOMATED SCAN FINDINGS (exact matches already detected):
{regexFindings formatted as list}

CAMPAIGN TEXTS TO REVIEW AND FIX:
{platformTexts}

Fix all violations — both the automated findings above and any contextual
violations you detect. Return only modified platforms in rewrittenTexts.
```

### Granularity and Merge Logic (Review Fix: C1)

Phase 2 operates at the **same granularity as `extractPlatformTexts`** — individual tone/variant keys like `instagram.professional`, `instagram.casual`, `googleAds[0].headline`, etc. NOT platform-level blobs.

**The `rewrittenTexts` object uses dot-notation keys matching `extractPlatformTexts` output:**
```json
{
  "rewrittenTexts": {
    "instagram.casual": "Fixed casual caption text...",
    "facebook.luxury": "Fixed luxury post text...",
    "googleAds[1].headline": "Fixed headline"
  }
}
```

**Merge function** (`applyRewrittenTexts`):
1. For each key in `rewrittenTexts`, parse the dot-notation path
2. Navigate the `CampaignKit` object to the correct nested field
3. Replace the string value at that path
4. Validate: the replacement must be a string, the path must exist in the campaign
5. If a key doesn't match a valid path → log warning, skip (don't corrupt the campaign)

This ensures no nested structures are overwritten with flat strings. The merge function must be tested with every platform shape (nested objects, arrays, flat strings).

### Failure Handling (Review Fix: C2)

If Phase 2 fails (API error, malformed JSON, timeout, or `callWithRetry` exhausted):

1. **Return the original un-rewritten campaign** (from Phase 1)
2. **Set `complianceResult.campaignVerdict` to `'needs-review'`**
3. **Set `complianceResult.complianceRewriteApplied: false`** (new field)
4. **Log the error to the server** with full context: error type, platform count, state code, and the regex pre-scan findings (so we know what was supposed to be fixed)
5. **The UI checks `complianceRewriteApplied`** — if `false`, shows a warning banner: "Compliance review could not be completed. This campaign should be manually reviewed before use."

The user is notified and the campaign is never silently returned as if it were compliant.

```typescript
// In ComplianceAgentResult type, add:
complianceRewriteApplied?: boolean; // false = Phase 2 failed, output is un-rewritten
```

### Behavior

- **Temperature: 0** — deterministic, no creative drift
- **Model: GPT-5.2** — same as current compliance agent
- **`max_completion_tokens`:** Calculated proportional to platform count, similar to Phase 1's `getMaxCompletionTokens` but accounting for the compliance result JSON overhead (~500 tokens). Formula: `platformCount * 800 + 2000` (each platform rewrite averages ~800 tokens, plus compliance result structure).
- Receives regex findings so it doesn't need to re-discover exact matches
- Returns both the fixed texts AND the compliance result in one call (saves a round trip vs current approach of fixing then re-checking)
- Only returns modified platform keys at tone/variant granularity — caller merges via `applyRewrittenTexts`
- `callWithRetry` wrapper for rate limit resilience
- **Strategy fields (hashtags, CTAs, targetingNotes, sellingPoints) are excluded** from the texts sent to Phase 2. These are internal strategy metadata, not consumer-facing ad copy. The regex scanner also skips them. (Review Fix: M1)

---

## Quality System Changes

### Quality check becomes read-only

**Modify:** `src/lib/quality/engine.ts` (or wherever `autoFixQuality` lives)

**Remove:** `autoFixQuality` from the pipeline (keep the function for potential future use)

**Keep:**
- `checkAllPlatformQuality` (regex patterns) — runs as-is, produces findings
- `scoreAllPlatformQuality` (AI scoring) — runs as-is, produces scores
- `mergeQualityResults` — runs as-is, merges regex + AI results

**New:** `buildQualitySuggestions(mergedResults): QualitySuggestion[]`

Transforms the merged quality results into user-facing suggestions:

```typescript
interface QualitySuggestion {
  id: string;
  platform: string;
  category: string;           // e.g., "filler-words", "generic-cta", "weak-hook"
  severity: 'low' | 'medium' | 'high';
  issue: string;              // What's wrong
  currentText: string;        // The problematic text
  suggestedRewrite?: string;  // Optional AI-suggested fix
  explanation: string;        // Why this matters
}
```

### Campaign type changes

**Modify:** `src/lib/types/campaign.ts`

```typescript
// Add to CampaignKit
qualitySuggestions?: QualitySuggestion[];

// Keep existing qualityResult for backward compat during transition
qualityResult?: QualityResult;
```

---

## Updated `generateCampaign` Flow

```typescript
export async function generateCampaign(listing, options): Promise<CampaignKit> {
  // --- Phase 1: Creative Generation ---
  const prompt = await buildGenerationPrompt(listing, options);  // leaner prompt
  const rawCampaign = await callOpenAI(prompt, { temp: 0.7 });
  let campaign = buildCampaignKit(rawCampaign, listing, options);

  // --- Constraint Enforcement (instant) ---
  // Auto-fix hard constraints: char limits, required disclosures, required fields
  const { campaign: constrainedCampaign, constraints } = enforceConstraints(campaign, config);
  campaign = constrainedCampaign;

  // --- Compliance Regex Pre-Scan ---
  // Scans ad copy only (excludes strategy fields: hashtags, CTAs, targeting, selling points)
  const regexFindings = scanForProhibitedTerms(campaign, config);

  // --- Phase 2: Compliance Rewrite ---
  try {
    const { campaign: compliantCampaign, complianceResult } =
      await rewriteForCompliance(campaign, config, regexFindings);
    campaign = compliantCampaign;
    campaign.complianceResult = { ...complianceResult, complianceRewriteApplied: true, source: 'rewrite' };
  } catch (error) {
    // Phase 2 failed — return original with warning (Review Fix: C2)
    console.error('Phase 2 compliance rewrite failed:', error, { stateCode, platformCount });
    campaign.complianceResult = {
      platforms: [], campaignVerdict: 'needs-review',
      violations: [], autoFixes: [],
      totalViolations: regexFindings.length, totalAutoFixes: 0,
      complianceRewriteApplied: false, source: 'rewrite',
    };
  }

  // --- Quality Check (read-only — suggestions only) ---
  const regexQuality = checkAllPlatformQuality(campaign);
  const aiQuality = await scoreAllPlatformQuality(campaign, listing, demographic, tone);
  const mergedQuality = mergeQualityResults(regexQuality, aiQuality);
  const qualitySuggestions = buildQualitySuggestions(mergedQuality);

  // --- Return ---
  return {
    ...campaign,
    qualityConstraints: constraints,
    qualitySuggestions,
  };
}
```

---

## Admin QA Panel Impact

### Unaffected (no code changes)

- **Snapshot mode** (`/api/admin/compliance-qa/run` with `mode: 'snapshot'`): Calls `scanTextWithAgent` directly on pre-approved text. Does not touch `generateCampaign`. Completely unaffected.
- **Scan route** (`/api/admin/compliance-qa/scan`): Calls `scanTextWithAgent` directly for ad-hoc text checking. Completely unaffected.
- **Corpus management** (CRUD routes): No interaction with generation pipeline. Unaffected.
- **Run history** (`/api/admin/compliance-qa/runs`): Read-only listing of past runs. Unaffected.

### Requires Update

**1. Full-pipeline mode** (`/api/admin/compliance-qa/run` with `mode: 'full-pipeline'`):

Currently reads `campaign.qualityResult?.improvementsApplied` to count quality fixes applied per property. Since quality no longer auto-fixes, this field will be absent or zero.

Changes needed:
- Read `campaign.qualitySuggestions?.length ?? 0` instead of `campaign.qualityResult?.improvementsApplied ?? 0`
- Update `PropertyTestResult` type: add `qualitySuggestionsCount: number`, deprecate `qualityFixesApplied`
- Update the `RunSummary` aggregation if it totals quality fixes across properties
- Consider adding `regexFindingsCount` to track how many exact-match violations the regex pre-scan caught (useful for measuring whether the generation prompt is improving over time)

**2. Snapshot creation** (`/api/admin/compliance-qa/snapshots/[propertyId]` POST):

Calls `generateCampaign` — automatically gets the new pipeline. No code changes needed. But note: snapshots generated after this change will be compliance-rewritten (Phase 2 cleaned), while older snapshots were not. This is actually better for regression testing since snapshots represent "final output."

**3. Test result interpretation changes:**

The QA panel currently uses violations found by the compliance agent as the primary pass/fail signal. With the new pipeline:
- **Full-pipeline mode:** `campaign.complianceResult` now comes from Phase 2 (the rewrite step), so it reports violations that were *found and fixed*, not just found. A `compliant` verdict means Phase 2 successfully cleaned the output. A `needs-review` or `non-compliant` verdict means Phase 2 couldn't fix everything — which is a more serious signal than before.
- **Snapshot mode:** Unchanged — still runs `scanTextWithAgent` on static text.

**Recommendation:** Add a new metric to full-pipeline results: `preComplianceViolations` (count from the regex pre-scan) vs `postComplianceViolations` (count from the Phase 2 result). This shows how many violations Phase 1 generated AND how many Phase 2 successfully fixed — giving visibility into whether the generation prompt is improving over time.

### Multi-State Testing Considerations

The admin QA corpus already stores `state` per test property and the run route passes `state` to `getComplianceSettings`. This means:

- Full-pipeline runs already generate campaigns against the correct state config
- Snapshot-mode runs already scan with the correct state's terms
- **No changes needed** for multi-state test execution

However, consider these improvements for Phase B:
- Add a `regexScanResult` field to `PropertyTestResult` so the admin can see which violations were caught by regex vs AI (helps tune the term lists per state)
- Ensure test corpus has adequate coverage per state — if all test properties are Montana, Ohio-specific violations won't be tested
- Add a "run by state" filter option if not already present (it is — `state` query param on `/runs`)

---

## UI/Campaign Page Impact

### "Fix All" Button Redesign (Review Fix: C3)

The current `ComplianceBanner` has a "Fix All" button that calls `/api/compliance/check` → `checkComplianceWithAgent`. In the new pipeline, Phase 2 already attempted to fix all violations. If the campaign comes back `needs-review` or `non-compliant`, those are violations Phase 2 *couldn't* fix.

**New behavior:**

| Phase 2 Verdict | Banner State | User Action |
|----------------|-------------|-------------|
| `compliant` | Green: "All compliance checks passed" | No action needed |
| `needs-review` | Yellow: "X items need manual review" | User edits individual ads (see below) |
| `non-compliant` | Red: "X hard violations require attention" | User edits individual ads |
| Phase 2 failed (`complianceRewriteApplied: false`) | Red: "Compliance review could not be completed" | User can retry or edit manually |

**Replace "Fix All" with per-ad editing:**
- Remove the blanket "Fix All" button
- Each violation is shown inline on the specific ad card where it occurs
- User can click "Edit" on a specific ad → opens an edit modal with the flagged text highlighted
- After editing, the modified text is sent to `scanTextWithAgent` for a compliance re-check
- If the edit passes → save. If not → show what's still wrong.

This gives the user control over which ads to adjust, rather than a black-box "Fix All" that re-runs the entire compliance agent. **This is a discussion point — the exact UX for per-ad editing should be designed in Phase C.**

**Update to `/api/compliance/check` route:**
- Keep the route for the scan tool and ad-hoc checks
- Add an optional `rewrite: true` parameter that calls `rewriteForCompliance` instead of `checkComplianceWithAgent` — this lets the UI offer a "Retry compliance fix" button for Phase 2 failures
- The route already respects `campaign.stateCode` (fixed in the Ohio compliance implementation)

### Hard Constraints vs Advisory Suggestions (Review Fix: H3)

Not all quality issues are equal. Some are subjective ("this hook is weak") and belong as suggestions. Others are **objective, hard constraints** that will cause platform rejections or legal issues:

- **Character limit violations** (MLS max description length, tweet max 280 chars, Google Ads headline max 30 chars)
- **Required disclosures missing** (MLS-mandated license numbers, brokerage info)
- **Required fields empty** (platform requires a headline but it's blank)

These must be auto-enforced, not suggested.

**Split quality results into two categories:**

```typescript
interface QualityConstraintViolation {
  id: string;
  platform: string;
  type: 'character-limit' | 'missing-disclosure' | 'missing-required-field';
  severity: 'critical';        // always critical — these break things
  issue: string;               // "MLS description is 1247 chars, max is 1000"
  currentText: string;
  autoFixed: boolean;          // true if we truncated/added disclosure automatically
  fixedText?: string;          // the auto-fixed version (if autoFixed)
}

interface QualitySuggestion {
  id: string;
  platform: string;
  category: string;            // "filler-words", "generic-cta", "weak-hook"
  severity: 'low' | 'medium' | 'high';
  issue: string;
  currentText: string;
  suggestedRewrite?: string;
  explanation: string;
}
```

**Pipeline adjustment:**

```
Phase 1: Creative Generation
    ↓
Constraint Enforcement (instant — character limits, required disclosures, required fields)
    ↓
Compliance Regex Scan
    ↓
Phase 2: Compliance Rewrite (operates on constraint-enforced text)
    ↓
Quality Check (read-only — produces suggestions only)
    ↓
Return campaign + constraintResults + qualitySuggestions
```

Constraint enforcement runs BEFORE Phase 2 so the compliance rewrite doesn't operate on text that's about to be truncated. Constraints are auto-fixed (truncation, disclosure insertion) — not suggestions.

**Add to `CampaignKit`:**
```typescript
qualityConstraints?: QualityConstraintViolation[];  // auto-enforced, reported for visibility
qualitySuggestions?: QualitySuggestion[];            // advisory, user applies manually
```

### New: Quality Suggestions Panel

Quality suggestions (advisory only — not constraints) displayed in the campaign view:

- Show suggestions grouped by platform as collapsible cards
- Each card shows: issue category, severity badge, current text, suggested rewrite
- "Apply" button on each suggestion → triggers a mini compliance check on the edited text before committing
- "Dismiss" button to acknowledge and skip
- Counter badge showing remaining suggestions (e.g., "5 suggestions")

### New: Constraints Report

Auto-enforced constraints shown as an info section (not actionable — already fixed):

- "3 character limits auto-truncated"
- "1 required disclosure added"
- Expandable to show details of what was changed

### Existing: Compliance Badge

- No changes needed to `complianceResult` structure
- Badge should show fewer violations now since Phase 2 fixes them before returning
- Add handling for `complianceRewriteApplied: false` → show warning state

### Per-Platform Quality Badges (Review Fix: H4)

The 6 platform card components (`instagram-card`, `facebook-card`, etc.) accept a `qualityResult` prop via `AdCardWrapper`, but it's **currently never populated from the campaign page** (pre-existing gap — `campaign-tabs.tsx` passes `complianceResult` but not `qualityResult`).

**Decision for Phase C:** Wire up per-platform quality badges using the new `qualitySuggestions` data, filtered by platform. Each card shows a small badge: "2 suggestions" that expands to show the platform-specific suggestions inline.

### Apply-Suggestion Flow

When a user applies a quality suggestion:
1. Show loading state on the suggestion card ("Checking compliance...")
2. Replace the text in the campaign locally
3. Call `scanTextWithAgent` on ONLY the modified text to verify compliance
4. If compliant → commit the change, remove suggestion from list
5. If non-compliant → show warning with the specific violation, revert the text, keep suggestion in list
6. If API error → show error toast, revert the text, keep suggestion in list

Suggestions are NOT removed optimistically — wait for compliance confirmation. Only one suggestion can be applied at a time (sequential, not parallel) to avoid race conditions on the campaign state.

### Orphaned Components (Review Fix: H6)

`quality-banner.tsx` reads `improvementsApplied` but is not imported anywhere in the codebase. **Add to cleanup checklist:** delete this file in Phase C, or redesign it to show the constraints report + suggestion count.

---

## Performance & Cost

| Metric | Current Pipeline | Proposed Pipeline | Delta |
|--------|-----------------|-------------------|-------|
| OpenAI calls (generation) | 1 | 2 (Phase 1 + Phase 2) | +1 call |
| OpenAI calls (quality) | 1 (scoring) | 1 (scoring, same) | No change |
| OpenAI calls (compliance) | 1 (agent check) | 0 (merged into Phase 2) | -1 call |
| **Net OpenAI calls** | **3** | **3** | **Same** |
| Latency | ~8-12s total | ~8-12s total (Phase 2 replaces standalone compliance) | ~Same |
| Regex scans | 1 (quality) | 2 (quality + compliance) | +1 instant scan |

**Net API call count: same (3).** Phase 2 replaces the standalone compliance agent call. The regex pre-scan and constraint enforcement are free (run locally). Quality scoring is unchanged.

**Token cost note (Review Fix: M4):** Phase 2 will use more output tokens than the old compliance agent because it returns rewritten text (the old agent only returned a report). For 12 platforms x 3 tones, this could be 8-12K additional output tokens. However, the old `autoFixQuality` AI rewrite step is removed, which offsets some of this. Net cost increase is estimated at ~15-25% per generation — acceptable given the compliance quality improvement.

---

## Migration Strategy

### Phase A: Prompt Tightening (Can ship independently)

1. Add severity labels and law citations to `buildCheatSheet` in `prompt.ts`
2. Move compliance rules to end of generation prompt (recency bias)
3. Strengthen system message in `generate.ts`

This is a standalone improvement with zero architectural changes. Ship it first, measure impact.

### Phase B: Two-Phase Pipeline

1. Create `src/lib/compliance/regex-scan.ts` + tests
2. Create `rewriteForCompliance` function in `agent.ts` + tests
3. Refactor `generateCampaign` to the new flow
4. Convert `autoFixQuality` results to `QualitySuggestion[]` + tests
5. Update campaign types (`CampaignKit`, `PropertyTestResult`, `RunSummary`)
6. Update admin QA full-pipeline mode to read new fields
7. Mark deprecated code (`autoFixQuality`, `buildCheatSheet`, old type fields)
8. Update existing tests (prompt, generate, quality, admin QA)
9. Run full-pipeline QA to verify — compare violation rates before/after

### Phase B.5: Federal Term Extraction

1. Create `src/lib/compliance/terms/federal.ts` with 176 shared terms
2. Refactor `montana.ts` to import federal + define only MT-specific (47 terms)
3. Refactor `ohio.ts` to import federal + define only OH-specific (41 terms)
4. Handle the 6 misleading-claims law citation overrides per state
5. Add `federal.test.ts` — verify term counts, no duplicates
6. Update `ohio.test.ts` and add `montana.test.ts` — verify total counts unchanged
7. Run snapshot-mode QA to verify identical scan results (same terms = same output)
8. Delete duplicated term arrays from state files

**This phase can ship independently of Phase B.** It's a pure refactor with no behavioral changes — the final `prohibitedTerms` array is identical before and after. Can be done before or after the pipeline change.

### Phase C: UI Quality Suggestions

1. Build quality suggestions panel component
2. Add apply-suggestion flow with compliance re-check
3. Update campaign page layout
4. Handle backward compatibility — old campaigns without `qualitySuggestions` display gracefully
5. Handle historical QA runs with `qualityFixesApplied` instead of `qualitySuggestionsCount`

---

## Cleanup Checklist

A refactor this size creates opportunities for loose ends. This section tracks everything that must be cleaned up to leave the codebase tidy.

### Dead Code Removal

| Item | Location | Action |
|------|----------|--------|
| `checkComplianceWithAgent` (old standalone check) | `src/lib/compliance/agent.ts` | **Keep but mark `@deprecated`.** Still used by `scanTextWithAgent` and snapshot mode. Only the campaign-level call in `generate.ts` is replaced by `rewriteForCompliance`. Remove the deprecation warning once all callers migrate. |
| `autoFixQuality` function | `src/lib/quality/engine.ts` (or index) | **Remove from pipeline, keep the function.** Mark `@deprecated` with a comment explaining it was replaced by advisory suggestions. Delete entirely after one release cycle if no callers remain. |
| `buildCheatSheet` in `prompt.ts` | `src/lib/ai/prompt.ts` | **Remove entirely.** The generation prompt no longer includes the full cheat sheet. The compliance cheat sheet is only used by Phase 2 via `formatTermsForPrompt`. |
| Old compliance section builder in `buildGenerationPrompt` | `src/lib/ai/prompt.ts` | **Replace** the `complianceSection` variable and textbook loading with the lightweight summary. Remove the `loadComplianceDocs` call from this function (Phase 2 handles it now). |
| `categoryLabels` record in `prompt.ts` | `src/lib/ai/prompt.ts` | **Remove** — only used by `buildCheatSheet`. Confirmed no other consumers. (Review: L2) |
| `quality-banner.tsx` | `src/components/campaign/quality-banner.tsx` | **Delete or redesign.** Currently orphaned (not imported anywhere). Reads `improvementsApplied` which will be 0. Either delete in Phase C or redesign to show constraints report + suggestion count. (Review: H6) |
| `qualityResult` prop on card components | `ad-card-wrapper.tsx` + 6 card components | **Evaluate in Phase C.** Prop exists but is never populated from campaign page. Either wire up with new suggestion data or remove the prop. (Review: H4, L5) |

### Deprecated Type Fields

| Field | Type | Action |
|-------|------|--------|
| `qualityResult.improvementsApplied` | `CampaignKit` | **Keep for one release cycle** with `@deprecated` JSDoc. Set to `0` in the new pipeline. Remove after all consumers (admin QA, any stored campaigns in Supabase) have migrated. |
| `qualityResult` (entire field) | `CampaignKit` | **Keep alongside `qualitySuggestions`** during transition. Populate with merged quality data (scores, findings) but with `improvementsApplied: 0`. Remove after the UI and admin panel fully migrate to `qualitySuggestions`. |

### Import Cleanup

After the federal term extraction, state files will have significantly fewer imports and local arrays. Verify:

- [ ] `montana.ts` no longer defines federal terms locally — only imports from `federal.ts` + defines MT-specific
- [ ] `ohio.ts` same treatment
- [ ] No circular imports between `federal.ts` and state files
- [ ] `registry.ts` unchanged — still imports from state files, not federal
- [ ] `prompt.ts` no longer imports `loadComplianceDocs` or `getComplianceSettings` (if compliance section is fully removed from generation prompt). **Check:** `getComplianceSettings` is still needed for MLS rules in Phase 1 — only `loadComplianceDocs` is removed from this file.

### Test Updates

| Test File | Required Changes |
|-----------|-----------------|
| `src/lib/ai/__tests__/prompt.test.ts` | Update expectations — prompt no longer contains cheat sheet, textbook, or detailed compliance terms. Should contain the lightweight summary instead. |
| `src/lib/ai/__tests__/generate.test.ts` | Update mock flow — `generateCampaign` now calls `rewriteForCompliance` instead of `checkComplianceWithAgent`. Mock the new function. Verify `qualitySuggestions` is returned instead of auto-fixed campaign. |
| `src/lib/compliance/agent.test.ts` | Add tests for `rewriteForCompliance`. Keep existing `checkComplianceWithAgent` and `scanTextWithAgent` tests (those functions still exist). |
| `src/lib/quality/quality.test.ts` | Add tests for `buildQualitySuggestions`. Update any tests that assert `autoFixQuality` is called in the pipeline. |
| `src/lib/compliance/terms/__tests__/ohio.test.ts` | Update to verify Ohio imports from `federal.ts` + adds OH-specific terms. Add test: `ohioCompliance.prohibitedTerms.length === allFederalTerms.length + ohioSpecificCount`. |
| **New:** `src/lib/compliance/terms/__tests__/federal.test.ts` | Test federal term counts, verify no duplicate terms, verify all terms have required fields. |
| **New:** `src/lib/compliance/__tests__/regex-scan.test.ts` | Test the new regex scanner: exact matches, case insensitivity, whole-word boundaries, allowlist (e.g., "family room" not flagged). |

### Supabase / Stored Data

Campaigns already stored in Supabase will have the old `qualityResult` shape (with `improvementsApplied`). New campaigns will have `qualitySuggestions`. Consider:

- [ ] The campaign detail page must handle BOTH shapes gracefully during transition (check for `qualitySuggestions` first, fall back to `qualityResult`)
- [ ] Historical run records in `compliance_test_runs` will have `qualityFixesApplied` counts. New runs will have `qualitySuggestionsCount`. The runs list UI must handle both.
- [ ] No database migration needed — these are JSON fields in campaign/run records, not schema columns. The TypeScript types just need to accept both shapes.

### Documentation

- [ ] Update any inline comments in `generate.ts` that reference the old pipeline flow
- [ ] Update the compliance agent JSDoc in `agent.ts` to explain the two functions (`rewriteForCompliance` for pipeline, `checkComplianceWithAgent` for standalone/scan use)
- [ ] If there's a README or architecture doc that describes the generation pipeline, update it

### Verification Gates

Before merging each phase:

**Phase A (Prompt Tightening):**
- [ ] Existing tests pass (prompt tests may need assertion updates)
- [ ] Full-pipeline QA run shows same or fewer violations than before
- [ ] No functional change to pipeline flow

**Phase B (Two-Phase Pipeline):**
- [ ] All new tests pass (regex-scan, rewriteForCompliance, buildQualitySuggestions)
- [ ] All updated tests pass (generate, prompt, quality, admin QA)
- [ ] Full-pipeline QA run produces `compliant` verdicts at same or better rate
- [ ] `preComplianceViolations` metric shows the generation prompt is reasonably clean
- [ ] Admin QA panel displays correctly with new result shapes
- [ ] No TypeScript errors (`tsc --noEmit` clean)
- [ ] Build passes (`npm run build`)

**Phase B.5 (Federal Term Extraction):**
- [ ] `allFederalTerms.length === 176` (or adjusted count after audit)
- [ ] Montana total term count unchanged after refactor
- [ ] Ohio total term count unchanged after refactor
- [ ] No term objects lost or duplicated during extraction
- [ ] State-specific law citation overrides work correctly
- [ ] Snapshot-mode QA run produces identical results before and after refactor (same terms = same scan results)

**Phase C (UI Quality Suggestions):**
- [ ] Suggestions panel renders for new campaigns
- [ ] Campaign detail page handles old campaigns (no `qualitySuggestions` field) without errors
- [ ] Apply-suggestion flow triggers compliance re-check
- [ ] Historical runs display correctly in admin panel

---

## Open Questions

1. **Should Phase A ship first as a quick win?** It's low-risk and may reduce violations enough to buy time for Phase B.
2. ~~**Quality suggestion apply flow:**~~ **RESOLVED** — Use `scanTextWithAgent` (full AI check) on the modified platform text only. It handles contextual violations that regex would miss, and it's a single-platform call so cost is minimal. Specified in the Apply-Suggestion Flow section.
3. **Backward compatibility:** Should `qualityResult` be kept alongside `qualitySuggestions` during transition, or is a clean break acceptable?
4. **Snapshot mode regression testing:** After Phase B ships, should we re-generate and re-approve all existing snapshots to baseline the new pipeline?
5. **State-specific allowlists:** Some terms are acceptable in certain states but not others (e.g., Ohio's military-status terms don't apply in Montana). Should the regex scanner support per-state allowlists beyond what's already in the term lists, or is the current approach (each state defines its own complete term list) sufficient?
6. ~~**Cross-state shared terms:**~~ **RESOLVED** — Federal term extraction is now designed in the Multi-State Architecture section above (Phase B.5). State files import from `federal.ts` and add only state-specific terms.
7. **Admin QA metrics:** Should full-pipeline runs track `preComplianceViolations` (regex scan count) vs `postComplianceViolations` (Phase 2 result) to measure generation prompt quality over time?
8. **"Fix All" UX specifics:** The "Fix All" button is being replaced with per-ad editing + compliance re-check. The exact UX for the edit modal and inline violation highlighting should be designed in Phase C. This is a discussion point — see the "Fix All Button Redesign" section.

---

## Files Modified (Estimated)

### Phase A (Prompt Tightening)

| File | Change |
|------|--------|
| `src/lib/ai/prompt.ts` | Add severity labels + law citations to `buildCheatSheet`, move compliance to end of prompt |
| `src/lib/ai/generate.ts` | Strengthen system message |
| `src/lib/ai/__tests__/prompt.test.ts` | Update assertions for new cheat sheet format |

### Phase B (Two-Phase Pipeline)

| File | Change |
|------|--------|
| `src/lib/ai/prompt.ts` | Remove `buildCheatSheet`, `categoryLabels`, `loadComplianceDocs` import. Replace compliance section with lightweight summary. |
| `src/lib/ai/generate.ts` | New two-phase flow: call `rewriteForCompliance` instead of `checkComplianceWithAgent`. Remove `autoFixQuality` call. Return `qualitySuggestions`. |
| `src/lib/compliance/agent.ts` | Add `rewriteForCompliance` function. Keep `checkComplianceWithAgent` (used by scan/snapshot). Keep `scanTextWithAgent`. |
| `src/lib/compliance/regex-scan.ts` | **New file** — prohibited term regex scanner |
| `src/lib/quality/engine.ts` | Add `buildQualitySuggestions`. Mark `autoFixQuality` as `@deprecated`. |
| `src/lib/types/campaign.ts` | Add `QualitySuggestion` type + `qualitySuggestions` field to `CampaignKit`. Deprecate `qualityResult.improvementsApplied`. |
| `src/lib/types/quality.ts` | Add `QualitySuggestion` interface |
| `src/lib/types/compliance-qa.ts` | Add `qualitySuggestionsCount` and `regexFindingsCount` to `PropertyTestResult`. Deprecate `qualityFixesApplied`. |
| `src/app/api/admin/compliance-qa/run/route.ts` | Update full-pipeline to read `qualitySuggestions` + `regexFindingsCount` instead of `qualityFixesApplied` |
| `src/app/api/cron/compliance-qa/route.ts` | **Same update as run route** — reads `qualityResult?.improvementsApplied`, must switch to `qualitySuggestions?.length`. (Review Fix: C4) |
| `src/lib/compliance/utils.ts` | Add `extractAdCopyTexts` variant that excludes strategy fields (hashtags, CTAs, targetingNotes, sellingPoints) for Phase 2 input. Keep `extractPlatformTexts` unchanged for backward compat. (Review Fix: M1) |
| `src/lib/types/compliance.ts` | Add `complianceRewriteApplied?: boolean` to `ComplianceAgentResult`. Add `source?: 'rewrite' \| 'scan'` to distinguish Phase 2 results from standalone scan results. (Review Fix: C2, M2) |
| `src/app/api/compliance/check/route.ts` | Add optional `rewrite: true` param to support "Retry compliance fix" from UI. (Review Fix: C3) |
| `src/lib/ai/__tests__/prompt.test.ts` | Update — prompt no longer has cheat sheet or textbook |
| `src/lib/ai/__tests__/generate.test.ts` | Update mocks — new pipeline functions |
| `src/lib/compliance/agent.test.ts` | Add tests for `rewriteForCompliance` |
| `src/lib/compliance/__tests__/regex-scan.test.ts` | **New file** — regex scanner tests |
| `src/lib/quality/quality.test.ts` | Add tests for `buildQualitySuggestions`, update pipeline assertions |

### Phase B.5 (Federal Term Extraction)

| File | Change |
|------|--------|
| `src/lib/compliance/terms/federal.ts` | **New file** — 176 shared federal terms exported by category |
| `src/lib/compliance/terms/montana.ts` | Refactor: import `allFederalTerms`, keep only 47 MT-specific terms + 6 law citation overrides |
| `src/lib/compliance/terms/ohio.ts` | Refactor: import `allFederalTerms`, keep only 41 OH-specific terms + law citation overrides |
| `src/lib/compliance/terms/__tests__/federal.test.ts` | **New file** — verify counts, no duplicates, all fields present |
| `src/lib/compliance/terms/__tests__/ohio.test.ts` | Update — verify OH imports federal + adds correct count |
| **New:** `src/lib/compliance/terms/__tests__/montana.test.ts` | **New file** — verify MT imports federal + adds correct count |

### Phase C (UI Quality Suggestions)

| File | Change |
|------|--------|
| Campaign page component(s) | Add quality suggestions panel, apply/dismiss flow |
| Campaign detail component(s) | Handle both `qualityResult` (old) and `qualitySuggestions` (new) |
| Admin QA runs list component | Handle both `qualityFixesApplied` (old) and `qualitySuggestionsCount` (new) |

### No Changes Needed

| File | Reason |
|------|--------|
| `src/lib/compliance/docs.ts` | `loadComplianceDocs` used as-is by Phase 2 |
| `src/lib/compliance/compliance-settings.ts` | `getComplianceSettings` used as-is |
| `src/lib/compliance/terms/registry.ts` | Still maps state codes to state configs — no change |
| `src/app/api/admin/compliance-qa/scan/route.ts` | Uses `scanTextWithAgent` directly — unaffected |
| `src/app/api/admin/compliance-qa/corpus/` | CRUD only — unaffected |
| `src/app/api/admin/compliance-qa/runs/route.ts` | Read-only — unaffected |
| `src/app/api/admin/compliance-qa/snapshots/` | Calls `generateCampaign` — picks up new pipeline automatically |
