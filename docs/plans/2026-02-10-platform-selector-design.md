# Platform Selector — Design Document

**Date:** 2026-02-10
**Status:** Approved with Changes (review 2026-02-10)
**Review:** Architect + Advocate — 3 required changes incorporated below
**Scope:** Add a platform selection step between property form and ad generation

---

## Problem

Every campaign generation creates ads for all 12 platforms, regardless of what the user needs. This wastes API tokens/cost, increases generation time, and overwhelms users who only need 2-3 platforms.

## Solution

Add a "Choose Your Platforms" selection UI as a new section inside the existing PropertyForm. Users pick which platforms they want before generating. The prompt and pipeline dynamically adapt to only produce selected platforms.

---

## Architecture Overview

### Layers Affected

1. **Types** — New `PlatformId` type, `CampaignKit` fields become optional
2. **UI** — New `PlatformSelector` component in PropertyForm
3. **API** — `/api/generate` accepts `platforms` parameter
4. **AI/Prompt** — Dynamic JSON output template based on selection
5. **Post-Processing** — Compliance/quality filter to selected only (minor)
6. **Display** — CampaignTabs filters to generated platforms only
7. **Admin** — Default platform selection setting + test bench integration

### State Ownership (Review Fix #1)

MlsInputForm owns `selectedPlatforms` state via `useState`. It passes `selectedPlatforms` and `onPlatformsChange` as props to PropertyForm, which renders the PlatformSelector. On submit, MlsInputForm reads its own state and includes it in the API payload. PropertyForm's `onSubmit(listing: ListingData)` signature stays unchanged — keeping it a pure form component while MlsInputForm remains the orchestrator (consistent with existing pattern where MlsInputForm owns loading/error state and the API call).

### Data Flow

```
MlsInputForm (owns selectedPlatforms state)
  → PropertyForm (renders PlatformSelector, receives selectedPlatforms + onPlatformsChange as props)
  → PlatformSelector (user selects platforms)
  → MlsInputForm.handleGenerate({ listing, platforms: selectedPlatforms })
  → POST /api/generate { listing, platforms: PlatformId[] }
  → generateCampaign(listing, platforms)
    → buildGenerationPrompt(listing, docs, { platforms })
      → Dynamic JSON template with only selected platform fields
    → OpenAI GPT-5.2 (smaller output = faster + cheaper)
    → checkAllPlatforms(campaign) — skips missing platforms automatically
    → checkAllPlatformQuality(campaign) — skips missing platforms automatically
    → autoFixQuality(campaign) — only fixes what exists
  → Return CampaignKit { ...ads, selectedPlatforms }
  → sessionStorage
  → CampaignTabs reads selectedPlatforms, renders only relevant tabs
```

---

## Type System

### New Types

```typescript
export type PlatformId =
  | 'instagram' | 'facebook' | 'twitter'
  | 'googleAds' | 'metaAd'
  | 'magazineFullPage' | 'magazineHalfPage' | 'postcard'
  | 'zillow' | 'realtorCom' | 'homesComTrulia'
  | 'mlsDescription';

export type PlatformCategory = 'social' | 'paid' | 'print' | 'listings' | 'mls';

export const ALL_PLATFORMS: PlatformId[] = [
  'instagram', 'facebook', 'twitter',
  'googleAds', 'metaAd',
  'magazineFullPage', 'magazineHalfPage', 'postcard',
  'zillow', 'realtorCom', 'homesComTrulia',
  'mlsDescription',
];

export interface PlatformOption {
  id: PlatformId;
  label: string;
  icon: string;
  detail: string;
  category: PlatformCategory;
}

export interface PlatformPreset {
  id: string;
  label: string;
  platforms: PlatformId[];
}
```

### CampaignKit Changes

All 12 platform fields become optional (`?`). New field:
```typescript
selectedPlatforms: PlatformId[];
```

Strategy fields (hashtags, callsToAction, targetingNotes, sellingPoints) remain required — always generated.

---

## UX Design

### Placement

5th card section inside PropertyForm, between Photos and Submit button. Matches existing card styling (`bg-white rounded-lg border border-slate-200 p-6`).

### Layout

1. **Header:** "Choose Your Platforms" with selection count badge `(6/12)`
2. **Quick Presets:** Horizontal row of pill buttons
   - All Platforms (default)
   - Social Media Pack (IG + FB + Twitter)
   - Listing Sites (Zillow + Realtor + Homes + MLS)
   - Print Pack (Mag Full + Mag Half + Postcard)
   - Paid Ads (Google + Meta)
3. **Platform Grid:** Grouped by category, each platform is a toggleable card
   - 120×100px cards with icon, name, brief detail
   - Selected: colored border + checkmark. Unselected: muted/gray
   - Grid: `grid-cols-3 md:grid-cols-4 lg:grid-cols-6`
4. **Summary:** "6 of 12 platforms selected" + estimated generation time
5. **Submit button** updates: "Generate 6 Ads"

### Strategy Section

Always included, not selectable. Small note: "Strategy toolkit always included."

### Mobile

- Preset bar: horizontally scrollable
- Platform cards: 3 columns, min 44px tap targets
- Summary: sticky at card bottom

