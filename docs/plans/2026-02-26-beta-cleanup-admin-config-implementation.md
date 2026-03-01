# Beta Cleanup: Admin Config Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename `landing.cta_beta` → `landing.cta_description` across settings types, defaults, admin form, and landing page — removing all beta-flavored language from the admin configuration layer.

**Architecture:** Four files are modified in a strict dependency order: types → defaults → admin form → landing page. The `CTAFooter` component already accepts a `description` prop (alongside the legacy `betaNotice`), so no consumer changes are needed. No DB migration — stale `landing.cta_beta` rows go inert automatically.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React, Jest (ts-jest), Supabase (settings storage)

**Design doc:** `docs/plans/2026-02-26-beta-cleanup-admin-config-design.md` (Approved)

**Warnings:**
1. Do NOT update `page.tsx` metadata (line 22 "Free during beta.") — that is a separate metadata cleanup task
2. Do NOT modify `cta-footer.tsx` or other beta components (`BetaBadge`, `BetaUsageCard`, etc.) — those are separate tasks
3. The FAQ default text uses tier names Free/Pro/Enterprise from the approved 2026-02-24 account tiers design

---

### Task 1: Rename the type constant in `settings.ts`

**Files:**
- Modify: `src/lib/types/settings.ts:20` (rename constant)

**Step 1: Replace `LANDING_CTA_BETA` with `LANDING_CTA_DESCRIPTION`**

In `src/lib/types/settings.ts`, change line 20 from:

```typescript
LANDING_CTA_BETA: 'landing.cta_beta',
```

to:

```typescript
LANDING_CTA_DESCRIPTION: 'landing.cta_description',
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Compilation errors in `defaults.ts` and/or `landing-settings-form.tsx` referencing `landing.cta_beta` — this is expected because we haven't updated those files yet. The key check is that `settings.ts` itself has no syntax errors. Look for errors *in* `settings.ts` — there should be none.

**Step 3: Commit**

```bash
git add src/lib/types/settings.ts
git commit -m "refactor: rename LANDING_CTA_BETA → LANDING_CTA_DESCRIPTION in settings types"
```

---

### Task 2: Update default values and FAQ text in `defaults.ts`

**Files:**
- Modify: `src/lib/settings/defaults.ts:29,39` (rename key + update FAQ answer)

**Step 1: Replace the `landing.cta_beta` default with `landing.cta_description`**

In `src/lib/settings/defaults.ts`, change line 39 from:

```typescript
'landing.cta_beta': 'Free during beta. 2 campaigns per week. No credit card required.',
```

to:

```typescript
'landing.cta_description': 'Create a free account and generate your first campaign in minutes.',
```

**Step 2: Update the FAQ default answer (first FAQ item)**

In the same file, change line 29 — the first item in the `'landing.faq'` array — from:

```typescript
{ question: 'Is AdDrop really free?', answer: 'Yes — AdDrop is completely free during beta. Create a free account, get 2 campaigns per week, and never see a credit card form.' },
```

to:

```typescript
{ question: 'Is AdDrop really free?', answer: 'Yes — AdDrop offers a free tier with 2 campaigns per month. No credit card required. Upgrade to Pro or Enterprise for more campaigns and additional features.' },
```

**Step 3: Verify no "beta" text remains in `defaults.ts`**

Run: `grep -in "beta" src/lib/settings/defaults.ts`
Expected: **No output** — zero matches. If any matches appear, investigate and fix.

**Step 4: Commit**

```bash
git add src/lib/settings/defaults.ts
git commit -m "refactor: rename landing.cta_beta default to landing.cta_description, update FAQ text"
```

---

### Task 3: Rename state, label, and handlers in the admin form

**Files:**
- Modify: `src/components/admin/landing-settings-form.tsx:29,63,81,189-190` (rename state variable, update save/reset handlers, change label)

There are exactly 5 occurrences to change in this file. Make each edit carefully.

**Step 1: Rename the state variable (line 29)**

Change:

```typescript
const [ctaBeta, setCtaBeta] = useState(settings['landing.cta_beta'] as string)
```

to:

```typescript
const [ctaDescription, setCtaDescription] = useState(settings['landing.cta_description'] as string)
```

**Step 2: Update the save handler (line 63)**

In the `handleSave` function, change:

```typescript
'landing.cta_beta': ctaBeta,
```

to:

```typescript
'landing.cta_description': ctaDescription,
```

**Step 3: Update the reset handler (line 81)**

In the `handleReset` function's `resetSettings` array, change:

```typescript
'landing.cta_headline', 'landing.cta_text', 'landing.cta_beta',
```

to:

```typescript
'landing.cta_headline', 'landing.cta_text', 'landing.cta_description',
```

**Step 4: Update the form label and input (lines 189-190)**

Change:

```tsx
<label className={labelClass}>Beta Notice</label>
<input className={inputClass} value={ctaBeta} onChange={(e) => setCtaBeta(e.target.value)} />
```

to:

```tsx
<label className={labelClass}>CTA Description</label>
<input className={inputClass} value={ctaDescription} onChange={(e) => setCtaDescription(e.target.value)} />
```

**Step 5: Verify no "beta" text remains in the admin form**

Run: `grep -in "beta" src/components/admin/landing-settings-form.tsx`
Expected: **No output** — zero matches.

**Step 6: Commit**

```bash
git add src/components/admin/landing-settings-form.tsx
git commit -m "refactor: rename ctaBeta → ctaDescription in admin landing settings form"
```

---

### Task 4: Update the landing page prop in `page.tsx`

**Files:**
- Modify: `src/app/page.tsx:82` (swap prop name and setting key)

**⚠️ IMPORTANT:** Do NOT modify the `metadata` object (lines 19-30). The "Free during beta." text in the metadata description is out of scope — it belongs to a separate metadata cleanup task.

**Step 1: Update the CTAFooter prop (line 82)**

Change:

```tsx
betaNotice={s['landing.cta_beta'] as string}
```

to:

```tsx
description={s['landing.cta_description'] as string}
```

**Step 2: Verify no "beta" references remain in the CTAFooter call**

Run: `grep -n "betaNotice\|cta_beta" src/app/page.tsx`
Expected: **No output** — zero matches.

Note: `grep -n "beta" src/app/page.tsx` will still match line 22 (the metadata description). That is expected and out of scope. The key assertion is that the CTAFooter prop no longer uses beta references.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: pass description prop to CTAFooter instead of betaNotice"
```

