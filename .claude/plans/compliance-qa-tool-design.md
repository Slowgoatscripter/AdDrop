# Compliance QA Tool — Design Document

**Status:** Approved | Ready for Implementation Planning
**Date:** 2026-02-15

## Problem

The compliance engine checks real estate ads against state + federal + industry rules. As states are added (Ohio next, more later) and existing configs are updated (Montana audit fixes), there's no way to:

- Verify the engine catches what it should
- Confirm it doesn't false-positive on clean ads
- Detect regressions when one state's config changes
- Ensure state-specific rules don't bleed across state boundaries
- Track compliance accuracy over time

## Solution

A Compliance QA Tool built into the admin panel at `/admin/compliance-qa` with four views, a database-backed test corpus, and automated cross-state isolation testing.

## Architecture

### Admin Route

New top-level admin page: `/admin/compliance-qa`

Separate from compliance settings (which lives in `/admin/settings`). This is testing/validation tooling, not configuration.

### Four Views

#### 1. Ad Hoc Scanner

- Large text area to paste an ad, state dropdown, "Scan" button
- Results panel: table of violations found — term, category, severity, citation, context snippet. Green banner if clean.
- Bottom bar: "Save to Corpus" button — pre-fills expected violations from scan results. User reviews/adjusts, names it, tags it, saves.
- If user removes a violation from expected list before saving, that's marking it as a known false positive.

#### 2. Test Corpus Manager

- Filterable table: filter by state, tags, clean/violation, source
- Inline expand: click a row to see full ad text and expected violations
- Actions: edit, delete, duplicate (for creating variants)
- Bulk: import/export JSON for sharing corpus or backup
- Stats bar: "47 ads total — MT: 22, OH: 25 — 12 clean, 35 with violations"

#### 3. Suite Runner

- State cards row: one card per configured state + "All States" card
- Click a state: runs that state's corpus through the engine with progress indicator
- Results table: each test ad as a row — name, expected vs actual violations, pass/fail badge, diff highlight for mismatches
- Cross-state panel: expandable section showing isolation results — "Ohio-specific terms tested against Montana: 0 leaks"
- "Run All" button: runs every state sequentially, stores as full-suite run

#### 4. Scorecard Dashboard

- State health cards grid: each state shows pass rate %, category coverage bar, total test ads, last run date, status badge (green >95%, yellow >80%, red <80%)
- Overall banner: "Last full suite: Feb 15, 2026 — 96% pass rate across 2 states"
- Trend chart: simple line showing pass rate over last N runs (from compliance_test_runs history)
- Coverage gaps: list of categories with zero test ads per state — "Ohio: economic-exclusion has no test cases"

### Database Schema

#### Table: `compliance_test_ads`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| state | text | State code: "OH", "MT", etc. |
| name | text | Human label: "Ohio suburban with military language" |
| text | text | The full ad text |
| expected_violations | jsonb | Array of { term, category, severity } |
| is_clean | boolean | True = expect zero violations |
| tags | text[] | Filterable: "military-status", "real-world", "clean" |
| source | text | Where it came from: "zillow", "manual", "realtor.com" |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |
| created_by | uuid (FK) | References auth.users |

#### Table: `compliance_test_runs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| run_type | text | "single-state", "full-suite", "ad-hoc" |
| state | text | Null for full suite, "OH" for single state |
| triggered_by | text | "manual", "scheduled" |
| run_by | uuid (FK) | Null for scheduled runs |
| run_at | timestamptz | When it started |
| duration_ms | integer | How long it took |
| summary | jsonb | { totalAds, passed, failed, falsePositives, coverage } |
| results | jsonb | Full per-ad results array |
| cross_state | jsonb | Isolation check results |

**RLS:** Admin-only read and write on both tables.

### API Routes

```
POST /api/admin/compliance-qa/scan
  Body: { text, state, platform? }
  Returns: { violations[], summary, layerBreakdown }
  Calls findViolations() with the state's config.
  layerBreakdown groups violations by citation source (state/federal/industry).

POST /api/admin/compliance-qa/run
  Body: { state? }  (null = all states)
  Returns: { runId }
  Fetches corpus from DB (filtered by state if provided).
  Runs each ad through findViolations().
  Compares actual vs expected violations.
  Runs cross-state isolation checks.
  Stores results in compliance_test_runs.

GET /api/admin/compliance-qa/runs
  Query: { state?, limit? }
  Returns: { runs[] }
  History for scorecard trends.

GET /api/admin/compliance-qa/corpus
  Query: { state?, tags?, is_clean? }
  Returns: { ads[] }

POST /api/admin/compliance-qa/corpus
  Body: test ad data
  Returns: { ad }

PATCH /api/admin/compliance-qa/corpus/[id]
  Body: partial update
  Returns: { ad }

DELETE /api/admin/compliance-qa/corpus/[id]
  Returns: { success }
```

### Cross-State Isolation Logic

For each test ad tagged to a state (e.g., "OH"):

1. Collect all expected violations where the `law` citation references state statute (ORC for Ohio, MCA for Montana)
2. Run the ad through every OTHER state's engine
3. If any of those state-specific terms fire in another state's engine → isolation failure
4. Federal terms (42 U.S.C.) firing in other states = expected, not a failure

This is automated using citation-based detection — no manual cross-state tagging needed per ad.

### Scheduled Runs

Weekly cron (Supabase pg_cron or Edge Function) calls the /run endpoint with no state filter. Results stored in compliance_test_runs with triggered_by: "scheduled". Dashboard shows "Last full suite: X days ago."

### How Scanning Mirrors Production

The scan uses the exact same `findViolations()` call with the same combined config (state + federal + best practices) that a real agent campaign would use. No separate test-mode engine. This ensures QA results match production behavior exactly.

## Key Design Decisions

1. **Database over JSON files** — Corpus will grow per state, needs filtering/querying, and admins need to write to it without code deploys.
2. **Dedicated tables over JSONB blobs** — Proper indexing, filtering, foreign keys. Scales cleanly.
3. **Top-level admin route** — Testing is a different activity than configuration. Deserves its own page.
4. **State cards grid for scorecard** — Visual at-a-glance health. Drill-down for details. Scannable at 10+ states.
5. **Server-side execution** — Results persisted, other admins see last run without re-running, history tracking works naturally.
6. **Citation-based isolation** — Automatic cross-state detection using law field. No manual per-ad cross-state tagging.
7. **Per-state on-demand + weekly full suite** — Flexibility during development, safety net for regressions.

## Interaction with Existing Plans

This tool should be built BEFORE the Montana fixes and Ohio implementation:

1. Build QA tool
2. Seed initial Montana test corpus using existing engine
3. Implement Montana fixes (validate with QA tool)
4. Implement Ohio config (validate with QA tool)

The QA tool provides the safety net that makes the subsequent compliance work verifiable.

## Tech Stack (matching existing project)

- Next.js API routes (App Router)
- Supabase (Postgres + RLS)
- shadcn/ui components
- Gold accent color scheme
- Jest for automated test suite integration
