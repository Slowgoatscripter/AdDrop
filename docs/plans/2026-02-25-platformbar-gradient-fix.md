# PlatformBar Gradient Overlay Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the visible rectangular gradient patches at marquee edges in the PlatformBar component by making the section background match the gradient overlay color.

**Architecture:** The PlatformBar section currently uses `bg-teal-muted/20` (a semi-transparent teal tint over the page background), but the left/right fade gradient overlays use `from-background` (the page's base background color `hsl(220 25% 6%)`). This mismatch causes the gradient areas to appear as opaque dark rectangles over the teal-tinted section. The fix is to remove the mismatched teal tint from the section so both the section and gradients share the same `background` color.

**Tech Stack:** Next.js, Tailwind CSS, React

---

## Root Cause Analysis

| Element | Current class | Resolved color |
|---|---|---|
| Section background | `bg-teal-muted/20` | `hsl(185 30% 20% / 0.2)` over page bg |
| Left gradient | `from-background` | `hsl(220 25% 6%)` (solid page bg) |
| Right gradient | `from-background` | `hsl(220 25% 6%)` (solid page bg) |

The gradient fades from the **pure page background** to transparent, but it sits on top of a **teal-tinted** section. Where the gradient is fully opaque (at the edges), it shows the pure dark page color — not the teal tint — creating a visible color discontinuity.

**Fix:** Change `bg-teal-muted/20` → `bg-background` on the section element. The `border-y border-teal/10` border still provides subtle visual separation from adjacent sections.

---

### Task 1: Fix the Section Background Color

**Files:**
- Modify: `src/components/landing/platform-bar.tsx:32`

**Step 1: Make the edit**

On line 32, change the section's className. Replace `bg-teal-muted/20` with `bg-background`:

```tsx
// BEFORE (line 32):
<section className="relative py-16 border-y border-border/50 overflow-hidden bg-teal-muted/20 border-y border-teal/10">

// AFTER (line 32):
<section className="relative py-16 border-y border-border/50 overflow-hidden bg-background border-y border-teal/10">
```

Only the `bg-teal-muted/20` → `bg-background` token changes. Everything else stays the same.

**Step 2: Verify the gradients already use `from-background` (no change needed)**

Confirm lines 40–41 still read:
```tsx
<div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
<div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
```

These are correct and require no changes.

**Step 3: Run the build to verify no compilation errors**

Run: `npm run build`
Expected: Build succeeds with no errors related to `platform-bar.tsx` or Tailwind classes.

**Step 4: Visual verification**

Run: `npm run dev`
Then open `http://localhost:3000` in a browser and scroll to the PlatformBar (marquee section with platform icons below the hero).

Verify:
- ✅ No visible rectangular patches at the left/right marquee edges
- ✅ Gradient fade blends seamlessly into the section background
- ✅ Section still has subtle `border-teal/10` top/bottom borders for visual separation
- ✅ Platform icons and text are still legible

**Step 5: Commit**

```bash
git add src/components/landing/platform-bar.tsx
git commit -m "fix: match PlatformBar section bg to gradient overlay color

Change bg-teal-muted/20 to bg-background so the from-background
fade gradients blend seamlessly instead of creating visible
rectangular patches at the marquee edges."
```

---

## Summary of Changes

| File | Line | Change |
|---|---|---|
| `src/components/landing/platform-bar.tsx` | 32 | `bg-teal-muted/20` → `bg-background` |

**Total: 1 file, 1 line changed.**
