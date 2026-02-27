# RadioAdsCard Component Design

**Status:** Approved
**Date:** 2026-02-26
**Component:** `src/components/campaign/radioAds-card.tsx`

---

## 1. Problem

Users generate radio ad scripts across 3 time slots (15s, 30s, 60s) × 3 audio tones (conversational, authoritative, friendly) = 9 total scripts. There is currently no UI to view, edit, or copy these scripts. This is the primary blocker for the radio ads feature.

The radio card is unique in the codebase because it has **two selection dimensions** (time slot and tone). Existing cards either have one dimension (Instagram/Facebook use tone only, Google Ads uses variation index only) or zero (MLS, Zillow are single-text).

---

## 2. Codebase Context

### Existing Card Architecture

Every platform card follows this composition:

```
CardLayoutWrapper
├── editPanel: CardEditPanel (desktop left column)
└── previewPanel: AdCardWrapper (desktop right column / mobile-only)
```

- **Desktop**: Side-by-side — `CardEditPanel` on left (wide), `AdCardWrapper` on right (375px sticky).
- **Mobile**: `AdCardWrapper` mockup only, with inline `EditableText` for editing.

### Key Patterns Observed

| Pattern | Used By | Mechanism |
|---------|---------|-----------|
| Tone switcher (pill buttons) | Instagram, Facebook, Print, Postcard | `ToneSwitcher` component; content keyed as `Record<tone, string>` |
| Variation navigator (prev/next dots) | Google Ads | `useState(activeIndex)` over an array |
| Editable text (click-to-edit) | All cards | `EditableText` component with `onSave` callback |
| Copy-to-clipboard | All cards | `AdCardWrapper` receives `copyText` prop → `CopyButton` |
| Compliance badge | All cards | `AdCardWrapper` receives `complianceResult` → `ComplianceBadge` |
| Quality badge | All cards | `AdCardWrapper` receives `qualityResult` → `QualityBadge` |

### Integration Points

1. **Types**: `CampaignKit` in `src/lib/types/campaign.ts` — needs `radioAds` field.
2. **Platform IDs**: `PlatformId` union and `ALL_PLATFORMS` array — needs `'radioAds'`.
3. **Categories**: `CATEGORIES` in `campaign-tabs.tsx` — needs a new category or addition to an existing one.
4. **State handlers**: `campaign-shell.tsx` `handleEditText` and `handleReplace` — need `radioAds` cases.
5. **Compliance utils**: `extractPlatformTexts` — needs to include radio ads text.

### LockedPlatformOverlay

The acceptance criteria mentions wrapping with `LockedPlatformOverlay` for non-pro users. **This component does not exist yet.** The tier system is designed (see `2026-02-24-account-tiers-payments-design.md`) but not implemented. The landing page has `DemoLockedCards` with a blur + lock icon pattern, but no in-campaign overlay exists.

**Recommendation:** Define the `LockedPlatformOverlay` interface in this component's props (accepting an `isLocked` boolean or similar), but implement it as a simple pass-through until the tier system is built. This follows YAGNI while keeping the API ready.

**Decision:** Radio ads is a **Pro-and-up only** platform. Free users will see it locked.

---

## 3. Data Shape

### RadioScript Interface

```typescript
interface RadioScript {
  script: string;           // The ad script text
  wordCount: number;        // Word count
  estimatedDuration: string; // e.g. "14 seconds"
  // Optional fields — present on 30s and 60s scripts
  notes?: string;
  voiceStyle?: string;
  musicSuggestion?: string;
}
```

### RadioAds on CampaignKit

```typescript
// Nested: timeSlot → tone → script
type RadioTimeSlot = '15s' | '30s' | '60s';
type RadioTone = 'conversational' | 'authoritative' | 'friendly';

type RadioAdsData = Record<RadioTimeSlot, Record<RadioTone, RadioScript>>;
```

This gives us `campaign.radioAds['30s']['authoritative'].script` — clear, type-safe, consistent with how other platforms nest by tone (e.g., `campaign.instagram['professional']`).

---

## 4. Approaches

### Approach A: Inner Tabs + ToneSwitcher (Recommended)

