# Radio Ads Subscription Marketing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add radio ads as a prominent benefit in Pro subscription upgrade flows and pricing pages to drive subscription conversion.

**Architecture:** Radio ads are already defined as a platform type (`radioAds`) with types, AI generation, and platform selector support. This plan adds marketing and gating: (1) feature-gate radio ads to Pro tier via `TIER_FEATURES`, (2) create a dedicated upgrade modal with sample script preview triggered when free users select radio ads, (3) update pricing table, landing page, and marketing copy to highlight the "9 professional radio scripts" value proposition.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Radix UI Dialog, Tailwind CSS, Lucide React icons, Jest + Testing Library

---

### Task 1: Add `radioAds` to `TIER_FEATURES` config

**Files:**
- Modify: `src/lib/stripe/config.ts:18-22`
- Test: `src/lib/stripe/__tests__/config-radio-ads.test.ts`

**Step 1: Write the failing test**

Create `src/lib/stripe/__tests__/config-radio-ads.test.ts`:

```typescript
import { TIER_FEATURES } from '@/lib/stripe/config'

describe('TIER_FEATURES — radioAds gating', () => {
  it('gates radioAds for free tier', () => {
    expect(TIER_FEATURES.free.radioAds).toBe(false)
  })

  it('unlocks radioAds for pro tier', () => {
    expect(TIER_FEATURES.pro.radioAds).toBe(true)
  })

  it('unlocks radioAds for enterprise tier', () => {
    expect(TIER_FEATURES.enterprise.radioAds).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/stripe/__tests__/config-radio-ads.test.ts --no-coverage`
Expected: FAIL — Property 'radioAds' does not exist

**Step 3: Write minimal implementation**

In `src/lib/stripe/config.ts`, update the `TIER_FEATURES` object — add `radioAds` to each tier:

```typescript
export const TIER_FEATURES = {
  free: { export: false, share: false, regenerate: false, teamSeats: false, radioAds: false },
  pro: { export: true, share: true, regenerate: true, teamSeats: false, radioAds: true },
  enterprise: { export: true, share: true, regenerate: true, teamSeats: true, radioAds: true },
} as const
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/stripe/__tests__/config-radio-ads.test.ts --no-coverage`
Expected: PASS — 3 tests pass

**Step 5: Commit**

```bash
git add src/lib/stripe/config.ts src/lib/stripe/__tests__/config-radio-ads.test.ts
git commit -m "feat: gate radioAds in TIER_FEATURES (free=locked, pro/enterprise=unlocked)"
```

---

### Task 2: Update `UpgradePrompt` to support `radioAds` feature

**Files:**
- Modify: `src/components/ui/upgrade-prompt.tsx`
- Test: `src/components/ui/__tests__/upgrade-prompt-radio-ads.test.ts`

**Step 1: Write the failing test**

Create `src/components/ui/__tests__/upgrade-prompt-radio-ads.test.ts`:

```typescript
import fs from 'fs'
import path from 'path'

describe('UpgradePrompt — radioAds support', () => {
  const filePath = path.resolve(__dirname, '..', 'upgrade-prompt.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf-8')
  })

  it('includes radioAds in the feature union type', () => {
    expect(source).toMatch(/radioAds/)
  })

  it('has a message for the radioAds feature', () => {
    expect(source).toContain('radio')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/ui/__tests__/upgrade-prompt-radio-ads.test.ts --no-coverage`
Expected: FAIL — radioAds not found in source

**Step 3: Write minimal implementation**

In `src/components/ui/upgrade-prompt.tsx`, update the type and messages:

```typescript
'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'

interface UpgradePromptProps {
  feature: 'export' | 'share' | 'regenerate' | 'radioAds'
}

const FEATURE_MESSAGES = {
  export: 'Export campaigns as PDF or ZIP',
  share: 'Share campaigns with clients',
  regenerate: 'Regenerate ad copy for any platform',
  radioAds: 'Generate 9 professional radio advertising scripts',
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      <span>{FEATURE_MESSAGES[feature]}</span>
      <Link
        href="/pricing"
        className="text-gold hover:underline font-medium"
      >
        Upgrade to Pro
      </Link>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/ui/__tests__/upgrade-prompt-radio-ads.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ui/upgrade-prompt.tsx src/components/ui/__tests__/upgrade-prompt-radio-ads.test.ts
git commit -m "feat: add radioAds to UpgradePrompt feature types"
```

