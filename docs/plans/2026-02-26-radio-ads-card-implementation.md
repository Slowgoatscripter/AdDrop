# RadioAdsCard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `RadioAdsCard` component that displays all 9 generated radio scripts (3 time slots × 3 audio tones) with a tabbed time-slot interface, tone selector buttons, copy-to-clipboard, compliance badge, editable text support, and a locked overlay for non-pro users.

**Architecture:** The component follows the existing card composition pattern: `CardLayoutWrapper(editPanel, previewPanel)` where `previewPanel` uses `AdCardWrapper` and `editPanel` uses `CardEditPanel`. Time-slot selection uses the shadcn `Tabs` component (inner tabs within the card). Tone selection uses the existing `ToneSwitcher` pill-button component. A `LockedPlatformOverlay` wrapper gates the feature for non-pro users.

**Tech Stack:** React 18, TypeScript, Next.js 14 (App Router), shadcn/ui `Tabs`, Tailwind CSS, Lucide icons, Jest + React Testing Library.

**Design doc:** `docs/plans/2026-02-26-radio-ads-card-design.md`

---

### Task 1: Add Radio Types to `campaign.ts`

**Files:**
- Modify: `src/lib/types/campaign.ts`

**Step 1: Add the RadioScript interface, RadioTimeSlot and RadioTone types, and extend PlatformId, PlatformCategory, ALL_PLATFORMS, and CampaignKit**

In `src/lib/types/campaign.ts`, add these types after the `PrintAd` interface (after line 30):

```typescript
// --- Radio Ad Types ---

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
```

Then update `PlatformId` (line 34-39) to add `'radioAds'`:

```typescript
export type PlatformId =
  | 'instagram' | 'facebook' | 'twitter'
  | 'googleAds' | 'metaAd'
  | 'magazineFullPage' | 'magazineHalfPage' | 'postcard'
  | 'zillow' | 'realtorCom' | 'homesComTrulia'
  | 'mlsDescription'
  | 'radioAds';
```

Update `PlatformCategory` (line 41) to add `'audio'`:

```typescript
export type PlatformCategory = 'social' | 'paid' | 'print' | 'listings' | 'mls' | 'audio';
```

Update `ALL_PLATFORMS` (lines 43-49) to include `'radioAds'`:

```typescript
export const ALL_PLATFORMS: PlatformId[] = [
  'instagram', 'facebook', 'twitter',
  'googleAds', 'metaAd',
  'magazineFullPage', 'magazineHalfPage', 'postcard',
  'zillow', 'realtorCom', 'homesComTrulia',
  'mlsDescription',
  'radioAds',
];
```

Add to `CampaignKit` (after line 83, before the `// Metadata` comment):

```typescript
  radioAds?: Record<RadioTimeSlot, Record<RadioTone, RadioScript>>;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors related to radio types.

**Step 3: Commit**

```bash
git add src/lib/types/campaign.ts
git commit -m "feat: add RadioScript, RadioTimeSlot, RadioTone types and radioAds to CampaignKit"
```

---

### Task 2: Add `radioAds` to `extractPlatformTexts` (compliance utils)

**Files:**
- Modify: `src/lib/compliance/utils.ts` (after line 75, before the hashtags block at line 78)

**Step 1: Add radio ads extraction block**

Insert after the `mlsDescription` line (line 75) and before the `// Hashtags` comment (line 77):

```typescript
  // Radio Ads (3 time slots × 3 tones)
  if (campaign.radioAds) {
    for (const [slot, tones] of Object.entries(campaign.radioAds)) {
      for (const [tone, script] of Object.entries(tones)) {
        if (script && typeof script.script === 'string') {
          texts.push([`radioAds.${slot}.${tone}`, script.script]);
        }
      }
    }
  }
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/lib/compliance/utils.ts
git commit -m "feat: add radioAds to extractPlatformTexts for compliance scanning"
```

---

