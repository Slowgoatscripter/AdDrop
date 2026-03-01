# V1 Launch Celebration Elements — Design Document

> **Author:** Brainstormer `opus` · 2026-02-26
> **Task:** Add v1 launch celebration elements to landing page
> **Tier:** L2 · **Priority:** Low

---

## 1. Problem Statement

AdDrop is transitioning from beta to v1. Beta badges are being removed, pricing is live, and JSON-LD structured data is updated. The landing page needs celebratory elements that:

- Announce the v1 milestone to visitors
- Build confidence that AdDrop is a stable, production-ready product
- Enhance — never distract from — the existing core messaging
- Are trivially removable once the launch window closes

## 2. Current State

The landing page (`src/app/page.tsx`) renders these sections in order:

```
AppHeader (variant="landing") → Hero → PlatformBar → InteractiveDemo →
ShowcaseCarousel → FeaturesGrid → WhoItsFor → FAQ → CTAFooter → MobileCTABar
```

**Hero section** (`src/components/landing/hero.tsx`): Full-viewport section with background image, gradient overlay, animated gold glow, clip-path title reveal ("Ad" + "Drop"), tagline, description, CTA button, and a 4-item stats grid. Right column has an animated ad-card mockup. Rich Framer Motion timeline (0ms–1800ms).

**Design language:** Dark background (`hsl(220 25% 6%)`), gold accents (`hsl(42 95% 55%)`), cream text, Fraunces serif + Space Grotesk sans-serif, Framer Motion animations, pill-shaped CTA buttons with gold border.

**Existing patterns to leverage:**
- `BetaBadge` — tiny `<span>` with `bg-gold/10 text-gold` styling
- `quality-banner.tsx` — bordered card with icon + title + subtitle
- All animation uses Framer Motion with `useReducedMotion` respect

## 3. Design Constraints

| Constraint | Detail |
|---|---|
| **Removability** | Every celebration element lives in its own component file and is toggled by a single import + JSX line in `page.tsx` or `hero.tsx` |
| **Performance** | No new JS libraries. Framer Motion + Tailwind keyframes only. |
| **Accessibility** | Respects `prefers-reduced-motion`. Banner dismiss button has aria-label. `role="status"` on announcement. |
| **Mobile** | Banner must not overlap the fixed header or the mobile CTA bar. |
| **Taste** | No confetti, fireworks, or emoji. Gold shimmer is the ceiling for animation intensity. |

## 4. Approaches

### Approach A: Announcement Bar + Hero Badge ★ Recommended

Two lightweight, self-contained elements.

**Element 1 — Top Announcement Bar** (`launch-banner.tsx`)

A slim, full-width bar pinned above the `<main>` content (below the transparent floating header). Contains a one-line message with a gold accent and a dismiss button. Dismissal stores a flag in `localStorage` so it stays hidden on return visits.

```
┌─────────────────────────────────────────────────────┐
│  ✦  AdDrop v1 is live — stable, fast, and ready.    │
│                                     See pricing →  ✕ │
└─────────────────────────────────────────────────────┘
```

- Background: `bg-gold/5` with `border-b border-gold/20`
- Text: `text-cream/90` with `text-gold` for the accent and link
- Height: 40px desktop / 44px mobile (touch target)
- Animation: fade-in + slide-down on mount (200ms), reduced-motion safe
- Dismiss: `X` button stores `addrop-v1-banner-dismissed` in localStorage
- Easy to remove: delete import + JSX line from `page.tsx`

**Element 2 — Hero Badge** (inline in `hero.tsx`)

A small pill above the hero title, positioned at the start of the animation timeline (200ms delay). Uses the same visual language as the existing `BetaBadge` but with a subtle gold shimmer keyframe.

```
        [ ✦ V1 Now Live ]

        Ad Drop
        Your Listing. 12 Platforms. Minimal Effort.
```

