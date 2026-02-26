# Remove Beta Badges and Update Welcome Messages — Design

> **Brainstormer** `opus` · 2026-02-26T03:45:36.389Z

## Problem

AdDrop has launched as v1 with a tiered subscription model (Free / Pro / Enterprise), but numerous beta-era artifacts remain in user-facing UI, API error messages, and copy. Users see "Beta" badges, beta-specific limit messages, and signup copy that references a beta program that no longer exists. This undermines confidence in the product's stability and confuses the Free-tier value proposition.

## Current State: Beta Artifact Inventory

The codebase is already partially migrated. The dashboard uses `TierUsageCard` (tier-aware), campaign limits use tier-based logic, and the landing FAQ/CTA were cleaned in commit `f820be7`. However, these beta artifacts remain:

### UI Components (beta-specific files)

| File | Component | Status |
|------|-----------|--------|
| `src/components/ui/beta-badge.tsx` | `BetaBadge` | Rendered in app header |
| `src/components/dashboard/beta-usage-card.tsx` | `BetaUsageCard` | **Dead code** — dashboard already uses `TierUsageCard` |
| `src/components/auth/beta-signup-banner.tsx` | `BetaSignupBanner` | Rendered on signup page (when `?next=` present) |
| `src/components/create/beta-limit-reached.tsx` | `BetaLimitReached` | Rendered on create page when limit hit |

### Consumer pages

| File | What it does |
|------|--------------|
| `src/components/nav/app-header.tsx` (line 139) | Renders `<BetaBadge />` next to logo for `variant='app'` |
| `src/app/signup/page.tsx` (line 123) | Renders `<BetaSignupBanner />` when `?next=` param exists |
| `src/app/create/page.tsx` (line 29) | Renders `<BetaLimitReached />` when `usage.isLimited` |

### Text/copy with "beta" in user-facing strings

| File | Line(s) | Content |
|------|---------|---------|
| `src/components/dashboard/welcome-card.tsx` | 15 | `"Welcome to AdDrop Beta"` |
| `src/app/api/campaign/create/route.ts` | 55 | Error: `"Beta campaign limit reached"` |
| `src/app/api/generate/route.ts` | 49, 53 | Comment + error: `"Beta campaign limit reached"` |
| `src/app/layout.tsx` | 128 | Structured data: `"Free during beta"` |
| `src/app/(legal)/terms/page.tsx` | 55-62 | "Beta Service" section in Terms of Service |

### Settings/config layer

| File | Key | Notes |
|------|-----|-------|
| `src/lib/types/settings.ts` | `LANDING_CTA_BETA` | Setting key enum |
| `src/lib/settings/defaults.ts` | `landing.cta_beta` | Default value (now reads "Free to start. 2 campaigns per month...") |
| `src/components/admin/landing-settings-form.tsx` | `ctaBeta` state + "Beta Notice" label | Admin settings UI |

### Non-user-facing (code comments only)

| File | Notes |
|------|-------|
| `src/lib/usage/campaign-limits.ts` | Commented-out `BETA_CAMPAIGN_LIMIT` constants |
| `src/lib/supabase/middleware.ts` | Comment: "Beta-gated routes" |

### Already clean

- `src/components/landing/cta-footer.tsx` — uses "Free tier available" (no beta)
- `src/components/dashboard/tier-usage-card.tsx` — fully tier-aware
- `src/app/dashboard/page.tsx` — uses `TierUsageCard`
- Landing FAQ defaults — already updated

## Approaches

### Approach 1: Surgical Minimum (3 files only)

Touch only the three files mentioned in the task description's "Where" field. The task listed `badge.tsx`, `WelcomeMessage.tsx`, and `UsageCard.tsx` — but those exact paths don't exist. The actual equivalents are `beta-badge.tsx`, `welcome-card.tsx`, and `beta-usage-card.tsx`.

**Changes:**
- Delete `beta-badge.tsx`, remove import from `app-header.tsx`
- Update "Welcome to AdDrop Beta" → "Welcome to AdDrop" in `welcome-card.tsx`
- Delete `beta-usage-card.tsx` (already dead code)

**Pros:** Smallest diff, lowest risk.
**Cons:** Leaves user-facing beta strings in signup banner, create page limit message, API errors, Terms of Service, structured data. Users still encounter "beta" in multiple flows. Does not satisfy the acceptance criterion "All user-facing beta references are replaced."

### Approach 2: Full User-Facing Cleanup (Recommended)

Remove or update every user-visible beta reference. Delete beta-specific component files, update consumer pages to use tier-aware replacements, fix API error strings, update structured data. Leave admin settings keys and code comments untouched to avoid DB migration risk.