### Task 3: Add `radioAds` handlers in `campaign-shell.tsx`

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx`

**Step 1: Add radioAds case to `handleEditText` (after line 311, before `setCampaign`)**

Insert after the Google Ads block (line 311) and before `setCampaign(updated);` (line 313):

```typescript
      // Radio Ads: platform = 'radioAds', field = '30s.conversational.script'
      if (platform === 'radioAds' && updated.radioAds) {
        const [slot, tone, fieldName] = field.split('.') as [string, string, string];
        const slotData = updated.radioAds[slot as import('@/lib/types').RadioTimeSlot];
        if (slotData) {
          const toneData = slotData[tone as import('@/lib/types').RadioTone];
          if (toneData && fieldName === 'script') {
            toneData.script = newValue;
          }
        }
      }
```

**Step 2: Add radioAds case to `handleReplace` (after line 235, inside the `replacers` object)**

Add this entry to the `replacers` object, after the `sellingPoints` line (line 235):

```typescript
        radioAds:       () => {
          if (updated.radioAds) {
            const slot = parts[1];
            const tone = parts[2];
            if (slot && tone && updated.radioAds[slot as import('@/lib/types').RadioTimeSlot]?.[tone as import('@/lib/types').RadioTone]) {
              updated.radioAds[slot as import('@/lib/types').RadioTimeSlot][tone as import('@/lib/types').RadioTone].script = r(
                updated.radioAds[slot as import('@/lib/types').RadioTimeSlot][tone as import('@/lib/types').RadioTone].script
              );
            }
          }
        },
```

**Step 3: Add radioAds case to `handleApplySuggestion`'s `applyTextSwap` function**

Insert after the postcard block (after line 508, before `return false;` at line 510):

```typescript
        // Radio Ads: radioAds.30s.conversational
        if (root === 'radioAds' && parts[1] && parts[2] && obj.radioAds) {
          const slot = parts[1] as import('@/lib/types').RadioTimeSlot;
          const tone = parts[2] as import('@/lib/types').RadioTone;
          if (obj.radioAds[slot]?.[tone] && typeof obj.radioAds[slot][tone].script === 'string') {
            obj.radioAds[slot][tone].script = obj.radioAds[slot][tone].script.replace(
              suggestion.currentText,
              suggestion.suggestedRewrite!,
            );
            return true;
          }
          return false;
        }
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors.

**Step 5: Commit**

```bash
git add src/components/campaign/campaign-shell.tsx
git commit -m "feat: add radioAds handlers to handleEditText, handleReplace, handleApplySuggestion"
```

---

### Task 4: Create the `RadioAdsCard` component

**Files:**
- Create: `src/components/campaign/radioAds-card.tsx`

**Step 1: Write the full component**