### Accessibility

- Platform cards: `role="checkbox"` + `aria-checked`
- Keyboard: Tab to grid, arrow keys, Space to toggle
- Focus rings via existing Tailwind utilities

---

## Backend Design

### Prompt Modification

`buildGenerationPrompt()` gains an optional `platforms` parameter. A new helper builds the JSON output template dynamically:

```typescript
const PLATFORM_TEMPLATES: Record<PlatformId, string> = {
  instagram: `"instagram": { "professional": "...", "casual": "...", "luxury": "..." }`,
  // ... etc
};

function buildOutputTemplate(platforms: PlatformId[]): string {
  return platforms.map(p => PLATFORM_TEMPLATES[p]).join(',\n');
}
```

Only selected platforms appear in the JSON schema sent to GPT.

**Note (Review Fix #6):** MLS template contains interpolated compliance values. Use factory functions `(config) => string` instead of static strings for templates that need runtime values.

### GPT Output Stripping (Review Fix #4)

After `JSON.parse` in `generate.ts`, only pick platform fields matching the `platforms` array (plus strategy fields). This prevents hallucinated extra platforms from being stored.

### Token Truncation Safety (Review Fix #7)

Apply 1.3x safety margin on token estimates. On JSON parse failure, retry with higher budget.

### max_completion_tokens Optimization

| Platforms Selected | max_completion_tokens |
|-------------------|----------------------|
| 10-12 | 16,000 |
| 6-9 | 12,000 |
| 3-5 | 8,000 |
| 1-2 | 4,000 |

### API Route

```typescript
// POST /api/generate
interface GenerateRequest {
  listing: ListingData;
  platforms?: PlatformId[];  // optional, defaults to ALL_PLATFORMS
}
```

Validation: reject unknown platform IDs, require at least 1.

### Compliance & Quality

Both engines already use `if (campaign.platform)` guards — they skip undefined platforms automatically. Zero changes required to core logic. Minor optimization: pass platforms filter to skip iteration.

---

## Cost Savings

| Selection | Output Tokens | Savings vs All 12 |
|-----------|--------------|-------------------|
| All 12 | ~10,650 | — |
| Social (3) | ~7,300 | 31% |
| Listing Sites (4) | ~1,500 | 86% |
| Print (3) | ~1,500 | 86% |
| Paid Ads (2) | ~350 | 97% |
| Just MLS | ~300 | 97% |

Input tokens stay roughly the same (shared compliance/quality context). Savings come from output tokens, which are more expensive per token.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types/campaign.ts` | Add PlatformId, PlatformCategory, ALL_PLATFORMS, PlatformOption, PlatformPreset. Make platform fields optional. Add selectedPlatforms. |
| `src/lib/ai/prompt.ts` | Accept platforms param, build dynamic JSON template |
| `src/lib/ai/generate.ts` | Accept platforms param, dynamic max_completion_tokens, pass to prompt builder |
| `src/app/api/generate/route.ts` | Accept platforms in request body, validate, pass through |
| **NEW** `src/components/campaign/platform-selector.tsx` | Platform selection UI with presets and grid |
| `src/components/mls-input-form.tsx` | Add selectedPlatforms state, render PlatformSelector, include in API payload |
| `src/components/campaign/property-form.tsx` | Accept and pass through selectedPlatforms + onChange |
| `src/components/campaign/campaign-tabs.tsx` | Filter tabs: hide entire category tabs when zero platforms selected in that category. Dynamic grid-cols-N. Default to first visible category. Within visible tabs, only render cards for selected platforms. Strategy tab always visible. (Review Fix #2) |
| `src/components/campaign/campaign-shell.tsx` | Add null guards to handleReplace for all platform field access — TypeScript will require these once fields are optional. (Review Fix #3) |
| `src/app/admin/test/page.tsx` | Add platform selection to test bench |
| `src/lib/ai/__tests__/prompt.test.ts` | Tests for selective prompt |
| `src/lib/ai/__tests__/generate.test.ts` | Tests for selective generation |

**Files unchanged:** compliance/engine.ts, quality/engine.ts, quality auto-fix — already handle optional platforms.

---

## Backward Compatibility

- `platforms` param optional everywhere — omitting = all platforms (current behavior)
- "All Platforms" preset sets `platforms` to `undefined`, NOT explicit 12-item array — prevents staleness when new platforms added (Review Fix #5)
- `selectedPlatforms` on CampaignKit is new additive field
- Existing sessionStorage campaigns without `selectedPlatforms` → CampaignTabs shows all tabs
- Existing tests pass without changes (they don't pass `platforms`)

## Edge Cases

- 0 platforms: Submit button disabled, minimum 1 required
- Add more after generation: Not in v1 — user regenerates. Future: "Generate More" button
- Admin defaults: Configurable via AI Settings (stretch goal)

---

## Implementation Order

1. Types (foundation)
2. Prompt builder (core behavior)
3. Generate function (wire prompt)
4. API route (wire frontend)
5. PlatformSelector component (new UI)
6. MlsInputForm integration (wire UI)
7. PropertyForm passthrough
8. CampaignTabs filtering (display)
9. Tests
10. Admin test bench (polish)