---

### Task 5: Full verification — type check, build, and beta grep

**Files:** None (verification only)

**Step 1: TypeScript type check**

Run: `npx tsc --noEmit --pretty`
Expected: **No errors.** If there are errors, they indicate a missed rename — fix before proceeding.

**Step 2: Grep all 4 modified files for lingering beta references**

Run: `grep -Hin "beta" src/lib/types/settings.ts src/lib/settings/defaults.ts src/components/admin/landing-settings-form.tsx src/app/page.tsx`
Expected output — **only** the metadata line in `page.tsx`:
```
src/app/page.tsx:22:    'AdDrop generates complete real estate ad campaigns in minutes. Enter your property details and get copy for Instagram, Facebook, Google Ads, print, direct mail, and 8+ more platforms. Free during beta.',
```
If any other lines appear, they are missed renames — go back and fix.

**Step 3: Run the full build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build completes successfully with no errors. Warnings about other components are acceptable.

**Step 4: Run existing test suite to confirm no regressions**

Run: `npx jest --passWithNoTests 2>&1 | tail -20`
Expected: All existing tests pass. No test directly tests the settings we renamed, but this confirms no import chain breakage.

**Step 5: Commit (if any fixups were needed)**

If you made any corrections in Steps 1-4, commit them:
```bash
git add -A
git commit -m "fix: address verification issues from beta cleanup"
```

If no fixups were needed, skip this step.

---

### Summary of Changes

| File | Before | After |
|------|--------|-------|
| `src/lib/types/settings.ts:20` | `LANDING_CTA_BETA: 'landing.cta_beta'` | `LANDING_CTA_DESCRIPTION: 'landing.cta_description'` |
| `src/lib/settings/defaults.ts:39` | `'landing.cta_beta': 'Free during beta...'` | `'landing.cta_description': 'Create a free account...'` |
| `src/lib/settings/defaults.ts:29` | FAQ: `'...free during beta...'` | FAQ: `'...free tier with 2 campaigns per month...'` |
| `src/components/admin/landing-settings-form.tsx:29` | `ctaBeta` state, `'landing.cta_beta'` | `ctaDescription` state, `'landing.cta_description'` |
| `src/components/admin/landing-settings-form.tsx:63` | save handler uses `'landing.cta_beta': ctaBeta` | `'landing.cta_description': ctaDescription` |
| `src/components/admin/landing-settings-form.tsx:81` | reset handler includes `'landing.cta_beta'` | `'landing.cta_description'` |
| `src/components/admin/landing-settings-form.tsx:189-190` | label "Beta Notice", uses `ctaBeta` | label "CTA Description", uses `ctaDescription` |
| `src/app/page.tsx:82` | `betaNotice={s['landing.cta_beta']}` | `description={s['landing.cta_description']}` |

### Files NOT Modified (by design)

- `src/components/landing/cta-footer.tsx` — already has `description` prop; legacy `betaNotice` prop stays for backwards compatibility (separate cleanup task)
- `src/app/page.tsx` metadata (line 22) — separate metadata cleanup task
- `src/components/landing/social-proof.tsx` — hardcoded beta text; separate landing page cleanup
- `src/app/layout.tsx` — metadata description; separate metadata cleanup
- Any `Beta*` components — separate UI cleanup tasks
- Database — no migration; stale `landing.cta_beta` rows go inert

---

> **Planner** `opus` · 2026-02-26T04:04:54.400Z