Create `src/components/campaign/radioAds-card.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { CardLayoutWrapper } from './card-layout-wrapper';
import { CardEditPanel } from './card-edit-panel';
import { EditableText } from './editable-text';
import {
  PlatformComplianceResult,
  RadioTimeSlot,
  RadioTone,
  RadioScript,
} from '@/lib/types';
import type { PlatformQualityResult, QualityIssue } from '@/lib/types/quality';
import type { ListingData } from '@/lib/types/listing';
import { Radio, Clock, Mic, Music, FileText, Lock } from 'lucide-react';
import { ReactNode } from 'react';

// --- LockedPlatformOverlay stub ---
// Pro-and-up only. Will be replaced by a shared component when tier system is built.
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

// --- RadioIcon ---
function RadioIcon() {
  return (
    <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
      <Radio className="h-3.5 w-3.5 text-white" />
    </div>
  );
}

// --- Time slot labels ---
const TIME_SLOT_LABELS: Record<RadioTimeSlot, string> = {
  '15s': '15 Second',
  '30s': '30 Second',
  '60s': '60 Second',
};

// --- Props ---
interface RadioAdsCardProps {
  content: Record<RadioTimeSlot, Record<RadioTone, RadioScript>>;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
  isLocked?: boolean;
}

// --- MetadataRow helper ---
function MetadataRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

// --- Main Component ---
export function RadioAdsCard({
  content,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  onEditText,
  listing,
  isLocked,
}: RadioAdsCardProps) {
  const timeSlots = Object.keys(content) as RadioTimeSlot[];
  const [selectedSlot, setSelectedSlot] = useState<RadioTimeSlot>(timeSlots[0] || '15s');

  const tonesForSlot = Object.keys(content[selectedSlot] || {}) as RadioTone[];
  const [selectedTone, setSelectedTone] = useState<RadioTone>(tonesForSlot[0] || 'conversational');

  // When slot changes, keep the same tone if it exists in the new slot; otherwise reset.
  const handleSlotChange = (slot: string) => {
    const newSlot = slot as RadioTimeSlot;
    setSelectedSlot(newSlot);
    const newTones = Object.keys(content[newSlot] || {}) as RadioTone[];
    if (!newTones.includes(selectedTone)) {
      setSelectedTone(newTones[0] || 'conversational');
    }
  };

  const currentScript: RadioScript | undefined = content[selectedSlot]?.[selectedTone];
  if (!currentScript) return null;

  const platformIcon = <RadioIcon />;
  const dimensionLabel = `${TIME_SLOT_LABELS[selectedSlot]} · Radio`;

  // --- Inner Tabs + Script Mockup (shared between preview and edit panels) ---
  const innerTabs = (
    <Tabs value={selectedSlot} onValueChange={handleSlotChange} className="w-full">
      <TabsList className="w-full">
        {timeSlots.map((slot) => (
          <TabsTrigger key={slot} value={slot} className="flex-1 text-xs">
            {TIME_SLOT_LABELS[slot]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const toneSwitcher = (
    <ToneSwitcher
      tones={tonesForSlot}
      selected={selectedTone}
      onSelect={(t) => setSelectedTone(t as RadioTone)}
      label="Tone"
    />
  );

  // --- Mockup Content (preview panel) ---
  const mockupContent = (
    <>
      {/* Inner time-slot tabs */}
      <div className="mb-4">{innerTabs}</div>

      {/* Script header bar */}
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: '#4c1d95' }}
      >
        <span className="text-white text-xs font-semibold tracking-wide">
          Radio Script — {TIME_SLOT_LABELS[selectedSlot]}
        </span>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: '#3b0764', color: '#c4b5fd' }}
        >
          {selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1)}
        </span>
      </div>

      {/* Script body */}
      <div className="bg-slate-50 border border-slate-200 border-t-0 rounded-b-lg px-4 py-4 mb-3">
        {/* Mobile: editable; Desktop: read-only */}
        <div className="lg:hidden">
          {onEditText ? (
            <EditableText
              value={currentScript.script}
              onChange={() => {}}
              onSave={(val) => onEditText('radioAds', `${selectedSlot}.${selectedTone}.script`, val)}
              className="text-sm text-slate-800 leading-relaxed"
            />
          ) : (
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {currentScript.script}
            </p>
          )}
        </div>
        <div className="hidden lg:block">
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {currentScript.script}
          </p>
        </div>
      </div>

      {/* Metadata bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3">
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{currentScript.wordCount}</span> words
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            ~{currentScript.estimatedDuration}
          </span>
        </div>
      </div>

      {/* Optional fields (voiceStyle, musicSuggestion, notes) */}
      {(currentScript.voiceStyle || currentScript.musicSuggestion || currentScript.notes) && (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-0.5">
          {currentScript.voiceStyle && (
            <MetadataRow
              icon={<Mic className="h-3.5 w-3.5" />}
              label="Voice Style"
              value={currentScript.voiceStyle}
            />
          )}
          {currentScript.musicSuggestion && (
            <MetadataRow
              icon={<Music className="h-3.5 w-3.5" />}
              label="Music"
              value={currentScript.musicSuggestion}
            />
          )}
          {currentScript.notes && (
            <MetadataRow
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Notes"
              value={currentScript.notes}
            />
          )}
        </div>
      )}
    </>
  );

  // --- Preview Panel ---
  const previewPanel = (
    <AdCardWrapper
      platform="Radio Ad Script"
      platformIcon={platformIcon}
      dimensionLabel={dimensionLabel}
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      copyText={currentScript.script}
      violations={complianceResult?.violations}
      onReplace={onReplace}
      onRevert={onRevert}
      platformId="radioAds"
      charCountText={currentScript.script}
      toneSwitcher={toneSwitcher}
    >
      {mockupContent}
    </AdCardWrapper>
  );

  // --- Edit Panel ---
  const editPanel = (
    <CardEditPanel
      platform="Radio Ad Script"
      platformIcon={platformIcon}
      content={currentScript.script}
      onEditText={onEditText ? (_platform, _field, val) => {
        onEditText('radioAds', `${selectedSlot}.${selectedTone}.script`, val);
      } : undefined}
      platformId="radioAds"
      fieldName={`${selectedSlot}.${selectedTone}.script`}
      complianceResult={complianceResult}
      qualityResult={qualityResult}
    >
      {innerTabs}
      <div className="mt-3">{toneSwitcher}</div>

      {/* Metadata summary in edit panel */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{currentScript.wordCount} words</span>
          <span>~{currentScript.estimatedDuration}</span>
        </div>
        {currentScript.voiceStyle && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Voice:</span> {currentScript.voiceStyle}
          </p>
        )}
        {currentScript.musicSuggestion && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Music:</span> {currentScript.musicSuggestion}
          </p>
        )}
        {currentScript.notes && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Notes:</span> {currentScript.notes}
          </p>
        )}
      </div>
    </CardEditPanel>
  );

  return (
    <LockedPlatformOverlay isLocked={isLocked}>
      <CardLayoutWrapper editPanel={editPanel} previewPanel={previewPanel} />
    </LockedPlatformOverlay>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/campaign/radioAds-card.tsx
git commit -m "feat: create RadioAdsCard component with tabs, tone switcher, and locked overlay"
```