**Changes:**
1. **Delete** `beta-badge.tsx` → remove import/render from `app-header.tsx`
2. **Delete** `beta-usage-card.tsx` (dead code)
3. **Update** `welcome-card.tsx`: "Welcome to AdDrop Beta" → "Welcome to AdDrop"
4. **Rename + update** `beta-signup-banner.tsx` → `signup-banner.tsx`: Remove beta text, update to tier-aware messaging ("Create a free account..." without "beta")
5. **Rename + update** `beta-limit-reached.tsx` → `limit-reached.tsx`: Remove "beta limit" text, update to plan-aware messaging with upgrade CTA
6. **Update** `app/signup/page.tsx`: Update import path
7. **Update** `app/create/page.tsx`: Update import path
8. **Update** API error messages in `campaign/create/route.ts` and `generate/route.ts`: "Beta campaign limit reached" → "Campaign limit reached"
9. **Update** `app/layout.tsx` structured data: "Free during beta" → "Free tier available"
10. **Update** `app/(legal)/terms/page.tsx`: Replace "Beta Service" section with "Free Tier" section reflecting current limits
11. **Rename** admin settings label: "Beta Notice" → "Subheadline" in `landing-settings-form.tsx` (UI label only, setting key unchanged)

**Pros:** Covers all user-facing beta references. No DB migration. Setting keys stay backward-compatible. Clean component names.
**Cons:** Touches ~11 files. Slightly larger review surface. Admin form label changes could briefly confuse admin users.

### Approach 3: Complete Purge Including Settings Migration

Everything in Approach 2, plus: rename `LANDING_CTA_BETA` setting key to `LANDING_CTA_SUBHEADLINE`, run a DB migration to rename the key in the `app_settings` table, update all references in the settings/defaults pipeline.

**Pros:** Zero beta traces anywhere in the codebase.
**Cons:** Requires a Supabase DB migration. If existing DB rows use the old key, values would be lost without migration. Higher risk for a cosmetic cleanup. The setting's default value already reads "Free to start..." (no beta), so the key name is an internal detail only admins see in code.

## Recommendation: Approach 2

Approach 2 is the right balance. It satisfies all four acceptance criteria, removes every user-facing beta reference, and avoids DB migration risk. The setting key `landing.cta_beta` remains as an internal name — its value already contains no beta language, and renaming it is pure vanity with real migration risk.

## Detailed Design

### 1. Delete `BetaBadge` component

**File:** `src/components/ui/beta-badge.tsx`
**Action:** Delete the file entirely.
**Consumer:** `src/components/nav/app-header.tsx` — remove the import (line 12) and the render (line 139: `{variant === 'app' && <BetaBadge />}`).

No replacement needed. The header already shows the AdDrop logo; a "Beta" badge next to it is the only artifact being removed.

### 2. Delete `BetaUsageCard` (dead code)

**File:** `src/components/dashboard/beta-usage-card.tsx`
**Action:** Delete the file. No consumers reference it — the dashboard already uses `TierUsageCard`.

### 3. Update `WelcomeCard` heading

**File:** `src/components/dashboard/welcome-card.tsx`
**Action:** Change line 15 from `"Welcome to AdDrop Beta"` to `"Welcome to AdDrop"`.

The benefits list (`2 ad campaigns per week`, etc.) should also be updated to reflect the current free tier: `2 ad campaigns per month` (matching `TIER_LIMITS.free.campaigns = 2` with monthly reset).

Updated benefits:
```
'2 ad campaigns per month',
'5 platforms per campaign',
'Fair housing compliance built in',
'Export-ready assets',
```

### 4. Rename and update `BetaSignupBanner` → `SignupBanner`

**File:** `src/components/auth/beta-signup-banner.tsx` → `src/components/auth/signup-banner.tsx`
**Action:** Rename file, rename component export to `SignupBanner`. Update copy:
- "Create a free beta account to start generating ads" → "Create a free account to start generating ads"
- Remove "Free during beta" from benefits list, replace with "Free to start"

**Consumer:** `src/app/signup/page.tsx` — update import path and component name.

### 5. Rename and update `BetaLimitReached` → `LimitReached`

**File:** `src/components/create/beta-limit-reached.tsx` → `src/components/create/limit-reached.tsx`
**Action:** Rename file, rename component export to `LimitReached`. Update copy:
- "You've hit your beta limit this week" → "You've reached your plan limit this month"
- "Want unlimited campaigns? We're working on premium plans." → "Need more campaigns?" with a link to `/pricing`

**Consumer:** `src/app/create/page.tsx` — update import path and component name. Also fix the usage counter text on line 39 from "this week" to "this month" (matching the actual monthly reset cycle).

### 6. Update API error messages