Use the existing shadcn `Tabs` component for time-slot selection (inner tabs within the card) and the existing `ToneSwitcher` for audio tone selection.

**Layout:**

```
┌─────────────────────────────────────────────┐
│ 🎙 Radio Ad Script       15s  │ Compliance │
├─────────────────────────────────────────────┤
│  ┌─────────┐┌─────────┐┌──────────┐        │
│  │15 Second ││30 Second││60 Second │  (tabs)│
│  └─────────┘└─────────┘└──────────┘        │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  "Looking for your dream home in   │    │
│  │   Bozeman? This stunning 3-bed..." │    │
│  │                                     │    │
│  │  Word count: 38 · Est. ~14 sec     │    │
│  │                                     │    │
│  │  Voice: Warm, conversational        │ 30s/60s only
│  │  Music: Light acoustic background   │ 30s/60s only
│  │  Notes: Emphasize price point       │ 30s/60s only
│  └─────────────────────────────────────┘    │
│                                             │
│  Tone: [Conversational] [Authoritative] ... │
│  ─────────────────────────────────────────  │
│  [Copy Script]                              │
└─────────────────────────────────────────────┘
```

**Pros:**
- Time-slot tabs create clear visual hierarchy (primary dimension).
- `ToneSwitcher` is already proven for secondary dimension — same pill-button UX as Instagram/Facebook.
- Tabs are native to the codebase (shadcn `Tabs` used in `campaign-tabs.tsx`).
- Only one script visible at a time — clean, focused reading experience.
- Natural reading order: pick duration first, then tone.

**Cons:**
- Slightly more complex state (two selectors), but manageable.
- Comparing across time slots requires tab-switching.

### Approach B: Dual ToneSwitcher (Two Rows of Pills)

Use two `ToneSwitcher` components stacked: one labeled "Duration" for time slots, one labeled "Tone" for audio tones. No inner tabs at all.

**Layout:**

```
┌─────────────────────────────────────────────┐
│ 🎙 Radio Ad Script       · Compliance      │
├─────────────────────────────────────────────┤
│                                             │
│  Duration: [15 Sec] [30 Sec] [60 Sec]      │
│  Tone:     [Conversational] [Authoritative] │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Script content here...             │    │
│  │  Word count: 38 · Est. ~14 sec     │    │
│  └─────────────────────────────────────┘    │
│  ─────────────────────────────────────────  │
│  [Copy Script]                              │
└─────────────────────────────────────────────┘
```

**Pros:**
- Simpler — reuses one component (`ToneSwitcher`) for both dimensions.
- Flatter visual hierarchy; both dimensions feel equally weighted.
- Very fast to implement; no new primitives needed.

**Cons:**
- Two rows of pill buttons look cluttered, especially on mobile.
- Ambiguous which selector is "primary" — less intuitive for users.
- `ToneSwitcher` was designed for tone labels; overloading it with duration labels feels semantically wrong (label says "Tone" but values are "15 Sec").
- Harder to distinguish the two rows at a glance.

### Approach C: Accordion/Grid View (All 9 Scripts)

Show all scripts at once in a 3×3 grid (columns = tones, rows = time slots) or as collapsible sections grouped by time slot.

**Pros:**
- No selection state needed — all scripts visible at once.
- Easy to compare across tones and time slots.

**Cons:**
- **Breaks the card architecture.** Every other card shows one piece of content at a time within `AdCardWrapper`. A grid would not fit inside the wrapper.
- Overwhelming: 9 scripts of varying lengths on screen at once.
- Editing and copy-to-clipboard become ambiguous (which script?).
- Does not fit in the 375px preview column on desktop.
- Poor mobile experience — too much scrolling.

---

## 5. Recommendation: Approach A (Inner Tabs + ToneSwitcher)

Approach A is the clear winner because:

1. **Consistency**: It follows the existing pattern. Instagram uses `ToneSwitcher` for tones; adding `Tabs` for the additional dimension is a natural extension.
2. **Hierarchy**: Time slot is the primary differentiator (15s scripts are fundamentally different from 60s scripts), and tabs communicate "pick one mode" better than pills.
3. **Focus**: One script at a time means copy-to-clipboard is unambiguous, editing is clear, and the mockup area isn't overwhelmed.
4. **Mobile-friendly**: Inner tabs work well on small screens. Two rows of pills (Approach B) or a grid (Approach C) would be cramped.