---

### Task 5: Wire `RadioAdsCard` into `campaign-tabs.tsx`

**Files:**
- Modify: `src/components/campaign/campaign-tabs.tsx`

**Step 1: Add import (after line 18)**

```typescript
import { RadioAdsCard } from './radioAds-card';
```

**Step 2: Add `'audio'` category to `CATEGORIES` (after line 32, the `mls` entry)**

```typescript
  { value: 'audio', label: 'Radio', platforms: ['radioAds'] },
```

**Step 3: Add the Radio tab content (after the MLS TabsContent block, after line 261, before the Strategy TabsContent)**

```tsx
      {/* Radio */}
      {visibleCategories.some((c) => c.value === 'audio') && (
        <TabsContent value="audio" className="mt-4">
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
        </TabsContent>
      )}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/components/campaign/campaign-tabs.tsx
git commit -m "feat: wire RadioAdsCard into campaign tabs under 'Radio' category"
```

---

### Task 6: Add `radioAds` to platform selector

**Files:**
- Modify: `src/components/campaign/platform-selector.tsx`

**Step 1: Add the platform option entry to `PLATFORM_OPTIONS` (after line 42, the mlsDescription entry)**

```typescript
  { id: 'radioAds', label: 'Radio Ads', icon: 'radioAds', detail: '3 durations × 3 tones', category: 'audio' },
```

**Step 2: Add `'audio'` to `CATEGORY_LABELS` (after line 58)**

```typescript
  audio: 'Audio',
```

**Step 3: Add `'audio'` to `CATEGORY_ORDER` (after line 61)**

Update line 61 from:
```typescript
const CATEGORY_ORDER: PlatformCategory[] = ['social', 'paid', 'print', 'listings', 'mls'];
```
to:
```typescript
const CATEGORY_ORDER: PlatformCategory[] = ['social', 'paid', 'print', 'listings', 'mls', 'audio'];
```

**Step 4: Add radio icon case to `PlatformIcon` (after line 77, before the default case)**

```typescript
    case 'radioAds': return <Radio {...iconProps} />;
```

