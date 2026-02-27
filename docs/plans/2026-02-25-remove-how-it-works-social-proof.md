# Remove How It Works & Social Proof Sections — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the How It Works and Social Proof sections from the landing page to shorten it and eliminate sections with no real testimonials.

**Architecture:** Pure deletion — remove two imports and two JSX elements from `page.tsx`, then delete the two component files. No new code needed.

**Tech Stack:** Next.js (App Router), React, TypeScript

---

### Task 1: Remove imports and JSX from `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Remove the HowItWorks import**

In `src/app/page.tsx`, delete this line:

```typescript
import { HowItWorks } from '@/components/landing/how-it-works';
```

**Step 2: Remove the SocialProof import**

In the same file, delete this line:

```typescript
import { SocialProof } from '@/components/landing/social-proof';
```

> **Note:** Do NOT remove the `LandingStat` type import — it is still used by the `<Hero>` component on line 69.

**Step 3: Remove the `<HowItWorks />` JSX element**

In the JSX return, delete this line (between `<InteractiveDemo />` and `<ShowcaseCarousel />`):

```tsx
        <HowItWorks />
```

**Step 4: Remove the `<SocialProof />` JSX element**

In the JSX return, delete this line (between `<ShowcaseCarousel />` and `<FeaturesGrid />`):

```tsx
        <SocialProof />
```

**Step 5: Verify the resulting JSX order**

After removal, the component render order inside `<main>` should be:

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

Run: `npx tsc --noEmit`
Expected: No errors mentioning `HowItWorks`, `SocialProof`, `how-it-works`, or `social-proof`. Pre-existing errors unrelated to this change are acceptable.

**Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: remove HowItWorks and SocialProof from landing page"
```

---

### Task 2: Delete the component files

**Files:**
- Delete: `src/components/landing/how-it-works.tsx`
- Delete: `src/components/landing/social-proof.tsx`

**Step 1: Verify no other files import these components**

Run: `grep -r "how-it-works\|HowItWorks" src/`
Expected: No results (only docs/plans/ references should exist, not src/).

Run: `grep -r "social-proof\|SocialProof" src/`
Expected: No results.

**Step 2: Delete the files**

```bash
rm src/components/landing/how-it-works.tsx
rm src/components/landing/social-proof.tsx
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No new errors. Specifically, no "Cannot find module" errors for the deleted files.

**Step 4: Commit**

```bash
git add src/components/landing/how-it-works.tsx src/components/landing/social-proof.tsx
git commit -m "chore: delete unused HowItWorks and SocialProof component files"
```

---

### Task 3: Visual smoke test

**Step 1: Start the dev server (if not already running)**

Run: `npm run dev`

**Step 2: Verify the landing page**

Open `http://localhost:3000` and confirm:
- The page loads without errors
- No "How It Works" section appears
- No "Why Agents Choose AdDrop" section appears
- The flow is: Hero → PlatformBar → InteractiveDemo → ShowcaseCarousel → FeaturesGrid → WhoItsFor → FAQ → CTAFooter
- No layout breaks or unexpected spacing gaps between remaining sections
- Mobile layout is also intact (resize browser or use dev tools)

**Step 3: Check the browser console**

Expected: No new errors or warnings related to the removed components.

---

## Summary

| Task | Action | Files |
|------|--------|-------|
| 1 | Remove imports + JSX from page | `src/app/page.tsx` |
| 2 | Delete component files | `src/components/landing/how-it-works.tsx`, `src/components/landing/social-proof.tsx` |
| 3 | Visual smoke test | None (manual verification) |

**Total estimated time:** ~5 minutes

**Risks:**
- `npx tsc --noEmit` may show pre-existing errors unrelated to this change — only errors mentioning the removed components indicate a problem.
- Do NOT remove the `LandingStat` type import from `page.tsx` — it is used by the `<Hero>` component.
