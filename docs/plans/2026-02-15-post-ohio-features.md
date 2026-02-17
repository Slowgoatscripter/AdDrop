# Post-Ohio Compliance — Feature Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete 4 remaining features after Ohio compliance implementation: QA seed data, landing page update, historical test detail view, and compliance transparency UX.

**Architecture:** Next.js 14 App Router, Supabase, GPT-5.2 compliance agent. Ohio compliance is fully implemented (terms, docs, types, registry, QA UI). See `.claude/plans/ohio-compliance-plan.md` for full architecture reference.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, React

**Prior work this session (all on `dev` branch):**
- 11 commits implementing Ohio compliance (terms, types, category maps, admin UI, QA UI, docs, tests)
- Fixed snapshot PATCH 500 (missing RLS UPDATE policy — migration at `supabase/migrations/20260215_fix_snapshot_update_policy.sql`, needs `supabase db push`)
- Fixed violation display pipeline (violations now flow from agent → campaign-tabs → ad-cards → violation-details)

---

## Feature 1: Ohio QA Seed Properties

The QA test runner (`src/components/admin/compliance-qa/runner-view.tsx`) dynamically detects states from the corpus. Ohio doesn't show up because no Ohio test properties exist yet.

**What to do:**
Create 5-6 Ohio seed properties via the Corpus API (`POST /api/admin/compliance-qa/corpus`). Each property should be designed to test specific compliance edge cases.

**Seed properties to create:**

| Name | City | State | Risk | Purpose |
|------|------|-------|------|---------|
| Columbus Modern Condo | Columbus | OH | clean | Baseline — should pass clean |
| Cleveland Lakefront Home | Cleveland | OH | moderate | Proximity/waterfront language |
| Cincinnati Historic District | Cincinnati | OH | high | Heritage/ancestry terms (Appalachian) |
| Dayton Military Adjacent | Dayton | OH | high | Near Wright-Patterson AFB, military terms |
| Toledo Mixed-Use | Toledo | OH | moderate | Economic exclusion language |
| Akron Family Home | Akron | OH | moderate | Familial status edge cases |

**Request body format** (from `src/app/api/admin/compliance-qa/corpus/route.ts`):
```json
{
  "name": "Columbus Modern Condo",
  "state": "OH",
  "risk_category": "clean",
  "is_seed": true,
  "tags": ["urban", "condo", "baseline"],
  "listing_data": {
    "address": { "street": "123 High St", "city": "Columbus", "state": "OH", "zip": "43215" },
    "price": 275000,
    "beds": 2,
    "baths": 2,
    "sqft": 1200,
    "propertyType": "Condo",
    "features": ["Downtown location", "Modern finishes", "Walk to Short North"],
    "description": "Stylish downtown condo near Short North Arts District"
  }
}
```

**Implementation approach:** Create a script or use the existing corpus API. The high-risk properties should have descriptions that intentionally include terms the compliance agent should flag (for testing purposes).

**After creating:**
1. Generate snapshots for each via `POST /api/admin/compliance-qa/snapshots/[propertyId]`
2. Review and approve baselines via `PATCH /api/admin/compliance-qa/snapshots/[propertyId]` (NOTE: the RLS UPDATE policy migration must be applied first)
3. Run Ohio-only test: `POST /api/admin/compliance-qa/run` with `{ "state": "OH", "mode": "snapshot" }`

**Files:** No code changes needed — this is data seeding only. Could be done via UI or a seed script.

---

## Feature 2: Landing Page Ohio Update

The landing page features grid still says "Montana MLS rules checked. More states coming soon."

**Files to modify:**
- `src/components/landing/features-grid.tsx` (~line 22-27)

**Current text:**
```
Title: "Compliance Built-In"
Description: "Built-in fair housing compliance checking. Montana MLS rules checked. More states coming soon."
```

**New text:**
```
Title: "Compliance Built-In"
Description: "AI-powered fair housing compliance checking with auto-fix. Montana and Ohio MLS rules, with more states planned."
```

**Also check:**
- `src/components/landing/how-it-works.tsx` — Consider adding compliance as a visible step in the workflow
- `src/lib/settings/defaults.ts` — FAQ answer was already updated in the Ohio work (now says "Montana and Ohio")

