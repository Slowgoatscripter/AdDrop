# Clean Up Beta References in Settings & Admin Configuration

**Status:** Approved
**Date:** 2026-02-26
**Tier:** L2
**Priority:** Medium

---

## 1. Problem Statement

AdDrop is transitioning from beta to v1. The admin interface and configuration layer still contain beta-specific settings that were appropriate during the beta period but no longer make sense for a v1 product with account tiers (Free / Pro / Enterprise). This task focuses specifically on the **admin form fields** and **configuration defaults** — the settings layer that drives the landing page and product messaging.

The account tiers design (approved 2026-02-24) replaces the old "2 campaigns/week, free during beta" model with tier-based limits (2/month Free, 15/month Pro, 75/month Enterprise). Beta-flavored admin settings and defaults need to reflect this.

---

## 2. Scope

This task is scoped to **admin settings and configuration defaults only**. It does NOT cover:

- UI components that consume beta values (e.g., `BetaBadge`, `BetaUsageCard`, `BetaLimitReached`, `BetaSignupBanner`) — those are separate tasks
- Campaign rate-limiting logic (`campaign-limits.ts`) — that will be updated when tiers are implemented
- Middleware route comments (`// Beta-gated routes`) — cosmetic, not affecting behavior
- Legal pages (`terms/page.tsx` "Beta Service" language) — separate legal review

### Files in Scope

| File | Beta Reference | What It Does |
|------|---------------|--------------|
| `src/components/admin/landing-settings-form.tsx` | `ctaBeta` state, `landing.cta_beta` field, "Beta Notice" label/input | Admin form field for editing the CTA footer's beta notice text |
| `src/lib/settings/defaults.ts` | `'landing.cta_beta'` default value, FAQ answer mentioning "free during beta" | Default configuration values loaded when no DB override exists |
| `src/lib/types/settings.ts` | `LANDING_CTA_BETA` constant | TypeScript setting key constant |
| `src/app/page.tsx` | `betaNotice={s['landing.cta_beta']}` prop | Landing page passes beta setting to CTAFooter |

**Note:** `page.tsx` metadata ("Free during beta.") is out of scope — handled by the broader metadata cleanup task.

### Files Adjacent but Out of Scope

These files consume the values being cleaned up, so they need awareness but are handled by other tasks:

- `src/components/landing/cta-footer.tsx` — has `betaNotice` prop (already marked "legacy")
- `src/components/landing/social-proof.tsx` — hardcoded "Free during beta."
- `src/app/layout.tsx` — metadata description "Free during beta"
- `src/app/page.tsx` metadata description — broader metadata cleanup task

---

## 3. Inventory of Changes

### 3.1 Admin Form: `landing-settings-form.tsx`

**Current state:** Contains a "Beta Notice" input field in the "Footer CTA" section (line 188-191). The field manages the `landing.cta_beta` setting key, which stores a string like "Free during beta. 2 campaigns per week. No credit card required."

**What needs to change:** Remove the beta-specific form field entirely, or repurpose it as a generic "CTA Description" or "CTA Subtitle" field.

### 3.2 Configuration Defaults: `defaults.ts`

**Current state:**
- Line 39: `'landing.cta_beta': 'Free during beta. 2 campaigns per week. No credit card required.'`
- Line 29: FAQ answer says "Yes — AdDrop is completely free during beta."

**What needs to change:** Remove the beta default value and update FAQ default text.

### 3.3 Type Constants: `settings.ts`

**Current state:** Line 20: `LANDING_CTA_BETA: 'landing.cta_beta'`

**What needs to change:** Remove or rename the constant.

### 3.4 Landing Page: `page.tsx`

**Current state:** Line 82: Passes `betaNotice={s['landing.cta_beta'] as string}` to `CTAFooter`.

**What needs to change:** Stop passing the beta prop; use a v1-appropriate prop instead.

**Out of scope:** The metadata description on line 22 ("Free during beta.") is handled by the broader metadata cleanup task.