---

### Task 3: Create sample radio script data for upgrade modal preview

**Files:**
- Create: `src/lib/demo/sample-radio-script.ts`
- Test: `src/lib/demo/__tests__/sample-radio-script.test.ts`

**Step 1: Write the failing test**

Create `src/lib/demo/__tests__/sample-radio-script.test.ts`:

```typescript
import { SAMPLE_RADIO_SCRIPT, RADIO_ADS_BENEFITS } from '@/lib/demo/sample-radio-script'

describe('SAMPLE_RADIO_SCRIPT', () => {
  it('has a non-empty script string', () => {
    expect(SAMPLE_RADIO_SCRIPT.script.length).toBeGreaterThan(50)
  })

  it('has a word count', () => {
    expect(SAMPLE_RADIO_SCRIPT.wordCount).toBeGreaterThan(0)
  })

  it('has an estimated duration of 30 seconds', () => {
    expect(SAMPLE_RADIO_SCRIPT.estimatedDuration).toBe(30)
  })

  it('includes voice style', () => {
    expect(SAMPLE_RADIO_SCRIPT.voiceStyle).toBeDefined()
  })

  it('includes music suggestion', () => {
    expect(SAMPLE_RADIO_SCRIPT.musicSuggestion).toBeDefined()
  })
})

describe('RADIO_ADS_BENEFITS', () => {
  it('is an array of strings', () => {
    expect(Array.isArray(RADIO_ADS_BENEFITS)).toBe(true)
    expect(RADIO_ADS_BENEFITS.length).toBeGreaterThan(0)
    RADIO_ADS_BENEFITS.forEach((b) => expect(typeof b).toBe('string'))
  })

  it('mentions 9 scripts', () => {
    const joined = RADIO_ADS_BENEFITS.join(' ')
    expect(joined).toMatch(/9/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/demo/__tests__/sample-radio-script.test.ts --no-coverage`
Expected: FAIL — Cannot find module

**Step 3: Write minimal implementation**

Create `src/lib/demo/sample-radio-script.ts`:

```typescript
import type { RadioScript } from '@/lib/types/campaign'

/**
 * Sample 30-second radio script shown to free-tier users
 * as a preview in the Radio Ads upgrade modal.
 */
export const SAMPLE_RADIO_SCRIPT: RadioScript = {
  script:
    `Looking for your dream home? This stunning 4-bedroom colonial at 123 Maple Drive ` +
    `features an open-concept kitchen, hardwood floors throughout, and a beautifully ` +
    `landscaped backyard — all in the heart of Riverside. Priced at four twenty-five. ` +
    `Schedule your private showing today — call Riverside Realty at 555-0123. ` +
    `Your perfect home is waiting.`,
  wordCount: 52,
  estimatedDuration: 30,
  voiceStyle: 'warm and inviting',
  musicSuggestion: 'light acoustic guitar, upbeat',
  notes: 'Emphasize the address and price clearly. Warm, conversational delivery.',
}

/**
 * Benefits shown in the Radio Ads upgrade modal.
 */
export const RADIO_ADS_BENEFITS: string[] = [
  '9 professional radio scripts per listing',
  '3 time slots: 15s, 30s, and 60s',
  '3 tones: conversational, authoritative, and friendly',
  'Voice style and music suggestions included',
  'Fair housing compliance checked',
]
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/demo/__tests__/sample-radio-script.test.ts --no-coverage`
Expected: PASS — 7 tests pass

**Step 5: Commit**

```bash
git add src/lib/demo/sample-radio-script.ts src/lib/demo/__tests__/sample-radio-script.test.ts
git commit -m "feat: add sample radio script and benefits data for upgrade modal"
```