Also add `Radio` to the lucide-react import at the top of the file (line 12-25). Add `Radio` alongside the existing icons.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/components/campaign/platform-selector.tsx
git commit -m "feat: add radioAds to platform selector with audio category"
```

---

### Task 7: Add `radioAds` to `demo-locked-cards.tsx`

**Files:**
- Modify: `src/components/landing/demo-locked-cards.tsx`

**Step 1: Add radio entry to `PLATFORM_INFO` (after line 38, the mlsDescription entry)**

Add `Radio` to the lucide-react import on line 12.

Then add the entry:
```typescript
  radioAds: { label: 'Radio Ads', icon: Radio },
```

**Step 2: Commit**

```bash
git add src/components/landing/demo-locked-cards.tsx
git commit -m "feat: add radioAds to demo locked cards on landing page"
```

---

### Task 8: Write unit tests for `RadioAdsCard`

**Files:**
- Create: `src/components/campaign/__tests__/radioAds-card.test.tsx`

**Step 1: Write the test file**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioAdsCard } from '../radioAds-card';
import type { RadioTimeSlot, RadioTone, RadioScript } from '@/lib/types';

function makeScript(overrides: Partial<RadioScript> = {}): RadioScript {
  return {
    script: 'Looking for your dream home in Bozeman?',
    wordCount: 8,
    estimatedDuration: '4 seconds',
    ...overrides,
  };
}

function makeContent(overrides?: Partial<Record<RadioTimeSlot, Record<RadioTone, RadioScript>>>) {
  const defaults: Record<RadioTimeSlot, Record<RadioTone, RadioScript>> = {
    '15s': {
      conversational: makeScript({ script: '15s conversational script text' }),
      authoritative: makeScript({ script: '15s authoritative script text' }),
      friendly: makeScript({ script: '15s friendly script text' }),
    },
    '30s': {
      conversational: makeScript({
        script: '30s conversational script text',
        voiceStyle: 'Warm and inviting',
        musicSuggestion: 'Soft acoustic guitar',
        notes: 'Emphasize the mountain views',
      }),
      authoritative: makeScript({ script: '30s authoritative script text' }),
      friendly: makeScript({ script: '30s friendly script text' }),
    },
    '60s': {
      conversational: makeScript({
        script: '60s conversational script text',
        voiceStyle: 'Deep and resonant',
        musicSuggestion: 'Upbeat country music',
        notes: 'Include the call to action at the end',
      }),
      authoritative: makeScript({ script: '60s authoritative script text' }),
      friendly: makeScript({ script: '60s friendly script text' }),
    },
  };
  return { ...defaults, ...overrides };
}

const mockListing = {
  url: 'https://example.com',
  address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  propertyType: 'Single Family',
  features: ['Garage'],
  description: 'Nice home',
  photos: ['/photo1.jpg'],
  listingAgent: 'Jane Smith',
};

describe('RadioAdsCard', () => {
  test('renders the default (first) script', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByText(/15s conversational script text/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders all three time-slot tabs', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByRole('tab', { name: /15 Second/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('tab', { name: /30 Second/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('tab', { name: /60 Second/ }).length).toBeGreaterThanOrEqual(1);
  });

  test('renders tone selector buttons', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByRole('radio', { name: /Conversational/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('radio', { name: /Authoritative/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('radio', { name: /Friendly/i }).length).toBeGreaterThanOrEqual(1);
  });

  test('switches script content when tone is changed', async () => {
    const user = userEvent.setup();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);

    // Click the authoritative tone button (first occurrence)
    const authButtons = screen.getAllByRole('radio', { name: /Authoritative/i });
    await user.click(authButtons[0]);

    expect(screen.getAllByText(/15s authoritative script text/).length).toBeGreaterThanOrEqual(1);
  });

  test('switches script content when time slot tab is changed', async () => {
    const user = userEvent.setup();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);

    // Click the 30 Second tab (first occurrence)
    const tabs30 = screen.getAllByRole('tab', { name: /30 Second/ });
    await user.click(tabs30[0]);

    expect(screen.getAllByText(/30s conversational script text/).length).toBeGreaterThanOrEqual(1);
  });

  test('displays word count and estimated duration', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByText(/8/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4 seconds/).length).toBeGreaterThanOrEqual(1);
  });

  test('displays optional voiceStyle, musicSuggestion, notes when present', async () => {
    const user = userEvent.setup();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);

    // Switch to 30s slot which has optional fields
    const tabs30 = screen.getAllByRole('tab', { name: /30 Second/ });
    await user.click(tabs30[0]);

    expect(screen.getAllByText(/Warm and inviting/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Soft acoustic guitar/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Emphasize the mountain views/).length).toBeGreaterThanOrEqual(1);
  });

  test('does not render optional fields on 15s slot without them', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    // 15s scripts don't have voiceStyle, musicSuggestion, notes by default
    expect(screen.queryByText(/Voice Style/)).not.toBeInTheDocument();
  });

  test('renders EditableText when onEditText is provided', async () => {
    const user = userEvent.setup();
    const onEditText = jest.fn();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} onEditText={onEditText} />);

    // Find and click the script text to open editor
    const scriptTexts = screen.getAllByText(/15s conversational script text/);
    await user.click(scriptTexts[0]);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('calls onEditText with correct platform and field args', async () => {
    const user = userEvent.setup();
    const onEditText = jest.fn();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} onEditText={onEditText} />);

    const scriptTexts = screen.getAllByText(/15s conversational script text/);
    await user.click(scriptTexts[0]);
    const textbox = screen.getByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, 'Updated script');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onEditText).toHaveBeenCalledWith('radioAds', '15s.conversational.script', 'Updated script');
  });

  test('does not show edit pencil when onEditText is not provided', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.queryByTestId('edit-pencil')).not.toBeInTheDocument();
  });

  test('renders locked overlay when isLocked is true', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} isLocked={true} />);
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  test('does not render locked overlay when isLocked is false', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} isLocked={false} />);
    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run the tests**

Run: `npx jest src/components/campaign/__tests__/radioAds-card.test.tsx --verbose 2>&1`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/components/campaign/__tests__/radioAds-card.test.tsx
git commit -m "test: add RadioAdsCard unit tests"
```