---

## 4. Approaches

### Approach A: Remove Beta Field, Replace with Generic "CTA Description" (Recommended)

**What:** Rename `landing.cta_beta` → `landing.cta_description` throughout the admin form, defaults, types, and landing page. The admin keeps the same number of editable fields — but the field label changes from "Beta Notice" to "CTA Description" and the default value becomes v1-appropriate text.

**Changes:**
1. `settings.ts`: Rename `LANDING_CTA_BETA` → `LANDING_CTA_DESCRIPTION`, value `'landing.cta_description'`
2. `defaults.ts`: Replace beta default with v1 text (e.g., "Create a free account and generate your first campaign in minutes.")
3. `defaults.ts`: Update FAQ answer to remove "free during beta" language
4. `landing-settings-form.tsx`: Rename `ctaBeta` → `ctaDescription`, label "Beta Notice" → "CTA Description"
5. `page.tsx`: Pass `description={s['landing.cta_description']}` instead of `betaNotice` (metadata update deferred to broader metadata cleanup)

**Pros:**
- Admin retains the ability to edit the CTA subtitle (useful for marketing changes)
- Clean migration path — same field concept, new name
- `CTAFooter` already accepts a `description` prop alongside the legacy `betaNotice`, so the consumer is ready

**Cons:**
- Slightly more files touched than pure removal

**Risk mitigation:** The `defaults.ts` fallback system means if `landing.cta_description` has no DB value, it falls back to the new default. Old `landing.cta_beta` rows in the DB become inert — no migration needed (see §6.5).

### Approach B: Remove Beta Field Entirely, No Replacement

**What:** Delete the `landing.cta_beta` setting key, the admin form field, and the default value. The `CTAFooter` component falls back to its hardcoded default description.

**Changes:**
1. `settings.ts`: Remove `LANDING_CTA_BETA`
2. `defaults.ts`: Remove `'landing.cta_beta'` entry, update FAQ
3. `landing-settings-form.tsx`: Remove `ctaBeta` state, remove the "Beta Notice" form field, remove from save/reset handlers
4. `page.tsx`: Stop passing `betaNotice` prop, update metadata

**Pros:**
- Simplest change — fewer lines, fewer concepts
- No migration needed; old DB rows are just ignored

**Cons:**
- Admin loses the ability to edit the CTA subtitle without a code deploy
- Reduces admin flexibility — the whole point of the settings system is to avoid code deploys for copy changes

### Approach C: Keep Field As-Is, Just Change Default Value

**What:** Keep `landing.cta_beta` as the setting key but update the default value to v1 text. Keep the admin label as "Beta Notice" or rename it cosmetically.

**Changes:**
1. `defaults.ts`: Change default value to v1-appropriate text
2. `defaults.ts`: Update FAQ answer
3. `landing-settings-form.tsx`: Rename label from "Beta Notice" to "CTA Subtitle" (cosmetic only)
4. `page.tsx`: Update metadata

**Pros:**
- Minimal code changes
- No risk of breaking DB references

**Cons:**
- Technical debt — the setting key still says "beta" in the database and codebase
- Confusing for future developers who see `cta_beta` with no beta relationship
- Doesn't satisfy the acceptance criterion of "removing beta references"

---

## 5. Recommendation

**Approach A: Remove Beta Field, Replace with Generic "CTA Description"** is the recommended approach.

Rationale:
1. It satisfies all acceptance criteria (beta references removed, v1-appropriate defaults, admin interface updated)
2. It preserves admin flexibility — the settings system exists so that copy changes don't require code deploys, and removing a configurable field is a step backward
3. The `CTAFooter` component already supports a `description` prop, so the consumer-side change is minimal
4. The migration risk is low because the defaults system provides automatic fallback

---

## 6. Detailed Design

### 6.1 Type Changes (`src/lib/types/settings.ts`)

Remove:
```typescript
LANDING_CTA_BETA: 'landing.cta_beta',
```