---

## 6. Component Design

### Props Interface

```typescript
interface RadioAdsCardProps {
  content: Record<RadioTimeSlot, Record<RadioTone, RadioScript>>;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
  isLocked?: boolean; // For future LockedPlatformOverlay gating
}
```

### State Management

```typescript
const timeSlots: RadioTimeSlot[] = ['15s', '30s', '60s'];
const [selectedSlot, setSelectedSlot] = useState<RadioTimeSlot>('15s');

const tones = Object.keys(content[selectedSlot]) as RadioTone[];
const [selectedTone, setSelectedTone] = useState<RadioTone>(tones[0]);

const currentScript = content[selectedSlot][selectedTone];
```

When `selectedSlot` changes, if the currently-selected tone is not available in the new slot (unlikely since all 3 tones exist per slot, but defensively), reset to the first available tone.

### Component Composition

```
RadioAdsCard
├── CardLayoutWrapper
│   ├── editPanel: CardEditPanel
│   │   ├── Header: "Radio Ad Script" + RadioIcon + ComplianceBadge
│   │   ├── Inner Tabs: 15 Second | 30 Second | 60 Second
│   │   ├── ToneSwitcher: conversational | authoritative | friendly
│   │   └── EditableText: currentScript.script (full editing)
│   │
│   └── previewPanel: AdCardWrapper
│       ├── Header: "Radio Ad Script" + dimensionLabel + ComplianceBadge
│       ├── Mockup: Radio script viewer
│       │   ├── Script text (read-only on desktop, editable on mobile)
│       │   ├── Metadata bar: word count · estimated duration
│       │   └── Optional fields: voiceStyle, musicSuggestion, notes
│       ├── Inner Tabs: 15 Second | 30 Second | 60 Second
│       ├── ToneSwitcher: conversational | authoritative | friendly
│       └── Copy Script button
```

### Mockup Interior Design

The mockup should feel like a **radio script document** — no phone frame or browser frame. A clean, paper-like presentation:

```
┌──────────────────────────────────────┐
│  ≡  RADIO SCRIPT — 30 SECONDS       │  ← Header bar (dark, like MLS)
│     Conversational Tone              │
├──────────────────────────────────────┤
│                                      │
│  "Looking for your dream home in     │  ← Script text (system font,
│   Bozeman, Montana? This stunning    │     consistent with rest of app)
│   3-bedroom home on Oak Street       │
│   offers panoramic mountain views    │
│   and a gourmet kitchen. Listed at   │
│   four forty-nine nine. Call         │
│   Montana Realty today..."           │
│                                      │
├──────────────────────────────────────┤
│  📊 38 words · ~14 seconds          │  ← Metadata bar
├──────────────────────────────────────┤
│  🎤 Voice: Warm, conversational     │  ← Optional fields
│  🎵 Music: Light acoustic bg        │     (only if present)
│  📝 Notes: Emphasize price point    │
└──────────────────────────────────────┘
```

### Platform ID Convention

- `platformId`: `'radioAds'`
- `onEditText` field naming: `radioAds.{slot}.{tone}.script` (e.g., `radioAds.30s.conversational.script`)
- This follows the dot-notation pattern used by `magazineFullPage.professional.headline`, `postcard.casual.front.headline`, etc.

### Copy Text

Copy only the current script's text — no metadata, no formatting wrapper. Just `currentScript.script`.

---

## 7. Integration Changes Required

### 7a. Type System (`src/lib/types/campaign.ts`)

