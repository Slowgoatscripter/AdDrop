# Compliance QA System Redesign

**Date:** 2026-02-15
**Status:** Approved

## Problem

The existing compliance QA test system tests a regex-based pattern matching engine against hand-written static ads. This doesn't test the actual AI pipeline. The regex engine is brittle, misses contextual violations, and the test corpus was out of sync with the engine's term list — resulting in 11 false positives and 10 missed violations.

## Decision

Replace the regex compliance engine entirely with a dedicated GPT-5.2 compliance agent. Redesign the test system to validate the full end-to-end AI pipeline rather than testing a regex engine in isolation. Use snapshot testing to achieve deterministic compliance tests despite non-deterministic AI generation.

## New Pipeline

```
Property data
  → GPT-5.2 generates ads
  → GPT-4o-mini quality scoring + auto-fix
  → GPT-5.2 compliance agent (auto-fix + flag changes)
  → Final output
```

Note: The current code runs compliance BEFORE quality auto-fix, which means quality fixes can introduce violations that are never caught. Moving compliance last fixes this existing bug.

## Compliance Agent

- **Model:** GPT-5.2 (matches generator capability)
- **Temperature:** 0 (deterministic for consistent results)
- **Knowledge base:** Compliance docs (federal, state, industry) + prohibited terms list as structured reference
- **Input:** All generated ad copy (post quality-fix), state code, compliance docs + terms
- **Output (JSON):**
  - Per-platform verdict: pass/fail
  - Violations found: term/phrase, category, severity, law citation, explanation
  - Auto-fixes applied with before/after text
  - Overall campaign verdict: compliant / needs-review / non-compliant
- **Behavior:**
  - Catches exact prohibited terms AND subtle/contextual violations (coded language, implicit steering)
  - Understands context — "family room" is fine, "perfect for families" is not
  - Auto-fixes violations and flags all changes for user review
  - Runs as final gate — nothing ships without compliance sign-off

## Determinism Strategy: Snapshot Testing

The AI generation pipeline is non-deterministic — same property produces different ad copy each run. To get consistent, reliable tests:

### Two test modes

**1. Compliance Agent Tests (deterministic)**
- Generate ads from test properties once → cache the generated text as a **snapshot**
- Run the compliance agent against the cached snapshot — same input every time, consistent results
- Compliance agent runs at temperature 0 for maximum consistency
- Snapshots can be regenerated on demand (e.g., after prompt changes)
- This is the primary test mode — answers: "Is the compliance agent working correctly?"

**2. Full Pipeline Drift Detection (scheduled, non-deterministic)**
- Run the entire pipeline fresh from property data — no cached text
- Expect results to vary between runs — track trends, not absolute pass/fail
- Detects when AI model updates or prompt changes cause quality degradation
- Scheduled runs (daily/weekly) with trend tracking on the scorecard
- This is the secondary test mode — answers: "Is the generation pipeline still producing good output?"

### What "pass" means for each mode

- **Snapshot test pass:** Compliance agent returns zero violations on the final output (post auto-fix), OR correctly catches and fixes known-risky content
- **Drift detection pass:** Final output quality stays within historical norms (trend-based, not absolute)

## Redesigned Test System

### Test Corpus (replaces old ad corpus)

**Seed properties** — Pre-built listings designed to trigger edge cases:
- Luxury home in gated community (economic exclusion risk)
- Home near church/synagogue (religion steering risk)
- Starter home in "young" neighborhood (age/familial status risk)
- ADA-accessible property (disability language risk)
- Multi-unit near senior center (age discrimination risk)
- Clean suburban listing (should pass cleanly)
- Additional edge cases per violation category

**Real listings** — Pulled from database, anonymized if needed.

### What a Test Run Does

**Snapshot mode:**
1. Fetch test properties and their cached ad snapshots
2. Run compliance agent against each snapshot
3. Record: violations found, auto-fixes applied, final verdict
4. Evaluate: Is the compliance agent catching what it should?

**Full pipeline mode:**
1. Fetch test properties
2. Run full pipeline: generation → quality → compliance
3. Record: generated text, quality fixes, compliance findings, final output
4. Cache the generated text as a new snapshot (optional, admin can approve)
5. Compare results against historical trend

### Test Triggers

- **Manual:** Admin clicks "Run" in dashboard (snapshot or full pipeline)
- **Scheduled:** Periodic full pipeline runs (daily/weekly) to detect model drift

### Dashboard (repurposed)