---

### Task 9: Run full test suite & type check

**Files:** None (validation only)

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

**Step 2: Run all campaign card tests**

Run: `npx jest src/components/campaign/__tests__/ --verbose 2>&1 | tail -20`
Expected: All tests pass, no regressions in existing card tests.

**Step 3: Run compliance utils tests**

Run: `npx jest src/lib/compliance/__tests__/ --verbose 2>&1 | tail -10`
Expected: All pass.

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: fix any test/type issues from radioAds integration"
```

---

## Summary: File Inventory

| # | File | Action | Task |
|---|------|--------|------|
| 1 | `src/lib/types/campaign.ts` | Modify | Task 1 |
| 2 | `src/lib/compliance/utils.ts` | Modify | Task 2 |
| 3 | `src/components/campaign/campaign-shell.tsx` | Modify | Task 3 |
| 4 | `src/components/campaign/radioAds-card.tsx` | Create | Task 4 |
| 5 | `src/components/campaign/campaign-tabs.tsx` | Modify | Task 5 |
| 6 | `src/components/campaign/platform-selector.tsx` | Modify | Task 6 |
| 7 | `src/components/landing/demo-locked-cards.tsx` | Modify | Task 7 |
| 8 | `src/components/campaign/__tests__/radioAds-card.test.tsx` | Create | Task 8 |

## Dependency Order

```
Task 1 (types) ──► Task 2 (compliance utils)
                ──► Task 3 (campaign-shell handlers)
                ──► Task 4 (RadioAdsCard component) ──► Task 5 (campaign-tabs wiring)
                ──► Task 6 (platform selector)
                ──► Task 7 (demo locked cards)
Task 4 ──────────► Task 8 (tests)
All ─────────────► Task 9 (validation)
```

Tasks 2, 3, 4, 6, 7 can run in parallel after Task 1. Task 5 depends on Task 4. Task 8 depends on Task 4. Task 9 runs last.