Add:
```typescript
LANDING_CTA_DESCRIPTION: 'landing.cta_description',
```

### 6.2 Default Changes (`src/lib/settings/defaults.ts`)

Remove:
```typescript
'landing.cta_beta': 'Free during beta. 2 campaigns per week. No credit card required.',
```

Add:
```typescript
'landing.cta_description': 'Create a free account and generate your first campaign in minutes.',
```

Update FAQ default (first item):
```typescript
{
  question: 'Is AdDrop really free?',
  answer: 'Yes — AdDrop offers a free tier with 2 campaigns per month. No credit card required. Upgrade to Pro or Enterprise for more campaigns and additional features.'
}
```

### 6.3 Admin Form Changes (`src/components/admin/landing-settings-form.tsx`)

- Rename `ctaBeta` state → `ctaDescription`
- Change `settings['landing.cta_beta']` → `settings['landing.cta_description']`
- Update save handler: `'landing.cta_description': ctaDescription`
- Update reset handler: replace `'landing.cta_beta'` → `'landing.cta_description'`
- Change label from "Beta Notice" → "CTA Description"

### 6.4 Landing Page Changes (`src/app/page.tsx`)

Replace:
```tsx
betaNotice={s['landing.cta_beta'] as string}
```

With:
```tsx
description={s['landing.cta_description'] as string}
```

**Do NOT touch the metadata description** — that is handled by the broader metadata cleanup task.

### 6.5 Data Migration

**Decision: No migration. Let stale rows go inert.**

The defaults system handles this gracefully:
- When code stops reading `landing.cta_beta`, any existing DB row just sits there doing nothing
- If no DB row exists for `landing.cta_description`, the new default from `defaults.ts` is used automatically
- No risk, no urgency — a cleanup query (`DELETE FROM app_settings WHERE key = 'landing.cta_beta'`) can be bundled into the tiers migration or routine DB maintenance later

This avoids adding a migration step for a zero-risk scenario.

---

## 7. Testing Strategy

1. **Admin form:** Verify the "CTA Description" field appears, saves, and resets correctly
2. **Landing page:** Verify the CTAFooter renders the description from settings
3. **Default fallback:** Verify that with no DB value, the new default text appears
4. **No beta text:** Grep the modified files for "beta" to confirm none remain
5. **Existing tests:** Run `campaign-limits.test.ts` to confirm no breakage (these tests are out of scope but could be affected by imports)

---

## 8. Out-of-Scope Items for Future Tasks

| Item | File(s) | Why Deferred |
|------|---------|--------------|
| `BetaBadge` component removal | `beta-badge.tsx`, `app-header.tsx` | Separate UI cleanup task |
| `BetaUsageCard` → tier-aware card | `beta-usage-card.tsx`, `dashboard/page.tsx` | Depends on tiers implementation |
| `BetaLimitReached` → tier-aware limit | `beta-limit-reached.tsx`, `create/page.tsx` | Depends on tiers implementation |
| `BetaSignupBanner` removal | `beta-signup-banner.tsx`, `signup/page.tsx` | Separate UI cleanup task |
| `BETA_CAMPAIGN_LIMIT` constant rename | `campaign-limits.ts`, `campaign-limits.test.ts` | Rate limiting refactor with tiers |
| Middleware "Beta-gated" comment | `middleware.ts` | Cosmetic; no behavior change |
| Landing hardcoded beta strings | `social-proof.tsx`, `cta-footer.tsx` | Separate landing page cleanup task |
| Terms page "Beta Service" text | `(legal)/terms/page.tsx` | Legal review needed |
| App metadata "Free during beta" | `layout.tsx`, `page.tsx` | Broader metadata cleanup task |
| Stale `landing.cta_beta` DB rows | `app_settings` table | Bundle into tiers migration or routine maintenance |

---

> **Brainstormer** `opus` · 2026-02-26T03:55:55.242Z