- **Scorecard:** Pass rates, trends over time, snapshot vs drift run results
- **Runner:** Trigger snapshot tests or full pipeline runs by state or full suite
- **Results:** Per-property breakdown with compliance agent findings, before/after fixes
- **Scanner (kept):** Standalone compliance check — paste ad text, get compliance agent review. Future user-facing tool for manually written ads.

## Integration Points (from compatibility review)

### Client-Side Compliance

`campaign-shell.tsx` currently runs the regex engine client-side. Since the compliance agent requires a GPT-5.2 API call, a new endpoint is needed:
- `POST /api/compliance/check` — accepts CampaignKit, returns compliance agent verdict
- Frontend calls this endpoint instead of running compliance locally

### Terms Data Preservation

`montana.ts` contains 163 prohibited terms that the compliance agent prompt and `compliance-settings.ts` need. The file is restructured (not deleted):
- Move to `src/lib/compliance/terms/montana.ts`
- Keep the `ProhibitedTerm[]` data and `MLSComplianceConfig` metadata
- Remove all regex engine logic
- Format terms as grouped reference material for the compliance agent prompt

### Shared Text Extraction

`extractPlatformTexts()` utility (currently in the regex engine) is needed by both the quality scorer and the compliance agent. Extract to `src/lib/compliance/utils.ts` as a shared utility.

### Compliance Doc Token Management

Compliance docs total ~15,000-25,000 tokens. To manage prompt size:
- Load only the relevant state's docs (not all states)
- Use either the `ProhibitedTerm[]` array OR `MASTER-TERM-LIST.md`, not both
- Format terms as JSON for token efficiency

### Latency

The compliance agent adds ~3-8 seconds per generation (vs <100ms for regex). This is an accepted tradeoff. The UI should show a clear loading state during the compliance check phase.

### Test Suite Cost

Full pipeline test runs cost ~$1-3 per suite (10+ properties × full pipeline). Snapshot tests are cheaper (compliance agent call only, no generation). This is an accepted tradeoff.

## What Gets Removed

- `src/lib/compliance/engine.ts` — regex scanning engine (logic only; `extractPlatformTexts` moves to utils)
- `src/lib/compliance/qa-engine.ts` — regex test harness
- Regex compliance scan step in generation API route
- Old test ad corpus concept
- `compliance_test_ads` database table
- Seed script for old corpus (`scripts/seed-compliance-corpus.ts`)
- Corpus view component (replaced by test properties view)

## What Stays (restructured)

- `compliance-docs/` — federal, state, industry docs (fed to compliance agent)
- `src/lib/compliance/montana.ts` → moves to `src/lib/compliance/terms/montana.ts` (terms data only, no regex)
- `src/lib/compliance/compliance-settings.ts` — updated imports
- `src/lib/compliance/docs.ts` — doc loader stays as-is
- Dashboard UI shell (scorecard, runner, scanner views) — repurposed
- `compliance_test_runs` table — schema adapted for new result format

## What's New

- `src/lib/compliance/agent.ts` — compliance agent module (GPT-5.2 call)
- `src/lib/compliance/utils.ts` — shared `extractPlatformTexts()` utility
- `POST /api/compliance/check` — client-side compliance endpoint
- `compliance_test_properties` database table (replaces `compliance_test_ads`)
- Snapshot caching for test properties (generated ad text stored for deterministic testing)
- Updated runner with snapshot mode and full pipeline mode
- Scheduled run trigger (cron or similar)
- Updated types: `ComplianceTestProperty`, `ComplianceAgentResult`, `ComplianceAutoFix`, `PlatformComplianceVerdict`

## Consumer Blast Radius

| File | Current Import | Change |
|------|---------------|--------|
| `src/lib/ai/generate.ts` | `checkAllPlatforms` | Swap for compliance agent call |
| `src/components/campaign/campaign-shell.tsx` | `autoFixCampaign`, `checkAllPlatforms` | Replace with `POST /api/compliance/check` API call |
| `src/lib/compliance/compliance-settings.ts` | `complianceConfigs` | Update import path to `terms/montana.ts` |
| `src/lib/compliance/index.ts` | Re-exports from engine | Rewrite to export agent functions |
| `src/app/api/admin/compliance-qa/scan/route.ts` | `scanAd` | Swap for compliance agent call |
| `src/app/api/admin/compliance-qa/run/route.ts` | `runTestSuite`, `runIsolationChecks` | Full rewrite for snapshot + pipeline modes |
| `src/app/api/admin/compliance-qa/corpus/` | CRUD for test ads | Replace with test properties CRUD |
