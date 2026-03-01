# Landing Page Section Reorder — Design Document

> **Brainstormer** `opus` · 2026-02-26T00:31:45.409Z

## Problem

The landing page section order needs to place the strongest conversion elements — Interactive Demo and Showcase Carousel — early in the scroll flow, directly after the hero and platform trust bar. Sections that explain features and audience ("Features Grid" and "Who It's For") belong below the core value demonstration, not above it. The residual HowItWorks and SocialProof sections (already removed on main) need to be removed from this worktree as well.

## Current State

### Worktree (this branch — older)
```
AppHeader → Hero → PlatformBar → InteractiveDemo → HowItWorks → ShowcaseCarousel → SocialProof → FeaturesGrid → WhoItsFor → FAQ → CTAFooter → MobileCTABar → Footer
```

### Main branch (latest)
```
AppHeader → Hero → PlatformBar → InteractiveDemo → ShowcaseCarousel → FeaturesGrid → WhoItsFor → FAQ → CTAFooter → MobileCTABar → Footer
```

### Desired order (from task spec)
```
Hero → Platform Bar → Interactive Demo → Showcase Carousel → Features Grid → Who It's For → CTA → Footer
```

## Key Finding

The main branch already achieved the desired order in commits `0c8f73f` and `6e1f99c`, which removed HowItWorks and SocialProof. The remaining sections on main are already in the correct sequence. FAQ and MobileCTABar are not listed in the desired order but are standard utility elements that belong where they currently sit (FAQ between WhoItsFor and CTA; MobileCTABar is a sticky mobile-only widget, not a page section).

## Approaches

### Approach A: Minimal Reorder in Worktree (Recommended)

Remove HowItWorks and SocialProof from `src/app/page.tsx` (imports + JSX). Optionally delete the component files if no other code references them. The resulting order matches the target exactly.

**Changes:**
- `src/app/page.tsx` — remove 2 imports, remove 2 JSX elements
- `src/components/landing/how-it-works.tsx` — delete file
- `src/components/landing/social-proof.tsx` — delete file

**Pros:**
- Smallest diff, lowest risk
- Mirrors exactly what main already did
- No visual disruption — all remaining sections already have compatible backgrounds and borders

**Cons:**
- Does not address the InteractiveDemo → ShowcaseCarousel adjacency (two content-heavy sections back-to-back with no visual break). This may or may not be an issue depending on taste.

**Risk:** Near zero. The main branch has been running this order already.

### Approach B: Reorder + Visual Separator Between Demo and Carousel

Same as Approach A, plus add a subtle visual divider between InteractiveDemo and ShowcaseCarousel. Previously HowItWorks sat between them, providing a visual pause. With both demo-style sections now adjacent, a light border or background shift could improve rhythm.

**Additional changes:**
- Add `border-t border-border/50` to the ShowcaseCarousel `<section>` (matching the pattern used by FeaturesGrid and WhoItsFor), or
- Add a subtle background variant to one of the two sections

**Pros:**
- Better visual rhythm — avoids two large, content-dense sections blending together
- Consistent with the `border-t border-border/50` pattern already used by FeaturesGrid and WhoItsFor

**Cons:**
- Slightly larger scope (one extra CSS class)
- May not be necessary — the sections serve different purposes (interactive demo vs. static showcase) so the content difference itself creates contrast

### Approach C: Rebase Worktree onto Main

Instead of re-doing the removal, rebase or merge main into this worktree branch. The HowItWorks/SocialProof removal and file deletions come automatically.

**Pros:**
- Gets all main-branch changes, not just this one
- No manual replication of work

**Cons:**
- May introduce merge conflicts with other worktree changes
- Heavier operation, harder to review for correctness
- Brings in unrelated changes (pricing removal, rebrand commits, PlatformBar bg fix)

## Recommendation: Approach A

Approach A is the right choice. The change is mechanical — remove two imports and two JSX lines, delete two unused files. This matches what main already validated. The InteractiveDemo → ShowcaseCarousel adjacency works because the two sections serve complementary but distinct roles (one is interactive, one is a static carousel), and their content provides sufficient visual contrast without needing an explicit separator.

If after seeing it live the transition between demo and carousel feels flat, Approach B's `border-t` addition is a one-line fix that can be applied later.

## Section Order After Implementation

```
1. AppHeader (landing variant)
2. Hero              — dark bg with property image, gradient overlay
3. PlatformBar       — gradient bg, border-y, marquee animation
4. InteractiveDemo   — default bg, py-24, interactive demo widget
5. ShowcaseCarousel   — default bg, py-24, auto-playing carousel
6. FeaturesGrid      — dot pattern bg, border-t, 2×3 feature cards
7. WhoItsFor         — default bg, border-t, 3-column persona cards
8. FAQ               — default bg, py-24, accordion with images
9. CTAFooter         — dark bg with property image, gold gradient
10. MobileCTABar     — sticky mobile-only CTA
11. Footer           — bg-background, border-t
```

## Visual Flow Analysis

| Transition | Visual Break | Notes |
|---|---|---|
| Hero → PlatformBar | Strong | Image bg → gradient bar with borders |
| PlatformBar → InteractiveDemo | Moderate | Bordered bar → open section |
| InteractiveDemo → ShowcaseCarousel | Soft | Same bg, content contrast provides separation |
| ShowcaseCarousel → FeaturesGrid | Strong | `border-t` + dot pattern bg |
| FeaturesGrid → WhoItsFor | Strong | `border-t` |
| WhoItsFor → FAQ | Soft | No border, same bg — content shift is enough |
| FAQ → CTAFooter | Strong | Default bg → dark image bg |
| CTAFooter → Footer | Moderate | Image bg → solid bg with `border-t` |

## Files Modified

| File | Action |
|---|---|
| `src/app/page.tsx` | Remove HowItWorks and SocialProof imports + JSX |
| `src/components/landing/how-it-works.tsx` | Delete |
| `src/components/landing/social-proof.tsx` | Delete |

## FAQ Section

FAQ is not listed in the desired order but exists on both branches and provides SEO value (structured data / FAQPage schema). It belongs between WhoItsFor and CTAFooter — this is standard landing page convention. The FAQ component is also wired to admin-configurable settings. **Do not remove it.**

## Out of Scope

- Changing section content or styling
- Adding new sections
- Modifying the MobileCTABar behavior
- Touching AppHeader or Footer internals

## Acceptance Criteria Verification

| Criterion | Status |
|---|---|
| Sections appear in correct order | Met after removing HowItWorks + SocialProof |
| Interactive Demo at 3rd position | Already there (no change needed) |
| Features Grid after core value demonstration | Met — follows Demo + Carousel |
| Who It's For after core value demonstration | Met — follows Features Grid |
| Visual flow feels natural and logical | Met — see transition table above |
