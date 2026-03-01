# Fix V1 Launch Banner Interference with Fixed Navigation Header — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the LaunchBanner appear correctly below the fixed AppHeader without causing layout shifts, overlaps, or interaction conflicts on any screen size.

**Architecture:** The current LaunchBanner uses `relative` positioning (normal document flow), which renders it at `y=0` — directly behind the fixed AppHeader (`fixed top-0 z-50`). The fix converts the banner to `fixed` positioning anchored below the header (`top-14 md:top-[72px]`), adds `backdrop-blur-sm` for visual consistency, and bumps the hero section's mobile top padding from `py-20` (80px) to `pt-28 pb-20` (112px/80px) to guarantee content clears both the header (56px) and banner (40px) on small screens. Desktop uses `lg:pt-0 lg:pb-0` since flex-centering already provides ample clearance. No changes to `page.tsx` are needed — the import and JSX are already correct.

**Tech Stack:** Next.js 15 (React 19), Tailwind CSS, Framer Motion 12, Lucide React, Jest + React Testing Library

---

## Current State (What's Wrong)

**AppHeader** (`src/components/nav/app-header.tsx`):
- `fixed top-0 left-0 right-0 z-50`
- Height: `h-14` (56px mobile) / `md:h-[72px]` (72px desktop)
- Does NOT occupy space in the document flow

**LaunchBanner** (`src/components/landing/launch-banner.tsx`):
- `relative z-40` — in normal document flow
- Height: ~40-44px (`min-h-[40px] sm:min-h-[44px]`)
- Renders at `y=0` in the document, directly behind the fixed header (invisible)
- Pushes the Hero section down by 40-44px, creating layout inconsistency

**Hero** (`src/components/landing/hero.tsx`):
- `min-h-[90vh] flex items-center` — vertically centers its content
- Inner content div: `py-20 lg:py-0` — 80px top/bottom padding on mobile, 0 on desktop
- On mobile with long content: `py-20` provides only 80px clearance, insufficient if header (56px) + banner (40px) = 96px

**Layout order in `page.tsx`** (already correct, no changes needed):
```
<AppHeader variant="landing" />
<LaunchBanner />
<Hero ... />
```

---

## Target State (After Fix)

1. **Banner is `fixed`** below the header — always visible, never hidden behind header
2. **Banner doesn't affect document flow** — no content shift when it appears/disappears
3. **Hero mobile padding** increased to clear header + banner on small screens
4. **Desktop layout** unchanged — flex-centering provides sufficient clearance naturally
5. **Dismissing** the banner has zero layout impact (it was never in flow)

---

### Task 1: Update LaunchBanner positioning from relative to fixed

**Files:**
- Modify: `src/components/landing/launch-banner.tsx:37` (className on the motion.div)

**Step 1: Write a source-level test for the fixed positioning**

Create `src/components/landing/__tests__/launch-banner-positioning.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('LaunchBanner — positioning fix', () => {
  const bannerPath = path.resolve(__dirname, '..', 'launch-banner.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(bannerPath, 'utf-8');
  });

  test('uses fixed positioning (not relative)', () => {
    expect(source).not.toContain('className="relative z-40');
    expect(source).toContain('fixed');
  });

  test('is anchored below the header at top-14 md:top-[72px]', () => {
    expect(source).toContain('top-14');
    expect(source).toContain('md:top-[72px]');
  });

  test('spans full width with left-0 right-0', () => {
    expect(source).toContain('left-0');
    expect(source).toContain('right-0');
  });

  test('uses z-40 (below header z-50)', () => {
    expect(source).toContain('z-40');
  });

  test('has backdrop-blur for visual consistency with header', () => {
    expect(source).toContain('backdrop-blur');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/landing/__tests__/launch-banner-positioning.test.ts --verbose`
Expected: FAIL — "uses fixed positioning" fails because source contains `relative z-40`

**Step 3: Update the LaunchBanner className**

In `src/components/landing/launch-banner.tsx`, change line 37 from:

```tsx
          className="relative z-40 bg-gold/5 border-b border-gold/20"
```

to:

```tsx
          className="fixed top-14 md:top-[72px] left-0 right-0 z-40 bg-gold/5 border-b border-gold/20 backdrop-blur-sm"
```

The full `<motion.div>` block (lines 35-41) should now read:

```tsx
        <motion.div
          role="status"
          className="fixed top-14 md:top-[72px] left-0 right-0 z-40 bg-gold/5 border-b border-gold/20 backdrop-blur-sm"
          initial={a ? { opacity: 0, y: -10 } : undefined}
          animate={a ? { opacity: 1, y: 0 } : undefined}
          exit={a ? { opacity: 0, y: -10 } : undefined}
          transition={a ? { duration: 0.2, ease: 'easeOut' } : undefined}
        >
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/landing/__tests__/launch-banner-positioning.test.ts --verbose`
Expected: 5 tests PASS

**Step 5: Run existing banner tests to confirm no regression**

Run: `npx jest src/components/landing/__tests__/launch-banner.test.tsx --verbose`
Expected: 6 tests PASS (all existing tests should still pass — they test content/behavior, not positioning)

**Step 6: Commit**

```bash
git add src/components/landing/launch-banner.tsx src/components/landing/__tests__/launch-banner-positioning.test.ts
git commit -m "fix: change LaunchBanner from relative to fixed positioning below header"
```

---

### Task 2: Adjust Hero section mobile padding to clear fixed header + banner

**Files:**
- Modify: `src/components/landing/hero.tsx:69` (inner content div padding)

**Step 1: Write a source-level test for the padding change**

