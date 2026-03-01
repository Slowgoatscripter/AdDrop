# Remove Pricing Section from Landing Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the pricing section from the main landing page to reduce conversion friction, since pricing now lives on its own dedicated `/pricing` page.

**Architecture:** The landing page (`src/app/page.tsx`) imports and renders `<PricingSection />` from `src/components/landing/pricing-section.tsx`. We remove the import and JSX usage from the page, then delete the now-orphaned component file. No layout/spacing adjustments are needed — each landing section self-contains its own `py-24` padding. The dedicated `/pricing` page at `src/app/pricing/page.tsx` uses a completely separate `PricingTable` component and is not affected.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS

**Pre-existing issues:** There are 2 unrelated TypeScript errors in `src/app/api/export/bundle/__tests__/route.test.ts`. These exist before our changes and should be ignored when verifying compilation.

---

### Task 1: Remove PricingSection import and JSX from the landing page

**Files:**
- Modify: `src/app/page.tsx` (line 10: remove import, line 79: remove JSX)

**Step 1: Remove the PricingSection import**

In `src/app/page.tsx`, delete line 10. The import block currently reads:

```tsx
import { WhoItsFor } from '@/components/landing/who-its-for';
import { PricingSection } from '@/components/landing/pricing-section';
import { FAQ } from '@/components/landing/faq';
```

After the edit it should read:

```tsx
import { WhoItsFor } from '@/components/landing/who-its-for';
import { FAQ } from '@/components/landing/faq';
```

**Step 2: Remove the PricingSection JSX usage**

In the same file, delete the `<PricingSection />` line (currently line 79). The JSX currently reads:

```tsx
        <WhoItsFor />
        <PricingSection />
        <FAQ faqs={faqs} />
```

After the edit it should read:

```tsx
        <WhoItsFor />
        <FAQ faqs={faqs} />
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i pricing`
Expected: **No output.** (The 2 pre-existing errors in `route.test.ts` are unrelated and should remain — zero new errors.)

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: remove pricing section from landing page

Pricing now lives exclusively on the dedicated /pricing page,
reducing conversion friction on the main landing flow."
```

---

### Task 2: Delete the orphaned PricingSection component file

**Files:**
- Delete: `src/components/landing/pricing-section.tsx`

**Step 1: Safety check — verify no other files import the component**

Run: `grep -r "pricing-section" src/ --include="*.ts" --include="*.tsx"`
Expected: **No output.** (The only import was in `page.tsx`, removed in Task 1.)

⚠️ **If there ARE results, STOP and report back. Do NOT delete the file.**

**Step 2: Delete the file**

```bash
rm src/components/landing/pricing-section.tsx
```

**Step 3: Verify TypeScript still compiles cleanly**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i pricing`
Expected: **No output.** No new errors introduced.

**Step 4: Commit**

```bash
git add src/components/landing/pricing-section.tsx
git commit -m "chore: delete orphaned pricing-section landing component

This component is no longer rendered anywhere. The dedicated
/pricing page uses its own PricingTable component instead."
```

---

### Task 3: Build verification and final checks

**Step 1: Run the full Next.js production build**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds. The landing page route (`/`) compiles without errors. Look for `✓ Compiled successfully` or the route table showing `/` as compiled.

**Step 2: Run the lint check**

Run: `npx next lint 2>&1 | tail -10`
Expected: No new lint errors related to pricing.

**Step 3: Run existing tests**

Run: `npx jest --passWithNoTests 2>&1 | tail -20`
Expected: All existing tests pass (there are no landing-page-specific tests, but this catches transitive breakage).

**Step 4: (Optional) Visual spot-check via dev server**

Run: `npx next dev`
Then navigate to `http://localhost:3000` and confirm:
- The landing page loads without errors
- `<WhoItsFor />` flows directly into `<FAQ />` with no gap
- No empty space or layout breakage where pricing used to be
- The `/pricing` page still works independently at `http://localhost:3000/pricing`

---

## Summary of Changes

| Action | File | Reason |
|--------|------|--------|
| Modify | `src/app/page.tsx` | Remove `PricingSection` import (line 10) + JSX usage (line 79) |
| Delete | `src/components/landing/pricing-section.tsx` | Orphaned — no longer imported anywhere |

**Not touched (confirmed no changes needed):**
- `src/app/pricing/page.tsx` — Dedicated pricing page, uses separate `PricingTable` component
- `src/components/pricing/pricing-table.tsx` — Used by `/pricing` page, completely unrelated
- `src/components/nav/app-header.tsx` — No pricing links in navigation (confirmed via grep)
- `src/components/nav/footer.tsx` — No pricing links in footer (confirmed via grep)
- `src/components/nav/mobile-drawer.tsx` — No pricing links in mobile nav (confirmed via grep)
- No `#pricing` anchor links exist anywhere in the codebase (confirmed via grep)

---

Plan complete and saved to `docs/plans/2026-02-25-remove-landing-pricing-section.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?
