# Remove All Beta References — Design

**Status:** Approved
**Date:** 2026-02-26
**Scope:** Language/branding cleanup — no behavior changes except where explicitly noted

---

## Overview

AdDrop is transitioning from beta positioning to a production service with defined tiers (see `2026-02-24-account-tiers-payments-design.md`). This task removes all user-facing and code-level references to "beta" from the codebase. The enforcement window (`BETA_WINDOW_DAYS = 7`) and all "this week" copy are **out of scope** — those change atomically with the tiers implementation task.

---

## Scope Decisions

| Item | Decision |
|---|---|
| `BETA_WINDOW_DAYS` constant + "this week" copy | **Deferred** — bundle with tiers implementation |
| `BETA_CAMPAIGN_LIMIT` constant name | **In scope** — pure naming, no behavior change |
| Enforcement window value (7 days) | **Unchanged** |
| DB key `landing.cta_beta` | **Preserved** — backward compatibility with live data |
| `betaNotice` prop in CTAFooter | **Renamed** to `notice` |

---

## Changes: DELETE (2 files)

### 1. `src/components/ui/beta-badge.tsx`
Delete entirely. Single consumer is `app-header.tsx` (updated in EDIT section below).

### 2. ~~`src/components/dashboard/beta-usage-card.tsx`~~
**Revised:** Do NOT delete. Rename in-place (see RENAME section below). The "replacement" component does not exist — in-place rename is the correct approach.

---

## Changes: RENAME + REWRITE (3 files)

### 1. `src/components/auth/beta-signup-banner.tsx` → `src/components/auth/signup-benefits-banner.tsx`

- Rename file
- Rename export: `BetaSignupBanner` → `SignupBenefitsBanner`
- Update content: remove "beta" from all strings
  - `"Create a free beta account to start generating ads."` → `"Create a free account to start generating ads."`
  - Bullet `'Free during beta'` → `'Free to get started'`

### 2. `src/components/create/beta-limit-reached.tsx` → `src/components/create/plan-limit-reached.tsx`

- Rename file
- Rename export: `BetaLimitReached` → `PlanLimitReached`
- Update content:
  - `"You've hit your beta limit this week."` → `"You've reached your plan limit this week."`
  - `"Want unlimited campaigns? We're working on premium plans. Stay tuned."` → `"Want more campaigns? Upgrade your plan for higher limits."`

### 3. `src/components/dashboard/beta-usage-card.tsx` → `src/components/dashboard/tier-usage-card.tsx`

- Rename file
- Rename export: `BetaUsageCard` → `TierUsageCard`
- Replace all 3x inline `"Beta"` badge text with `"Free Plan"`:
  - Line 24 (exempt state): `text-gold px-1.5 py-0.5 rounded-sm font-bold">Beta</span>` → `">Free Plan</span>`
  - Line 44 (normal header): same replacement
- No logic changes

---

## Changes: EDIT (17 files)

### 1. `src/components/nav/app-header.tsx`
- Remove import line 12: `import { BetaBadge } from '@/components/ui/beta-badge'`
- Remove render line 136: `{variant === 'app' && <BetaBadge />}`

### 2. `src/app/signup/page.tsx`
- Update import line 9: `'@/components/auth/beta-signup-banner'` → `'@/components/auth/signup-benefits-banner'`
- Update usage line 120: `<BetaSignupBanner />` → `<SignupBenefitsBanner />`

### 3. `src/app/create/page.tsx`
- Update import line 7: `'@/components/create/beta-limit-reached'` → `'@/components/create/plan-limit-reached'`
- Update usage line 29: `<BetaLimitReached` → `<PlanLimitReached`

### 4. `src/app/dashboard/page.tsx`
- Update import line 10: `'@/components/dashboard/beta-usage-card'` → `'@/components/dashboard/tier-usage-card'`
- Update usage line 152: `<BetaUsageCard` → `<TierUsageCard`
- Update comment line 151: `{/* Beta usage card */}` → `{/* Usage card */}`
- Update footer text line 199: `"AdDrop Beta &mdash; 2 campaigns per week, free during beta."` → `"AdDrop &mdash; 2 campaigns per week."`

### 5. `src/components/dashboard/welcome-card.tsx`
- Line 15: `"Welcome to AdDrop Beta"` → `"Welcome to AdDrop"`
- Line 17: `"You're in. Here's what you get:"` → `"Here's what you get:"`

### 6. `src/lib/usage/campaign-limits.ts`
- Line 3: `export const BETA_CAMPAIGN_LIMIT = 2` → `export const CAMPAIGN_LIMIT = 2`
- Line 4: leave `BETA_WINDOW_DAYS` unchanged (deferred)

### 7. `src/lib/usage/campaign-limits.test.ts`
- Line 1: update import `BETA_CAMPAIGN_LIMIT` → `CAMPAIGN_LIMIT`
- Update all usages of `BETA_CAMPAIGN_LIMIT` in test assertions (lines 81, 82)

### 8. `src/app/api/generate/route.ts`
- Line 49 comment: `// Beta rate limit check` → `// Rate limit check`
- Line 53 error string: `'Beta campaign limit reached'` → `'Campaign limit reached'`

### 9. `src/app/api/campaign/create/route.ts`
- Line 48 comment: update "beta" reference → `// Rate limit check`
- Line 52 error string: `'Beta campaign limit reached'` → `'Campaign limit reached'`