Create `src/components/landing/__tests__/hero-header-clearance.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('Hero — header/banner clearance', () => {
  const heroPath = path.resolve(__dirname, '..', 'hero.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(heroPath, 'utf-8');
  });

  test('mobile top padding is pt-28 (112px) to clear header (56px) + banner (40px)', () => {
    expect(source).toContain('pt-28');
  });

  test('mobile bottom padding is pb-20 (80px)', () => {
    expect(source).toContain('pb-20');
  });

  test('desktop overrides both paddings to 0', () => {
    expect(source).toContain('lg:pt-0');
    expect(source).toContain('lg:pb-0');
  });

  test('does NOT use the old py-20 shorthand', () => {
    // py-20 was the old value that didn't clear the header + banner
    expect(source).not.toMatch(/\bpy-20\b/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/landing/__tests__/hero-header-clearance.test.ts --verbose`
Expected: FAIL — "mobile top padding is pt-28" fails because source contains `py-20`

**Step 3: Update the hero's content div padding**

In `src/components/landing/hero.tsx`, change line 69 from:

```tsx
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 lg:py-0">
```

to:

```tsx
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-20 lg:pt-0 lg:pb-0">
```

**Why these values:**
- `pt-28` = 112px = header (56px) + banner (40px) + 16px breathing room
- `pb-20` = 80px = same bottom padding as before (unchanged)
- `lg:pt-0 lg:pb-0` = desktop uses flex-centering which already provides sufficient clearance (content centered in 90vh ≈ 155px from top, well past header+banner at 112px)

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/landing/__tests__/hero-header-clearance.test.ts --verbose`
Expected: 4 tests PASS

**Step 5: Run the existing hero badge test to confirm no regression**

Run: `npx jest src/components/landing/__tests__/hero-v1-badge.test.ts --verbose`
Expected: 4 tests PASS

**Step 6: Commit**

```bash
git add src/components/landing/hero.tsx src/components/landing/__tests__/hero-header-clearance.test.ts
git commit -m "fix: increase hero mobile top padding to clear fixed header + banner"
```

---

### Task 3: Run full test suite and verify build

**Files:** none (verification only)

**Step 1: Run the full test suite**

Run: `npx jest --verbose`
Expected: All tests PASS. Pay special attention to:
- `src/components/landing/__tests__/launch-banner.test.tsx` — 6 tests (existing, unchanged)
- `src/components/landing/__tests__/launch-banner-positioning.test.ts` — 5 tests (new)
- `src/components/landing/__tests__/hero-header-clearance.test.ts` — 4 tests (new)
- `src/components/landing/__tests__/hero-v1-badge.test.ts` — 4 tests (existing, unchanged)
- `src/app/__tests__/page-section-order.test.ts` — 3 tests (existing, unchanged — page.tsx unchanged)

**Step 2: Run the build to verify no compilation errors**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 3: Visual smoke test checklist**

Run: `npx next dev` — check in browser at `http://localhost:3000`:

- [ ] Banner appears below the fixed header (not behind it)
- [ ] Banner spans full width with subtle gold background + backdrop blur
- [ ] "AdDrop v1 is live" text and "See pricing" link are visible and clickable
- [ ] X dismiss button works — banner disappears with animation
- [ ] After dismiss, refreshing page keeps banner dismissed (localStorage)
- [ ] Clearing `localStorage.removeItem('addrop-v1-banner-dismissed')` in console and refreshing brings banner back
- [ ] Hero content (V1 badge, AdDrop title, tagline) does NOT overlap with banner on mobile (375px width)
- [ ] Hero content is properly centered on desktop (1440px width)
- [ ] Scrolling down: banner stays fixed below header, content scrolls behind it
- [ ] Mobile hamburger menu opens/closes without banner interference
- [ ] No layout shift when banner appears (initial load) or disappears (dismiss)
- [ ] All other landing page sections render correctly below the hero

**Step 4: Commit (only if fixes needed from smoke test)**

```bash
git add -A
git commit -m "fix: address banner positioning issues from smoke test"
```

---

## Summary of Changes

| Action | File | Change |
|---|---|---|
| Modify | `src/components/landing/launch-banner.tsx` | `relative z-40` → `fixed top-14 md:top-[72px] left-0 right-0 z-40` + `backdrop-blur-sm` |
| Modify | `src/components/landing/hero.tsx` | `py-20 lg:py-0` → `pt-28 pb-20 lg:pt-0 lg:pb-0` |
| Create | `src/components/landing/__tests__/launch-banner-positioning.test.ts` | 5 source-level tests for fixed positioning |
| Create | `src/components/landing/__tests__/hero-header-clearance.test.ts` | 4 source-level tests for padding clearance |

**Files NOT modified (already correct):**
- `src/app/page.tsx` — import and JSX order already correct
- `src/components/nav/app-header.tsx` — header positioning unchanged
- `src/app/__tests__/page-section-order.test.ts` — no changes needed

## Z-Index Hierarchy (After Fix)

```
9999  - noise-overlay (::after pseudo-element, pointer-events: none)
  50  - AppHeader (fixed top-0)
  40  - LaunchBanner (fixed top-14/top-[72px], below header)
  50  - MobileCTABar (fixed bottom-0, mobile only)
  50  - MobileDrawer panel (portaled)
  40  - MobileDrawer backdrop
  10  - Hero content (relative z-10)
```

## Responsive Behavior Summary

| Breakpoint | Header Height | Banner Top | Banner Height | Hero Top Padding | Content Clearance |
|---|---|---|---|---|---|
| Mobile (<768px) | 56px (h-14) | 56px (top-14) | 40px | 112px (pt-28) | 16px gap |
| Desktop (>=1024px) | 72px (md:h-[72px]) | 72px (md:top-[72px]) | 44px | 0 (lg:pt-0), flex-centered ~155px | ~43px gap |

---

> **Planner** `opus` · 2026-02-26T20:02:05.468Z