**Files:** `src/app/api/campaign/create/route.ts`, `src/app/api/generate/route.ts`
**Action:** Change `"Beta campaign limit reached"` → `"Campaign limit reached"` in both files. Change comment "Beta rate limit check" → "Rate limit check".

These are user-facing (returned in JSON error responses to the client).

### 7. Update structured data

**File:** `src/app/layout.tsx` (line 128)
**Action:** Change `"Free during beta"` → `"Free tier available"`.

This is in JSON-LD structured data that search engines read.

### 8. Update Terms of Service

**File:** `src/app/(legal)/terms/page.tsx` (lines 54-62)
**Action:** Replace the "Beta Service" section with a "Service Tiers" section describing the current Free/Pro/Enterprise model. This was confirmed as the preferred approach over simply trimming the beta language. Key changes:
- Replace `<strong>Beta Service:</strong> AdDrop is currently in beta. During beta:` with `<strong>Service Tiers:</strong> AdDrop offers free and paid plans:`
- Replace `The service is free of charge` with `Free tier: 2 campaigns per month, 5 platforms per campaign`
- Replace `Usage is limited to 2 campaigns per user per rolling 7-day period` with `Pro and Enterprise tiers offer higher limits and additional features`
- Keep the "Features may change" and "as available" disclaimers (those apply regardless of tier)

### 9. Update admin settings label

**File:** `src/components/admin/landing-settings-form.tsx` (line 189)
**Action:** Change label text `"Beta Notice"` → `"Subheadline"`. The setting key `landing.cta_beta` and state variable `ctaBeta` remain unchanged (internal detail, no user impact).

### 10. Clean up code comments (opportunistic)

- `src/lib/usage/campaign-limits.ts` — remove the commented-out `BETA_CAMPAIGN_LIMIT` / `BETA_WINDOW_DAYS` lines and their "Deprecated" comment
- `src/lib/supabase/middleware.ts` — change comment "Beta-gated routes" → "Auth-gated routes"
- `src/app/api/generate/route.ts` — change comment "Beta rate limit check" → "Rate limit check"

### Not in scope

- **Setting key rename** (`landing.cta_beta` → something else): requires DB migration, no user impact since value already reads "Free to start..."
- **`LANDING_CTA_BETA` constant in `settings.ts`**: internal enum, no user visibility
- **Pricing page or tier feature gating**: separate concern, not beta-related

## Testing Strategy

1. **Existing test passes:** `src/app/__tests__/page-section-order.test.ts` already asserts no `betaNotice` prop. Should continue passing.
2. **Grep verification:** After changes, `grep -ri "beta" src/` should return zero hits outside of code comments, setting key names, and variable names derived from settings.
3. **Visual QA:** Check these pages manually:
   - App header (no badge)
   - Dashboard welcome card (new users)
   - Dashboard usage card (existing — already uses `TierUsageCard`)
   - `/signup?next=/create` (updated banner)
   - `/create` when limit reached (updated message with pricing link)
   - Terms of Service page
4. **API test:** Hit rate limit, verify error message says "Campaign limit reached" (not "Beta...").

## File Change Summary

| Action | File |
|--------|------|
| DELETE | `src/components/ui/beta-badge.tsx` |
| DELETE | `src/components/dashboard/beta-usage-card.tsx` |
| EDIT | `src/components/nav/app-header.tsx` |
| EDIT | `src/components/dashboard/welcome-card.tsx` |
| RENAME + EDIT | `src/components/auth/beta-signup-banner.tsx` → `signup-banner.tsx` |
| RENAME + EDIT | `src/components/create/beta-limit-reached.tsx` → `limit-reached.tsx` |
| EDIT | `src/app/signup/page.tsx` |
| EDIT | `src/app/create/page.tsx` |
| EDIT | `src/app/api/campaign/create/route.ts` |
| EDIT | `src/app/api/generate/route.ts` |
| EDIT | `src/app/layout.tsx` |
| EDIT | `src/app/(legal)/terms/page.tsx` |
| EDIT | `src/components/admin/landing-settings-form.tsx` |
| EDIT | `src/lib/usage/campaign-limits.ts` |
| EDIT | `src/lib/supabase/middleware.ts` |

**Total: 2 deletions, 2 renames, 11 edits = 15 file touches**

## Resolved Questions

1. **Welcome card benefits — "per week" or "per month"?** → **2 campaigns per month.** Matches `TIER_LIMITS.free.campaigns = 2` with the monthly reset cycle in `getCampaignUsage`.
2. **Terms of Service "Beta Service" section — trim or rewrite?** → **Replace with a "Service Tiers" section** describing the current Free / Pro / Enterprise model. Keep general disclaimers about feature changes and availability.
