# Remove How It Works & Social Proof Sections — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the How It Works and Social Proof sections from the landing page to shorten it and eliminate sections without strong conversion value (no real testimonials yet).

**Architecture:** Simple deletion — remove two component files and strip their imports/JSX from the landing page. Both components are only used in `src/app/page.tsx`. Each section manages its own spacing via Tailwind (`py-24 px-6`), so no layout gaps will appear after removal. The `droplet-shape` CSS class used by how-it-works is shared across many other components and must NOT be removed.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.9, Tailwind CSS

---

### Task 1: Remove imports and JSX from the landing page

**Files:**
- Modify: `src/app/page.tsx` (lines 4, 7, 73, 75)

**Step 1: Remove the HowItWorks import**

In `src/app/page.tsx`, delete this entire line (currently line 4):

```typescript
import { HowItWorks } from '@/components/landing/how-it-works';
```

**Step 2: Remove the SocialProof import**

In the same file, delete this entire line (currently line 7, will shift to line 6 after step 1):

```typescript
import { SocialProof } from '@/components/landing/social-proof';
```

**Step 3: Remove `<HowItWorks />` from JSX**

In the JSX return block, delete the line containing `<HowItWorks />`. It sits between `<InteractiveDemo />` and `<ShowcaseCarousel />`. The result should be:

```tsx
        <InteractiveDemo />
        <ShowcaseCarousel />
```

**Step 4: Remove `<SocialProof />` from JSX**

In the JSX return block, delete the line containing `<SocialProof />`. It sits between `<ShowcaseCarousel />` and `<FeaturesGrid />`. The result should be:

```tsx
        <ShowcaseCarousel />
        <FeaturesGrid />
```

**Step 5: Verify the file looks correct**

After all edits, the complete imports block should be:

```typescript
import type { Metadata } from 'next';
import { Hero } from '@/components/landing/hero';
import { PlatformBar } from '@/components/landing/platform-bar';
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel';
import { InteractiveDemo } from '@/components/landing/interactive-demo';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { WhoItsFor } from '@/components/landing/who-its-for';
import { FAQ } from '@/components/landing/faq';
import { CTAFooter } from '@/components/landing/cta-footer';
import { MobileCTABar } from '@/components/landing/mobile-cta-bar';
import { AppHeader } from '@/components/nav/app-header';
import { getSettings } from '@/lib/settings/server';
import type { LandingStat, FAQItem } from '@/lib/types/settings';
import { FeedbackShell } from '@/components/feedback/feedback-shell';
import { Footer } from '@/components/nav/footer';
```

And the full JSX section order inside `<main>` should be:

```tsx
        <AppHeader variant="landing" />
        <Hero
          titlePrefix={s['landing.hero_title_prefix'] as string}
          titleAccent={s['landing.hero_title_accent'] as string}
          tagline={s['landing.hero_tagline'] as string}
          description={s['landing.hero_description'] as string}
          ctaText={s['landing.hero_cta'] as string}
          stats={s['landing.stats'] as LandingStat[]}
        />
        <PlatformBar />
        <InteractiveDemo />
        <ShowcaseCarousel />
        <FeaturesGrid />
        <WhoItsFor />
        <FAQ faqs={faqs} />
        <CTAFooter
          headline={s['landing.cta_headline'] as string}
          ctaText={s['landing.cta_text'] as string}
          betaNotice={s['landing.cta_beta'] as string}
        />
        <MobileCTABar />
```

**Step 6: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors mentioning `HowItWorks` or `SocialProof`. Pre-existing errors in other files are acceptable.

**Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor(landing): remove HowItWorks and SocialProof from page"
```

---

### Task 2: Delete the component files

**Files:**
- Delete: `src/components/landing/how-it-works.tsx` (108 lines)
- Delete: `src/components/landing/social-proof.tsx` (114 lines)

**Step 1: Delete how-it-works.tsx**

```bash
rm src/components/landing/how-it-works.tsx
```

**Step 2: Delete social-proof.tsx**

```bash
rm src/components/landing/social-proof.tsx
```

**Step 3: Verify no dangling references in application source code**

Run:
```bash
grep -r "how-it-works\|HowItWorks\|social-proof\|SocialProof" src/ --include="*.tsx" --include="*.ts"
```

Expected: **No output** (zero matches). References in `docs/plans/` are historical and can be ignored.

**Step 4: Commit**

```bash
git add -u src/components/landing/how-it-works.tsx src/components/landing/social-proof.tsx
git commit -m "chore: delete unused HowItWorks and SocialProof component files"
```

---

### Task 3: Build verification

**Files:** None (verification only)

**Step 1: Run the linter**

```bash
npm run lint
```

Expected: **No new errors.** Existing warnings are acceptable.

**Step 2: Run the production build**

```bash
npm run build
```

Expected: **Build succeeds** with exit code 0. The landing page route (`/`) should compile without errors. Watch for:
- `Module not found` errors → missed import removal
- Type errors → missed reference cleanup

**Step 3: Commit (only if lint/build required auto-fixes)**

If no fixes were needed, skip this step. Otherwise:

```bash
git add -A
git commit -m "fix: address lint/build issues from section removal"
```

---

## Spacing / Layout Safety Notes

After removal, the adjacent sections flow:

| # | Section | Spacing | Background |
|---|---------|---------|------------|
| 4 | InteractiveDemo | `py-24 px-6` | default |
| 5 | ShowcaseCarousel | `py-24 px-6` | default |
| 6 | FeaturesGrid | `py-24 px-6` | dot pattern bg |
| 7 | WhoItsFor | `py-24 px-6` | default |

Each section uses self-contained `py-24` vertical padding. **No spacing adjustments needed.** The `droplet-shape` CSS class in `globals.css` is used by 10+ other components — do NOT remove it.

---

## Summary of Changes

| Action | File | What |
|--------|------|------|
| Modify | `src/app/page.tsx` | Remove 2 imports + 2 JSX lines (−4 lines) |
| Delete | `src/components/landing/how-it-works.tsx` | 108 lines removed |
| Delete | `src/components/landing/social-proof.tsx` | 114 lines removed |

**Total: 3 files changed, ~226 lines removed, 0 lines added.**

> **Planner** `opus` · 2026-02-26T00:06:20.375Z
