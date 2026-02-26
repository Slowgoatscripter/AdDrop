# Audio Platform Category — Design Document

**Date:** 2026-02-26
**Status:** Draft
**Scope:** Add an 'Audio' category to the platform selection UI with a gated Radio Ads card

---

## Problem

The platform selector currently covers Social, Paid, Print, Listings, and MLS — all text/visual ad formats. There is no representation of audio advertising. Radio ad scripts are a natural extension for real estate marketing (15s, 30s, 60s spots), but the feature should be gated behind the Pro subscription tier to drive conversions.

The challenge is threefold:
1. Add the Audio category and Radio Ads card to the existing platform grid
2. Introduce tier-gating UI in the platform selector (no precedent exists in this component)
3. Handle the fact that Radio Ads generation does not yet exist in the backend pipeline

---

## Current Architecture

### Platform Selector (`platform-selector.tsx`)
- Flat array of `PlatformOption` objects, each with `id`, `label`, `icon`, `detail`, `category`
- Grouped by `PlatformCategory` using `CATEGORY_ORDER` for rendering
- Each card is a toggle button (`role="checkbox"`) — click to select/deselect
- No concept of locked, disabled, or tier-gated platforms

### Type System (`campaign.ts`)
- `PlatformId` — union of 12 string literal types
- `PlatformCategory` — `'social' | 'paid' | 'print' | 'listings' | 'mls'`
- `ALL_PLATFORMS` — constant array of all PlatformId values
- `CampaignKit` — optional fields for each platform's generated output

### Subscription Tiers (designed, not yet fully implemented)
- Free: 5 platforms (Instagram, Facebook, MLS, Google Ads, X)
- Pro ($9/mo): All 12+ platforms, exports, regeneration
- Enterprise ($29/mo): Team seats + everything in Pro
- `profiles.tier` column planned but not yet queried on client
- No `UpgradeModal` component exists yet; `demo-locked-cards.tsx` shows a lock-overlay pattern

### Campaign Tabs (`campaign-tabs.tsx`)
- Mirrors `CATEGORIES` array with same structure
- Uses `has(selected, platformId)` helper to show/hide platforms
- Audio category would need a corresponding tab (future, when generation exists)

---

## Approaches

### Approach A: UI-Only Stub Card (Recommended)

Add `'audio'` to `PlatformCategory` and render a Radio Ads card in the selector, but **do not** add `'radioAds'` to the `PlatformId` union or `ALL_PLATFORMS`. The card is a marketing placeholder that cannot be selected. It always shows a "Pro" badge and tooltip. Free users see a grayed-out state with an upgrade overlay; clicking opens an upgrade modal. Pro users see the card but it shows a "Coming Soon" state since generation isn't built yet.

**Pros:**
- Zero impact on the generation pipeline, prompt builder, or campaign tabs
- No type system pollution — `PlatformId` stays clean until generation is real
- Simplest implementation; ~150 lines of new code
- Preset buttons and "X/12 selected" counter remain unchanged
- No risk of users accidentally selecting a non-functional platform

**Cons:**
- Radio Ads card behaves differently from every other card (not toggleable)
- When generation is eventually built, a second pass adds it to the type system

### Approach B: Full Type Integration with Disabled State

Add `'radioAds'` to `PlatformId`, `'audio'` to `PlatformCategory`, and a `requiredTier` field to `PlatformOption`. The platform selector checks the user's tier and renders locked platforms as disabled with an upgrade overlay. The generation pipeline ignores unknown platform IDs it can't generate.

**Pros:**
- Future-proof: when generation is built, only the backend needs work
- Establishes a reusable tier-gating pattern for future gated platforms
- Radio Ads appears in presets, counter, and type system immediately

**Cons:**
- Adds `radioAds` to `ALL_PLATFORMS` before it can produce output — breaks the "all platforms" preset semantics
- Requires a `userTier` prop threaded through MlsInputForm → PropertyForm → PlatformSelector
- Generation pipeline needs guards to skip `radioAds` since no prompt template exists
- CampaignTabs needs an audio tab that renders nothing
- Higher risk of edge cases (what if user selects radioAds and submits?)

### Approach C: Separate Promotional Section

Don't touch the platform grid at all. Instead, add a separate "Coming Soon" promotional banner below the platform grid with the Radio Ads card. Styled distinctly from functional platforms to avoid confusion.

**Pros:**
- Absolute zero risk to existing functionality
- Visually distinct — users immediately understand it's not functional yet
- No type system changes at all

**Cons:**
- Doesn't match the acceptance criteria ("Audio category appears alongside existing categories")
- Feels disconnected from the platform organization
- Harder to transition into a real platform card later

### Recommendation: Approach A

Approach A best balances the acceptance criteria (Audio category alongside existing categories, Pro badge, tooltip, upgrade modal) with implementation safety (no backend changes, no type system pollution). It delivers the marketing and conversion value immediately while keeping the door open for full integration when radio ad generation is built.

---

## Detailed Design

### 1. New Category in Platform Selector

Add `'audio'` to `CATEGORY_ORDER` and `CATEGORY_LABELS`:

```typescript
const CATEGORY_LABELS: Record<PlatformCategory | 'audio', string> = {
  social: 'Social Media',
  paid: 'Paid Advertising',
  print: 'Print',
  listings: 'Online Listings',
  mls: 'MLS',
  audio: 'Audio',
};

const CATEGORY_ORDER: (PlatformCategory | 'audio')[] = [
  'social', 'paid', 'print', 'audio', 'listings', 'mls'
];
```

The `'audio'` category is added to the rendering order between Print and Online Listings — a natural position grouping "creative" formats together.

**Important:** `PlatformCategory` in `campaign.ts` is **not** modified. The `'audio'` string is only used locally in the selector component for rendering purposes. This keeps the type system clean.