---

### Task 4: Create `RadioAdsUpgradeModal` component

**Files:**
- Create: `src/components/campaign/radio-ads-upgrade-modal.tsx`
- Test: `src/components/campaign/__tests__/radio-ads-upgrade-modal.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/radio-ads-upgrade-modal.test.tsx`:

```typescript
import fs from 'fs'
import path from 'path'

describe('RadioAdsUpgradeModal — structure', () => {
  const filePath = path.resolve(__dirname, '..', 'radio-ads-upgrade-modal.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf-8')
  })

  it('uses Radix Dialog', () => {
    expect(source).toContain('Dialog')
    expect(source).toContain('DialogContent')
  })

  it('imports Radio icon from lucide-react', () => {
    expect(source).toContain('Radio')
    expect(source).toContain('lucide-react')
  })

  it('renders the sample radio script', () => {
    expect(source).toContain('SAMPLE_RADIO_SCRIPT')
  })

  it('renders radio ads benefits', () => {
    expect(source).toContain('RADIO_ADS_BENEFITS')
  })

  it('emphasizes 9 professional radio scripts value proposition', () => {
    expect(source).toMatch(/9 professional radio scripts/i)
  })

  it('includes an upgrade CTA linking to /pricing', () => {
    expect(source).toContain('/pricing')
    expect(source).toMatch(/upgrade/i)
  })

  it('has a sample script preview section', () => {
    expect(source).toContain('sample')
  })

  it('exports RadioAdsUpgradeModal', () => {
    expect(source).toContain('export function RadioAdsUpgradeModal')
  })

  it('accepts open and onClose props', () => {
    expect(source).toContain('open')
    expect(source).toContain('onClose')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/radio-ads-upgrade-modal.test.tsx --no-coverage`
Expected: FAIL — file not found

**Step 3: Write minimal implementation**

Create `src/components/campaign/radio-ads-upgrade-modal.tsx`:

```tsx
'use client'

import { Radio, Check, Sparkles } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SAMPLE_RADIO_SCRIPT, RADIO_ADS_BENEFITS } from '@/lib/demo/sample-radio-script'

interface RadioAdsUpgradeModalProps {
  open: boolean
  onClose: () => void
}

export function RadioAdsUpgradeModal({ open, onClose }: RadioAdsUpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-gold" />
            </div>
            <div>
              <DialogTitle className="text-cream font-serif text-xl">
                Professional Radio Ads
              </DialogTitle>
              <DialogDescription>
                Generate 9 professional radio scripts for every listing
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Sample script preview */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-cream">
              Sample 30-second radio script
            </span>
          </div>
          <div className="bg-surface border border-gold/10 rounded-lg p-4">
            <p className="text-sm text-cream/90 leading-relaxed italic">
              &ldquo;{SAMPLE_RADIO_SCRIPT.script}&rdquo;
            </p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <span>{SAMPLE_RADIO_SCRIPT.wordCount} words</span>
              <span>&middot;</span>
              <span>{SAMPLE_RADIO_SCRIPT.estimatedDuration}s duration</span>
              <span>&middot;</span>
              <span>Voice: {SAMPLE_RADIO_SCRIPT.voiceStyle}</span>
            </div>
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-cream mb-2">
            Upgrade to Pro for radio ads:
          </h4>
          <ul className="space-y-2">
            {RADIO_ADS_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-col">
          <Button
            asChild
            className="w-full bg-gold text-background hover:bg-gold-bright font-semibold"
          >
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onClose}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/radio-ads-upgrade-modal.test.tsx --no-coverage`
Expected: PASS — 9 tests pass

**Step 5: Commit**

```bash
git add src/components/campaign/radio-ads-upgrade-modal.tsx src/components/campaign/__tests__/radio-ads-upgrade-modal.test.tsx
git commit -m "feat: add RadioAdsUpgradeModal with sample script preview"
```

---