- Pill: `border border-gold/30 bg-gold/8 text-gold text-xs uppercase tracking-widest px-3 py-1 rounded-full`
- Shimmer: new `shimmer-gold` Tailwind keyframe — a soft left-to-right highlight sweep on the background (4s loop)
- Animated entrance: `opacity: 0 → 1, y: 10 → 0` with 200ms delay (before title reveals)
- Easy to remove: delete the `<motion.div>` block from `hero.tsx`

**Trade-offs:**
| ✅ Pros | ⚠️ Cons |
|---|---|
| Two distinct touchpoints — header area + hero | Banner adds 40px of vertical space |
| Self-contained, no shared state beyond localStorage | Two files to remove (vs. one) |
| Follows existing BetaBadge + banner patterns | |
| Zero new dependencies | |

---

### Approach B: Hero-Only Celebration

All celebration elements are confined to the hero section. No banner.

**Element 1 — Hero Badge** (same as Approach A)

**Element 2 — Enhanced Hero Glow**

Upgrade the existing `bg-gold/8 rounded-full blur-[120px]` glow to pulse gently using the existing `pulse-gold` keyframe, creating a subtle "breathing" effect behind the hero content. This is a CSS-only change to the existing element (add `animate-pulse-gold` class).

**Element 3 — V1 Stat Replacement**

Replace one of the four stats (e.g., "3 / Tone Options") with "V1 / Now Live" using the same gold styling but with a subtle entrance delay difference.

**Trade-offs:**
| ✅ Pros | ⚠️ Cons |
|---|---|
| Zero new components — all changes inline | Less prominent; no above-fold announcement for return visitors who scroll past hero |
| Single file to revert (`hero.tsx`) | Replacing a stat removes useful product info |
| No layout shift at all | Enhanced glow may be too subtle to register as "celebration" |

---

### Approach C: Announcement Bar + Hero Badge + CTA Enhancement

Approach A, plus enhanced CTA treatment in the footer section.

**Elements 1 & 2** — Same as Approach A (banner + hero badge).

**Element 3 — CTA Footer Launch Copy**

Update the `CTAFooter` headline and description to reference the v1 launch:
- Headline: "V1 Is Live. Your Next Listing Deserves It."
- Description: "AdDrop is out of beta. Stable, fast, and free to start."
- Add a subtle animated gold border pulse around the CTA button

**Trade-offs:**
| ✅ Pros | ⚠️ Cons |
|---|---|
| Three touchpoints across the full scroll journey | CTA copy changes require reverting text, not just deleting a component |
| Bottom-of-page reinforcement for readers who scroll all the way | Harder to cleanly remove; touches content strings |
| Most comprehensive celebration | Risks feeling repetitive ("v1" mentioned 3 times) |

---

## 5. Recommendation: Approach A

**Approach A (Announcement Bar + Hero Badge)** is the right choice because:

1. **Prominent but tasteful.** The banner catches attention above the fold; the hero badge reinforces it within the core brand display. Two mentions of v1 — not three — avoids repetition.

2. **Trivially removable.** Both elements are self-contained. When the launch window closes:
   - Delete `src/components/landing/launch-banner.tsx`
   - Remove its import + JSX from `src/app/page.tsx`
   - Delete the `<motion.div>` badge block from `hero.tsx`
   - Remove the `shimmer-gold` keyframe from `tailwind.config.ts` (optional; harmless to leave)

3. **Zero new dependencies.** Uses only Framer Motion (already present) and Tailwind keyframes.

4. **Follows existing patterns.** The banner follows the `quality-banner` card pattern. The badge follows the `BetaBadge` pattern. No new design vocabulary.

5. **Mobile-safe.** The banner sits in document flow below the floating header. The `MobileCTABar` is fixed to the bottom and won't overlap.

## 6. Component Architecture

### New Files

| File | Type | Purpose |
|---|---|---|
| `src/components/landing/launch-banner.tsx` | Client component | Dismissible announcement bar |

### Modified Files