### 10. `src/lib/supabase/middleware.ts`
- Line 136 comment: `// Beta-gated routes` → `// Auth-required routes`

### 11. `src/lib/types/settings.ts`
- Line 20: `LANDING_CTA_BETA: 'landing.cta_beta'` → `LANDING_CTA_NOTICE: 'landing.cta_beta'`
  - **DB key string `'landing.cta_beta'` is preserved — only the TS constant name changes**

### 12. `src/lib/settings/defaults.ts`
- Line 29 (FAQ default answer): remove "during beta" from `"Yes — AdDrop is completely free during beta..."`
  → `"Yes — AdDrop offers a free tier. Create a free account, get 2 campaigns per week, and never see a credit card form."`
- Line 39 (cta_beta default value): `'Free during beta. 2 campaigns per week. No credit card required.'`
  → `'Free to get started. 2 campaigns per week. No credit card required.'`

### 13. `src/components/admin/landing-settings-form.tsx`
- Line 29: rename local variable `ctaBeta` → `ctaSubtitle`
- Line 63: update key in saveSettings call (variable renamed, string key `'landing.cta_beta'` stays)
- Line 81: update key in resetSettings call (same)
- Line 189: label `"Beta Notice"` → `"Promo Notice"`

### 14. `src/components/landing/social-proof.tsx`
- Line 80: `"Free during beta."` → `"Free to get started."`

### 15. `src/components/landing/faq.tsx`
- Line 13 (defaultFaqs hardcoded answer): `"Yes — AdDrop is completely free during beta. Create a free account, get 2 campaigns per week, and never see a credit card form. We want you to try it and tell us what you think."`
  → `"Yes — AdDrop offers a free tier. Create a free account, get 2 campaigns per week, and never see a credit card form."`

### 16. `src/components/landing/cta-footer.tsx`
- Line 5 (valuePoints): `'Free beta account'` → `'Free account'`
- Line 17: prop name `betaNotice?: string` → `notice?: string`
- Line 23: destructure `betaNotice` → `notice`
- Line 27 (comment): update to reflect `notice` prop name
- Line 30: `betaNotice ||` → `notice ||`

### 17. `src/app/page.tsx`
- Line 22 (metadata description): remove `"Free during beta."` from end of string
- Line 82 (CTAFooter call): `betaNotice={s['landing.cta_beta']}` → `notice={s['landing.cta_beta']}`

### 18. `src/app/layout.tsx`
- Line 128 (JSON-LD): `description: 'Free during beta'` → `description: 'Free tier available'`

### 19. `src/app/(legal)/terms/page.tsx`
- Lines 55-65: Replace "Beta Service:" section with approved Service Tiers text:

```tsx
<p>
  <strong>Service Tiers:</strong> AdDrop offers multiple service tiers, including a free tier
  and paid subscription plans. Campaign limits, platform access, and feature availability
  vary by tier. Free accounts include a limited number of campaigns per calendar month.
  For current tier details and pricing, see our Pricing page at{' '}
  <Link href="/pricing">addrop.app/pricing</Link>. Features and limits may change as tiers
  evolve; material changes will be communicated in advance per Section 2.
</p>
```

Remove the existing `<ul>` beta bullet list (lines 57-62).

---

## Changes: NEW (1 file)

### `src/lib/__tests__/no-beta-strings.test.ts`

Regression sweep test that fails if any `\bbeta\b` string (case-insensitive) appears in source files outside the explicit allowlist.

**Scope:** `src/**/*.{ts,tsx}` only
**Allowlist (do not flag):**
- The string `'landing.cta_beta'` — DB key, intentionally preserved
- The string `cta_beta` — same key in any context
- This test file itself (self-referential)

---

## Implementation Order

Execute in this sequence to avoid broken intermediate TypeScript states:

1. `campaign-limits.ts` + `campaign-limits.test.ts` (constant rename, atomic pair)
2. `generate/route.ts` + `campaign/create/route.ts` (API error strings, independent)
3. `landing-settings-form.tsx` (variable rename + label, independent)
4. `beta-signup-banner.tsx` rename → `signup-benefits-banner.tsx` + `signup/page.tsx` update (atomic)
5. `beta-limit-reached.tsx` rename → `plan-limit-reached.tsx` + `create/page.tsx` update (atomic)
6. `beta-usage-card.tsx` rename → `tier-usage-card.tsx` + `dashboard/page.tsx` update (atomic)
7. `app-header.tsx` edit → delete `beta-badge.tsx` (atomic)
8. String-only edits (any order, no cross-dependencies): `welcome-card.tsx`, `social-proof.tsx`, `cta-footer.tsx`, `faq.tsx`, `page.tsx`, `layout.tsx`, `defaults.ts`, `settings.ts`, `middleware.ts`
9. `terms/page.tsx` (approved replacement text)
10. Create `no-beta-strings.test.ts`
11. Run full test suite

---

## What Is NOT In Scope

- `BETA_WINDOW_DAYS = 7` — deferred to tiers implementation task
- All "this week" copy (coupled to window value change)
- Stripe integration, subscriptions table, tier enforcement logic
- `/pricing` page (referenced in ToS but not built in this task — link is forward-looking)