```typescript
// New types
export type RadioTimeSlot = '15s' | '30s' | '60s';
export type RadioTone = 'conversational' | 'authoritative' | 'friendly';

export interface RadioScript {
  script: string;
  wordCount: number;
  estimatedDuration: string;
  notes?: string;
  voiceStyle?: string;
  musicSuggestion?: string;
}

// Add to PlatformId union
export type PlatformId = ... | 'radioAds';

// Add to ALL_PLATFORMS array
export const ALL_PLATFORMS: PlatformId[] = [..., 'radioAds'];

// Add to PlatformCategory
export type PlatformCategory = 'social' | 'paid' | 'print' | 'listings' | 'mls' | 'audio';

// Add to CampaignKit
export interface CampaignKit {
  ...
  radioAds?: Record<RadioTimeSlot, Record<RadioTone, RadioScript>>;
}
```

### 7b. Campaign Tabs (`campaign-tabs.tsx`)

Add a new category:

```typescript
{ value: 'audio', label: 'Radio', platforms: ['radioAds'] },
```

And render the card:

```tsx
{has(selected, 'radioAds') && campaign.radioAds && (
  <RadioAdsCard
    content={campaign.radioAds}
    listing={listing}
    complianceResult={buildPlatformResult(agentResult, platformTexts, 'radioAds')}
    qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'radioAds')}
    onReplace={onReplace}
    onRevert={onRevert}
    onEditText={onEditText}
  />
)}
```

### 7c. Campaign Shell (`campaign-shell.tsx`)

Add `radioAds` case to `handleEditText`:

```typescript
// Radio ads: platform = 'radioAds', field = '30s.conversational.script'
if (platform === 'radioAds' && updated.radioAds) {
  const [slot, tone, fieldName] = field.split('.') as [RadioTimeSlot, RadioTone, string];
  if (updated.radioAds[slot]?.[tone]) {
    (updated.radioAds[slot][tone] as any)[fieldName] = newValue;
  }
}
```

Similar update needed in `handleReplace` for compliance auto-fix replacements.

### 7d. Compliance Utils

`extractPlatformTexts` needs to iterate over radioAds slots and tones to include all script texts for compliance scanning.

### 7e. Platform Selector

If radio ads is a selectable platform, add it to the platform selector options and `PLATFORM_INFO`.

---

## 8. LockedPlatformOverlay Strategy

Since the tier system is not yet implemented, the component will accept an `isLocked` prop but the locking overlay will be a minimal placeholder:

```tsx
function LockedPlatformOverlay({ children, isLocked }: { children: ReactNode; isLocked?: boolean }) {
  if (!isLocked) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-xl flex items-center justify-center z-10">
        <div className="text-center space-y-2">
          <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Upgrade to Pro</p>
        </div>
      </div>
    </div>
  );
}
```

This can be extracted to a shared component later when the tier system is built. For now, keep it inline or as a local helper in the radio ads card file.

---

## 9. Accessibility

- Inner tabs use shadcn `Tabs` which provides proper `role="tablist"`, `role="tab"`, `aria-selected`, and keyboard navigation.
- `ToneSwitcher` already uses `role="radiogroup"` and `role="radio"` with `aria-checked`.
- Copy button announces success via the "Copied!" label change.
- Script text area should have `aria-label="Radio script"` for screen readers.
- Metadata fields should be marked with `aria-label` or semantic HTML.

---

## 10. Testing Plan

- **Unit tests**: Verify correct script renders for each slot × tone combination, tone switching, tab switching, copy button, optional field rendering.
- **Snapshot**: Match existing test patterns in `__tests__/` folder.
- **Integration**: Verify the card renders within `CampaignTabs` when `campaign.radioAds` is present.
- **Edge cases**: Missing optional fields, single tone available, empty script text.

---

## 11. File Inventory

| File | Action | Description |
|------|--------|-------------|
| `src/components/campaign/radioAds-card.tsx` | Create | Main component |
| `src/lib/types/campaign.ts` | Modify | Add RadioScript, RadioTimeSlot, RadioTone types; add radioAds to CampaignKit, PlatformId |
| `src/components/campaign/campaign-tabs.tsx` | Modify | Add 'audio' category and RadioAdsCard render |
| `src/components/campaign/campaign-shell.tsx` | Modify | Add radioAds case to handleEditText, handleReplace |
| `src/lib/compliance/utils.ts` | Modify | Add radioAds to extractPlatformTexts |
| `src/components/campaign/__tests__/radioAds-card.test.tsx` | Create | Unit tests |