| File | Change |
|---|---|
| `src/app/page.tsx` | Import + render `<LaunchBanner />` before `<Hero>` |
| `src/components/landing/hero.tsx` | Add badge `<motion.div>` above the title block |
| `tailwind.config.ts` | Add `shimmer-gold` keyframe + animation |

### LaunchBanner Component

```
Props: none (self-contained)
State: dismissed (boolean, synced to localStorage)
Render: full-width bar with message + dismiss button
Animation: fade-in + slide-down on mount
a11y: role="status", dismiss button has aria-label="Dismiss announcement"
```

**localStorage key:** `addrop-v1-banner-dismissed`

**Markup structure:**
```
<motion.div role="status">
  <div className="max-w-7xl mx-auto flex items-center justify-between">
    <p>
      <span className="text-gold">✦</span>
      " AdDrop v1 is live — stable, fast, and ready. "
      <Link href="/pricing">See pricing →</Link>
    </p>
    <button aria-label="Dismiss announcement" onClick={dismiss}>
      <X />
    </button>
  </div>
</motion.div>
```

### Hero Badge

Inserted above the visual brand display `<div>` in `hero.tsx`, at animation timeline position 200ms (before the title clips in at 300ms).

```
<motion.div
  className="inline-flex items-center gap-1.5 border border-gold/30 bg-gold/8
             text-gold text-xs uppercase tracking-widest px-3 py-1 rounded-full
             mb-4 animate-shimmer-gold"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2, duration: 0.4, ease }}
>
  <span className="text-gold/70">✦</span>
  V1 Now Live
</motion.div>
```

### Shimmer Keyframe

Added to `tailwind.config.ts`:

```js
'shimmer-gold': {
  '0%':   { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
},
// animation:
'shimmer-gold': 'shimmer-gold 4s ease-in-out infinite',
```

The badge gets a `bg-[length:200%_100%]` with a subtle linear-gradient overlay to create the sweep effect.

## 7. Animation Timeline (Updated Hero)

| Time | Element | Animation |
|---|---|---|
| 0ms | Gold glow | Fade in (existing) |
| **200ms** | **V1 badge** | **Fade up (new)** |
| 300ms | Title "Ad" | Clip reveal right→left (existing) |
| 300ms | Title "Drop" | Clip reveal left→right (existing) |
| 800ms | Tagline | Fade up (existing) |
| 950ms | Description | Fade up (existing) |
| 1200ms | CTA button | Spring bounce (existing) |
| 1400ms+ | Stats grid | Staggered fade (existing) |
| 1500ms+ | Ad card | Spring drop (existing) |

The badge appears first, drawing the eye upward before the title reveals. This creates a natural reading flow: badge → title → tagline.

## 8. Removal Plan

When the launch celebration window closes, clean up in this order:

1. **Delete** `src/components/landing/launch-banner.tsx`
2. **Edit** `src/app/page.tsx` — remove `LaunchBanner` import and `<LaunchBanner />` JSX
3. **Edit** `src/components/landing/hero.tsx` — remove the `<motion.div>` badge block (clearly marked with a `{/* V1 Launch Badge — remove after launch */}` comment)
4. **Optionally** remove the `shimmer-gold` keyframe from `tailwind.config.ts` (it's harmless if left)

Each element is marked with a `/* V1 Launch — remove after launch period */` comment for easy grep:

```bash
grep -rn "V1 Launch" src/
```

## 9. Accessibility

- `LaunchBanner` uses `role="status"` so screen readers announce it
- Dismiss button has `aria-label="Dismiss announcement"`
- All animations gated behind `useReducedMotion` / `prefersReduced` — badge renders without motion, banner appears without slide
- Banner text meets WCAG AA contrast (gold on dark background ≥ 4.5:1)
- Dismiss state persisted in localStorage; no flash of dismissed banner on reload (render `null` on SSR, hydrate from localStorage)

## 10. Open Questions

None. The design is straightforward and follows established patterns.

---

> **Brainstormer** `opus` · 2026-02-26T04:05:42.654Z