### Task 5: Wire upgrade modal into PlatformSelector for free-tier users

**Files:**
- Modify: `src/components/campaign/platform-selector.tsx`
- Test: `src/components/campaign/__tests__/platform-selector-radio-gate.test.ts`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/platform-selector-radio-gate.test.ts`:

```typescript
import fs from 'fs'
import path from 'path'

describe('PlatformSelector — radio ads gating for free tier', () => {
  const filePath = path.resolve(__dirname, '..', 'platform-selector.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf-8')
  })

  it('accepts a userTier prop', () => {
    expect(source).toContain('userTier')
  })

  it('imports RadioAdsUpgradeModal', () => {
    expect(source).toContain('RadioAdsUpgradeModal')
  })

  it('imports SubscriptionTier type', () => {
    expect(source).toContain('SubscriptionTier')
  })

  it('has state for showing radio upgrade modal', () => {
    expect(source).toMatch(/showRadioUpgrade|radioUpgradeOpen/)
  })

  it('checks for radioAds platform id in toggle logic', () => {
    expect(source).toContain("'radioAds'")
  })

  it('renders RadioAdsUpgradeModal component', () => {
    expect(source).toContain('<RadioAdsUpgradeModal')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/platform-selector-radio-gate.test.ts --no-coverage`
Expected: FAIL — userTier, RadioAdsUpgradeModal not found in source

**Step 3: Write minimal implementation**

Modify `src/components/campaign/platform-selector.tsx`:

1. Add imports at the top (after existing imports):

```typescript
import { useState } from 'react';  // add useState to the existing React import
import type { SubscriptionTier } from '@/lib/stripe/config';
import { RadioAdsUpgradeModal } from './radio-ads-upgrade-modal';
```

Update the import line — change:
```typescript
import React, { useCallback, useMemo } from 'react';
```
to:
```typescript
import React, { useCallback, useMemo, useState } from 'react';
```

2. Update the interface:

```typescript
interface PlatformSelectorProps {
  selected: PlatformId[];
  onChange: (platforms: PlatformId[]) => void;
  userTier?: SubscriptionTier;
}
```

3. Update the component signature:

```typescript
export function PlatformSelector({ selected, onChange, userTier = 'pro' }: PlatformSelectorProps) {
```

4. Add state inside the component (after `selectedSet`):

```typescript
const [showRadioUpgrade, setShowRadioUpgrade] = useState(false);
```

5. Update the `toggle` callback to intercept radioAds clicks for free users:

```typescript
const toggle = useCallback(
  (id: PlatformId) => {
    if (id === 'radioAds' && userTier === 'free') {
      setShowRadioUpgrade(true);
      return;
    }
    if (selectedSet.has(id)) {
      onChange(selected.filter((p) => p !== id));
    } else {
      onChange([...selected, id]);
    }
  },
  [selected, selectedSet, onChange, userTier]
);
```

6. Add the modal render at the bottom of the return, just before the closing `</div>`:

```tsx
      {/* Radio Ads upgrade modal for free users */}
      <RadioAdsUpgradeModal
        open={showRadioUpgrade}
        onClose={() => setShowRadioUpgrade(false)}
      />
    </div>
  );
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/platform-selector-radio-gate.test.ts --no-coverage`
Expected: PASS — 6 tests pass

**Step 5: Commit**

```bash
git add src/components/campaign/platform-selector.tsx src/components/campaign/__tests__/platform-selector-radio-gate.test.ts
git commit -m "feat: show RadioAdsUpgradeModal when free users click radio ads"
```

---

### Task 6: Pass `userTier` prop down through create flow

**Files:**
- Modify: `src/app/create/page.tsx`
- Modify: `src/components/mls-input-form.tsx`
- Modify: `src/components/campaign/property-form.tsx`
- Test: `src/components/campaign/__tests__/create-flow-tier-prop.test.ts`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/create-flow-tier-prop.test.ts`:

```typescript
import fs from 'fs'
import path from 'path'

describe('Create flow passes userTier to PlatformSelector', () => {
  it('create page passes userTier to MlsInputForm', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'app', 'create', 'page.tsx'),
      'utf-8'
    )
    expect(source).toContain('userTier')
    expect(source).toContain('usage.tier')
  })

  it('MlsInputForm accepts and passes userTier to PropertyForm', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'mls-input-form.tsx'),
      'utf-8'
    )
    expect(source).toContain('userTier')
  })

  it('PropertyForm accepts and passes userTier to PlatformSelector', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'property-form.tsx'),
      'utf-8'
    )
    expect(source).toContain('userTier')
    expect(source).toContain('PlatformSelector')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/create-flow-tier-prop.test.ts --no-coverage`
Expected: FAIL — userTier not found

**Step 3: Write minimal implementation**

**3a. `src/app/create/page.tsx`** — Pass `usage.tier` (already available from `getCampaignUsage`) to MlsInputForm:

Change:
```tsx
<MlsInputForm userId={user.id} />
```
to:
```tsx
<MlsInputForm userId={user.id} userTier={usage.tier} />
```

Also add the import at line 1 area — no new import needed since `usage.tier` is a string.

**3b. `src/components/mls-input-form.tsx`** — Accept and forward `userTier`:

Update interface:
```typescript
import type { SubscriptionTier } from '@/lib/stripe/config';

interface MlsInputFormProps {
  userId?: string;
  userTier?: SubscriptionTier;
}
```

Update component signature:
```typescript
export function MlsInputForm({ userId, userTier }: MlsInputFormProps) {
```

Update PropertyForm usage:
```tsx
<PropertyForm
  onSubmit={handleGenerate}
  loading={generateLoading}
  selectedPlatforms={selectedPlatforms}
  onPlatformsChange={setSelectedPlatforms}
  userId={userId}
  userTier={userTier}
/>
```

**3c. `src/components/campaign/property-form.tsx`** — Accept and forward `userTier`:

Add import:
```typescript
import type { SubscriptionTier } from '@/lib/stripe/config';
```

Update interface:
```typescript
interface PropertyFormProps {
  initialData?: Partial<ListingData>;
  onSubmit: (data: ListingData) => void;
  loading?: boolean;
  selectedPlatforms?: PlatformId[];
  onPlatformsChange?: (platforms: PlatformId[]) => void;
  userId?: string;
  userTier?: SubscriptionTier;
}
```

Update component signature:
```typescript
export function PropertyForm({ initialData, onSubmit, loading, selectedPlatforms, onPlatformsChange, userId, userTier }: PropertyFormProps) {
```

Update PlatformSelector usage (around line 458):
```tsx
<PlatformSelector
  selected={selectedPlatforms}
  onChange={onPlatformsChange}
  userTier={userTier}
/>
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/create-flow-tier-prop.test.ts --no-coverage`
Expected: PASS — 3 tests pass

**Step 5: Commit**

```bash
git add src/app/create/page.tsx src/components/mls-input-form.tsx src/components/campaign/property-form.tsx src/components/campaign/__tests__/create-flow-tier-prop.test.ts
git commit -m "feat: pass userTier from create page through to PlatformSelector"
```

---

### Task 7: Add radio ads to Pro plan features in pricing table

**Files:**
- Modify: `src/components/pricing/pricing-table.tsx:110-117`
- Test: `src/components/pricing/__tests__/pricing-table-radio-ads.test.ts`

**Step 1: Write the failing test**

Create `src/components/pricing/__tests__/pricing-table-radio-ads.test.ts`:

```typescript
import fs from 'fs'
import path from 'path'

describe('PricingTable — radio ads in Pro features', () => {
  const filePath = path.resolve(__dirname, '..', 'pricing-table.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf-8')
  })

  it('lists radio ads as a Pro plan feature', () => {
    expect(source).toMatch(/radio/i)
  })

  it('mentions 9 professional radio scripts', () => {
    expect(source).toMatch(/9 professional radio scripts/i)
  })

  it('includes radio ads in the features array for Pro tier', () => {
    // Verify it appears between the Pro features block markers
    const proSection = source.slice(
      source.indexOf("name: 'Pro'"),
      source.indexOf("name: 'Enterprise'")
    )
    expect(proSection).toMatch(/radio/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/pricing/__tests__/pricing-table-radio-ads.test.ts --no-coverage`
Expected: FAIL — no match for "radio"

**Step 3: Write minimal implementation**

In `src/components/pricing/pricing-table.tsx`, update the Pro plan's `features` array (around line 110-117):

Change:
```typescript
features: [
  'Everything in Free',
  'All 12+ platform formats',
  'PDF, CSV, JSON, & ZIP export',
  'Shareable campaign links',
  'Regenerate individual platforms',
  'Priority generation queue',
],
```

to:

```typescript
features: [
  'Everything in Free',
  'All 12+ platform formats',
  '9 professional radio scripts per listing',
  'PDF, CSV, JSON, & ZIP export',
  'Shareable campaign links',
  'Regenerate individual platforms',
  'Priority generation queue',
],
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/pricing/__tests__/pricing-table-radio-ads.test.ts --no-coverage`
Expected: PASS — 3 tests pass

**Step 5: Commit**

```bash
git add src/components/pricing/pricing-table.tsx src/components/pricing/__tests__/pricing-table-radio-ads.test.ts
git commit -m "feat: add radio scripts to Pro plan features in pricing table"
```

---

### Task 8: Add radio ads feature to landing page features grid

**Files:**
- Modify: `src/components/landing/features-grid.tsx:12-56`
- Test: `src/components/landing/__tests__/features-grid-radio-ads.test.ts`

**Step 1: Write the failing test**

Create `src/components/landing/__tests__/features-grid-radio-ads.test.ts`:

```typescript
import fs from 'fs'
import path from 'path'

describe('FeaturesGrid — radio ads feature card', () => {
  const filePath = path.resolve(__dirname, '..', 'features-grid.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf-8')
  })

  it('imports Radio icon from lucide-react', () => {
    expect(source).toContain('Radio')
    expect(source).toContain('lucide-react')
  })

  it('includes a Radio Ads feature', () => {
    expect(source).toMatch(/Radio Ads|Radio Scripts/i)
  })

  it('mentions professional radio scripts in the description', () => {
    expect(source).toMatch(/radio scripts|radio advertising/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/landing/__tests__/features-grid-radio-ads.test.ts --no-coverage`
Expected: FAIL — Radio not found

**Step 3: Write minimal implementation**

In `src/components/landing/features-grid.tsx`:

1. Add `Radio` to the lucide-react import:

Change:
```typescript
import {
  Download,
  LayoutGrid,
  Monitor,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
```

to:

```typescript
import {
  Download,
  LayoutGrid,
  Monitor,
  Palette,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
```

2. Add a radio ads feature to the `features` array. Insert it after the `Palette` (Multiple Tones) entry and before `Monitor` (Platform Mockups):

```typescript
  {
    icon: Radio,
    title: 'Radio Ad Scripts',
    description:
      '9 professional radio scripts per listing — 15s, 30s, and 60s spots in 3 tones, with voice and music direction.',
    spotlight: false,
  },
```

3. Since we now have 7 features (2 spotlight + 5 standard), we need to update the destructuring. Change:

```typescript
const [standard1, standard2, standard3, standard4] = standardFeatures;
```

to:

```typescript
const [standard1, standard2, standard3, standard4, standard5] = standardFeatures;
```

4. Add the icon variable:

```typescript
const Standard5Icon = standard5.icon;
```

5. Add a new grid card for the 5th standard feature after the "Wide Card 4" div (before the closing `</div>` of the grid). Replace the existing `md:col-span-2` on Card 4 with `md:col-span-1`, and make the new Card 5 also `md:col-span-1`:

Actually, to keep the existing grid balanced, the simplest approach is to change Standard 4 from `md:col-span-2` to `md:col-span-1` and add Standard 5 as `md:col-span-1`, so the bottom row has two equal cards.

Replace the Wide Card 4 section and add Card 5 after it:

```tsx
          {/* Card 4 */}
          <div className="md:col-span-1 md:row-span-1 bg-surface rounded-2xl p-6 border-l-2 border-l-gold/20 hover:bg-surface-hover transition-all duration-300 hover:border-teal/20 hover:shadow-lg hover:shadow-teal/5">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <Standard4Icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">
              {standard4.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {standard4.description}
            </p>
          </div>

          {/* Card 5 — Radio Ads */}
          <div className="md:col-span-1 md:row-span-1 bg-surface rounded-2xl p-6 border-l-2 border-l-gold/20 hover:bg-surface-hover transition-all duration-300 hover:border-teal/20 hover:shadow-lg hover:shadow-teal/5">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <Standard5Icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">
              {standard5.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {standard5.description}
            </p>
          </div>
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/landing/__tests__/features-grid-radio-ads.test.ts --no-coverage`
Expected: PASS — 3 tests pass

**Step 5: Commit**

```bash
git add src/components/landing/features-grid.tsx src/components/landing/__tests__/features-grid-radio-ads.test.ts
git commit -m "feat: add Radio Ad Scripts card to landing page features grid"
```

---

### Task 9: Add radio ads FAQ to pricing page

**Files:**
- Modify: `src/app/pricing/page.tsx:22-47`
- Test: `src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts`

**Step 1: Write the failing test**

Create `src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts`:

```typescript
import fs from 'fs'
import path from 'path'

describe('Pricing page — radio ads FAQ and marketing', () => {
  const filePath = path.resolve(__dirname, '..', 'page.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf-8')
  })

  it('has a FAQ about radio ads', () => {
    expect(source).toMatch(/radio/i)
  })

  it('mentions 9 professional radio scripts in FAQ answer', () => {
    expect(source).toMatch(/9 professional radio scripts/i)
  })

  it('mentions the time slot durations', () => {
    expect(source).toMatch(/15s|30s|60s|15-second|30-second|60-second/)
  })

  it('includes radio ads in the structured data description', () => {
    // Pro offer description should mention radio
    expect(source).toMatch(/radio/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts --no-coverage`
Expected: FAIL — no match for "radio"

**Step 3: Write minimal implementation**

In `src/app/pricing/page.tsx`:

1. Add a radio ads FAQ entry to the `pricingFaqs` array. Insert it after the compliance FAQ (last entry):

```typescript
  {
    question: 'What are radio ad scripts?',
    answer:
      'Pro plans include 9 professional radio scripts per listing — 15-second, 30-second, and 60-second spots in conversational, authoritative, and friendly tones. Each script includes voice style direction and music suggestions.',
  },
```

2. Update the Pro offer description in the structured data (around line 103):

Change:
```typescript
description:
  'All 12+ platforms, 15 campaigns per month, premium exports',
```

to:

```typescript
description:
  'All 12+ platforms, 15 campaigns per month, 9 professional radio scripts, premium exports',
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts --no-coverage`
Expected: PASS — 4 tests pass

**Step 5: Commit**

```bash
git add src/app/pricing/page.tsx src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts
git commit -m "feat: add radio ads FAQ and update structured data on pricing page"
```

---

### Task 10: Update pricing page metadata and subtitle to mention radio ads

**Files:**
- Modify: `src/app/pricing/page.tsx:10-14` and `134-137`

**Step 1: Write the failing test**

Extend the test file from Task 9. Add to `src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts`:

```typescript
  it('mentions radio ads in the page subtitle', () => {
    expect(source).toMatch(/radio/i)
    // Check the subtitle / description area
    const subtitleArea = source.slice(
      source.indexOf('text-muted-foreground text-lg'),
      source.indexOf('</p>', source.indexOf('text-muted-foreground text-lg'))
    )
    expect(subtitleArea).toMatch(/radio/i)
  })
```

Actually, since this is a small addition to the same file, combine with Task 9. Instead, we'll update the subtitle in this step.

**Step 2: Implementation**

Update the subtitle text on the pricing page (around line 135):

Change:
```tsx
<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
  Start free. Upgrade when you need more platforms, campaigns, and
  premium features.
</p>
```

to:

```tsx
<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
  Start free. Upgrade when you need more platforms, campaigns, radio
  ads, and premium features.
</p>
```

**Step 3: Run all pricing tests**

Run: `npx jest src/app/pricing/__tests__/ --no-coverage`
Expected: PASS — all pricing tests pass

**Step 4: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "feat: mention radio ads in pricing page subtitle"
```

---

### Task 11: Run full test suite and verify no regressions

**Files:**
- No new files

**Step 1: Run all tests**

Run: `npx jest --no-coverage`
Expected: All tests pass — no regressions

**Step 2: Check for TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Run the dev server smoke test**

Run: `npx next build`
Expected: Build succeeds with no errors

**Step 4: Final commit if any fixes needed**

If tests or build found issues, fix them and commit:
```bash
git add -A
git commit -m "fix: address test/build regressions from radio ads marketing"
```

---

## Summary of Files Changed

| File | Action | What Changed |
|------|--------|-------------|
| `src/lib/stripe/config.ts` | Modify | Added `radioAds` to `TIER_FEATURES` for all tiers |
| `src/components/ui/upgrade-prompt.tsx` | Modify | Added `radioAds` to feature union type and messages |
| `src/lib/demo/sample-radio-script.ts` | Create | Sample 30s radio script + benefits list for modal |
| `src/components/campaign/radio-ads-upgrade-modal.tsx` | Create | Upgrade modal with sample script preview |
| `src/components/campaign/platform-selector.tsx` | Modify | Added `userTier` prop, intercept radioAds click for free users |
| `src/app/create/page.tsx` | Modify | Pass `usage.tier` as `userTier` to MlsInputForm |
| `src/components/mls-input-form.tsx` | Modify | Accept and forward `userTier` prop |
| `src/components/campaign/property-form.tsx` | Modify | Accept and forward `userTier` to PlatformSelector |
| `src/components/pricing/pricing-table.tsx` | Modify | Added "9 professional radio scripts" to Pro features |
| `src/components/landing/features-grid.tsx` | Modify | Added Radio Ad Scripts feature card |
| `src/app/pricing/page.tsx` | Modify | Added FAQ, updated subtitle, updated structured data |

## Test Files Created

| Test File | Tests |
|-----------|-------|
| `src/lib/stripe/__tests__/config-radio-ads.test.ts` | 3 |
| `src/components/ui/__tests__/upgrade-prompt-radio-ads.test.ts` | 2 |
| `src/lib/demo/__tests__/sample-radio-script.test.ts` | 7 |
| `src/components/campaign/__tests__/radio-ads-upgrade-modal.test.tsx` | 9 |
| `src/components/campaign/__tests__/platform-selector-radio-gate.test.ts` | 6 |
| `src/components/campaign/__tests__/create-flow-tier-prop.test.ts` | 3 |
| `src/components/pricing/__tests__/pricing-table-radio-ads.test.ts` | 3 |
| `src/components/landing/__tests__/features-grid-radio-ads.test.ts` | 3 |
| `src/app/pricing/__tests__/pricing-radio-ads-faq.test.ts` | 4 |
| **Total** | **40** |

## Acceptance Criteria Mapping

| Criteria | Task(s) |
|----------|---------|
| "Generate professional radio advertising campaigns" listed as key Pro benefit | Task 7 (pricing table) |
| Radio ads featured in subscription upgrade modal when free users click Radio Ads | Tasks 3, 4, 5, 6 |
| Pricing page highlights radio scripts alongside other premium features | Tasks 7, 9, 10 |
| Marketing copy emphasizes "9 professional radio scripts" value proposition | Tasks 3, 7, 8, 9 |
| Trial users can preview sample radio script before upgrade requirement | Tasks 3, 4 |