### 2. Radio Ads Card

A dedicated, non-toggleable card rendered in the Audio category section. It uses different visual treatment from regular platform cards:

**Visual states:**

| User Tier | Card State | Interaction |
|-----------|-----------|-------------|
| Free | Grayed out, muted icon, "PRO" badge, upgrade overlay | Click → upgrade modal |
| Pro | Normal styling, "Coming Soon" badge | Click → tooltip "Coming soon" |
| Enterprise | Same as Pro | Same as Pro |

**Icon:** `Radio` from lucide-react (a radio/broadcast icon). Fallback: `Mic` if `Radio` doesn't fit the aesthetic.

**Tooltip (hover):** "Generate 15s, 30s & 60s radio scripts in 3 audio tones (Pro feature)"

**Pro badge:** Small amber/gold badge positioned top-right of the card, using the existing `Badge` component with a custom "pro" style variant.

### 3. Upgrade Modal

A new `UpgradeModal` component using the existing `Dialog` primitive. Shown when a free-tier user clicks the Radio Ads card.

**Content:**
- Title: "Upgrade to Pro"
- Description: "Unlock Radio Ads and 7 more platforms, PDF exports, campaign regeneration, and shareable links."
- Feature list (3-4 bullet points)
- CTA button: "View Plans" → links to `/pricing`
- Dismiss button: "Maybe Later"

**Location:** `src/components/campaign/upgrade-modal.tsx`

This component is reusable for future upgrade prompts (e.g., when free users hit the export or regeneration gates).

### 4. User Tier Detection

The platform selector needs to know the user's tier. Since the tier system is designed but not fully implemented:

**Interim approach:** Add a `userTier` prop (`'free' | 'pro' | 'enterprise'`) to `PlatformSelector`, defaulting to `'free'`. The parent `MlsInputForm` receives `userId` already; the `CreatePage` server component can query `profiles.tier` and pass it down.

**If `profiles.tier` column doesn't exist yet:** Default to `'free'` for all users. The upgrade modal CTA links to `/pricing` which can be a placeholder page until Stripe integration is complete.

**Prop threading:**
```
CreatePage (server) → queries profiles.tier
  → MlsInputForm (userTier prop)
    → PropertyForm (userTier prop passthrough)
      → PlatformSelector (userTier prop)
```

### 5. Accessibility

- Radio Ads card: `role="button"` with `aria-label="Radio Ads - Pro feature. Click to learn about upgrading."`
- Upgrade modal: standard Dialog accessibility (focus trap, Escape to close)
- Tooltip: uses existing `TooltipProvider` / `Tooltip` / `TooltipContent` from Radix
- Keyboard: Tab reaches the card, Enter/Space opens the modal for free users

### 6. Mobile

- Audio category renders in the same grid layout as other categories (3 columns on mobile)
- Radio Ads card is a single card in a grid row
- Tooltip converts to a tap-and-hold or is omitted on mobile (standard Radix behavior)
- Upgrade modal is full-width on mobile via existing Dialog responsive styles

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/campaign/platform-selector.tsx` | Add `'audio'` to `CATEGORY_ORDER` and `CATEGORY_LABELS`. Render Radio Ads card in audio section with Pro badge, tooltip, and conditional upgrade behavior. Import `Radio` icon from lucide-react. Accept `userTier` prop. |
| **NEW** `src/components/campaign/upgrade-modal.tsx` | Reusable upgrade prompt dialog with feature list and CTA to `/pricing`. |
| `src/components/campaign/property-form.tsx` | Accept and pass through `userTier` prop to PlatformSelector. |
| `src/components/mls-input-form.tsx` | Accept `userTier` prop and pass to PropertyForm. |
| `src/app/create/page.tsx` | Query `profiles.tier` for the current user and pass to MlsInputForm. Fallback to `'free'` if column doesn't exist. |

**Files NOT changed:**
- `src/lib/types/campaign.ts` — no type system changes
- `src/lib/ai/prompt.ts` — no generation changes
- `src/lib/ai/generate.ts` — no generation changes
- `src/components/campaign/campaign-tabs.tsx` — no audio tab yet
- `src/lib/export/platform-dimensions.ts` — no audio dimensions

---

## Edge Cases

| Case | Handling |
|------|----------|
| `profiles.tier` column missing | Default to `'free'`; card always shows upgrade overlay |
| `/pricing` page not built yet | Link to a placeholder or `#` with a toast "Coming soon" |
| User upgrades to Pro mid-session | Page refresh picks up new tier; no real-time reactivity needed |
| "All Platforms" preset | Does NOT include Radio Ads (it's not in `ALL_PLATFORMS`) |
| Platform counter "X/12 selected" | Unchanged — Radio Ads is not a selectable platform |
| Screen readers | Card announces as "Radio Ads, Pro feature" button, not checkbox |

---

## Future Work (Out of Scope)

1. **Radio ad generation backend** — prompt templates, output parsing, audio tone definitions
2. **`'radioAds'` added to PlatformId** — when generation is ready
3. **Audio tab in CampaignTabs** — when generated radio scripts need display
4. **Stripe checkout integration** — upgrade modal CTA will link to real checkout
5. **Real-time tier updates** — Supabase realtime subscription on `profiles.tier`

---

## Implementation Order

1. Create `upgrade-modal.tsx` (independent, reusable)
2. Modify `platform-selector.tsx` (add audio category, Radio Ads card, tier-conditional rendering)
3. Thread `userTier` prop through `property-form.tsx` and `mls-input-form.tsx`
4. Update `create/page.tsx` to query and pass user tier
5. Manual QA: verify free vs. Pro states, tooltip, modal, accessibility