**Keep it simple** — just update the text, don't redesign the landing page.

---

## Feature 3: View Generated Ad Details for Passed Tests (Historical Runs)

In the admin compliance QA panel, when viewing historical test runs, the user wants to see the actual generated ad text for properties that passed — not just pass/fail status.

**Current behavior:**
- `src/components/admin/compliance-qa/history-view.tsx` shows test run history
- Each run has `results: PropertyTestResult[]` (from `src/lib/types/compliance-qa.ts`)
- `PropertyTestResult` already has `generatedText?: Record<string, string>` — the data IS stored, just not displayed

**What to build:**
Add an expandable detail view for each property result in the history view. When clicked, show:
- The generated ad text per platform (from `generatedText`)
- Compliance verdict (pass/fail)
- Any violations found (even for passed tests — they may have soft warnings that were auto-fixed)

**Files to modify:**
- `src/components/admin/compliance-qa/history-view.tsx` — Add expandable row with generated text display

**Key types** (from `src/lib/types/compliance-qa.ts`):
```typescript
interface PropertyTestResult {
  propertyId: string
  propertyName: string
  state: string
  riskCategory: string
  passed: boolean
  complianceResult: ComplianceAgentResult
  generatedText?: Record<string, string>  // ← THIS IS THE DATA
  qualityFixesApplied?: number
}
```

**UI suggestion:** Collapsible card per property in each run. When expanded, show a tabbed or stacked view of each platform's generated text. Use syntax highlighting or a read-only textarea.

---

## Feature 4: Compliance Transparency UX Improvements

The violation display pipeline is now working (fixed in this session), but there are UX improvements to make the compliance experience more transparent:

### 4A: Show Auto-Fix Summary After Generation

When a campaign is generated and the compliance agent auto-fixes soft violations, the user should see what was changed.

**Current behavior:** Auto-fixes are stored in `complianceResult.autoFixes` but the user only sees the final text. No indication that changes were made.

**What to build:** In `campaign-shell.tsx`, after a campaign loads with auto-fixes, show a summary banner:
- "3 compliance issues were automatically resolved"
- Expandable list showing before → after for each fix
- Category badge and law citation per fix

**Data available** (from `ComplianceAgentResult`):
```typescript
interface ComplianceAutoFix {
  platform: string
  before: string      // original text
  after: string       // fixed text
  violationTerm: string
  category: ViolationCategory
}
```

**Files to modify:**
- `src/components/campaign/compliance-banner.tsx` — Add auto-fix summary section
- Or create a new `src/components/campaign/compliance-fixes-summary.tsx` component

### 4B: Improve Context Display in Violation Details

Currently `context` is set to just the violation term itself (from the campaign-tabs fix). Ideally, show a snippet of surrounding text so the user can see the term in context.

**What to build:** In `campaign-tabs.tsx`'s `buildPlatformResult()`, instead of `context: v.term`, extract a ~100 character snippet from the actual platform text around the flagged term.

**How:**
1. Use `extractPlatformTexts()` from `src/lib/compliance/utils.ts` to get platform text
2. Find the term in the text and extract surrounding context
3. Pass as `context` field

**Files to modify:**
- `src/components/campaign/campaign-tabs.tsx` — Enhance `buildPlatformResult()` to extract real context

---

## Dependency Graph

```
Feature 1 (seed data)     — independent, needs RLS migration applied first
Feature 2 (landing page)  — independent, quick text change
Feature 3 (history view)  — independent, UI-only
Feature 4A (auto-fix UX)  — independent
Feature 4B (context)      — depends on current campaign-tabs.tsx (already committed)
```

All features are independent and can be parallelized.

---

## File Change Summary

| Feature | Files |
|---------|-------|
| 1 | No code changes (data seeding) |
| 2 | `src/components/landing/features-grid.tsx` |
| 3 | `src/components/admin/compliance-qa/history-view.tsx` |
| 4A | `src/components/campaign/compliance-banner.tsx` (or new component) |
| 4B | `src/components/campaign/campaign-tabs.tsx` |

**Total: 3-4 files modified, 0-1 new files**
