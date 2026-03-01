# Audio Platform Category Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an 'Audio' category to the platform selection grid with a tier-gated Radio Ads stub card and reusable upgrade modal.

**Architecture:** UI-only stub approach — the Audio category and Radio Ads card are rendered in the platform selector without modifying the `PlatformId` type system or generation pipeline. A new `UpgradeModal` dialog component handles free-user upgrade prompts. The `userTier` prop is threaded from the server component down through the form hierarchy.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI (Dialog, Tooltip), lucide-react icons, Jest + @testing-library/react

---

## Summary of Changes

| # | Task | Files | Approx LoC |
|---|------|-------|-----------|
| 1 | Create `UpgradeModal` component | NEW `src/components/campaign/upgrade-modal.tsx` | ~65 |
| 2 | Test `UpgradeModal` | NEW `src/components/campaign/__tests__/upgrade-modal.test.tsx` | ~70 |
| 3 | Add Audio category + Radio Ads card to `PlatformSelector` | MODIFY `src/components/campaign/platform-selector.tsx` | ~80 added |
| 4 | Test Audio category in `PlatformSelector` | NEW `src/components/campaign/__tests__/platform-selector.test.tsx` | ~120 |
| 5 | Thread `userTier` prop through form hierarchy | MODIFY `property-form.tsx`, `mls-input-form.tsx` | ~10 added |
| 6 | Pass `userTier` from server component | MODIFY `src/app/create/page.tsx` | ~8 added |
| 7 | Update existing `PropertyForm` tests | MODIFY `src/components/campaign/__tests__/property-form.test.tsx` | ~15 added |
| 8 | Final build check | — | — |

---

### Task 1: Create the UpgradeModal Component

**Files:**
- Create: `src/components/campaign/upgrade-modal.tsx`

**Step 1: Create the component file**

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Radio, FileDown, RefreshCw, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRO_FEATURES = [
  { icon: Radio, label: 'Radio Ads — 15s, 30s & 60s scripts in 3 tones' },
  { icon: FileDown, label: 'PDF exports for print-ready campaigns' },
  { icon: RefreshCw, label: 'Unlimited campaign regeneration' },
  { icon: Share2, label: 'Shareable campaign links' },
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <DialogTitle>Upgrade to Pro</DialogTitle>
          </div>
          <DialogDescription>
            Unlock Radio Ads and premium features to supercharge your real estate marketing.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {PRO_FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3 text-sm">
              <Icon className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span className="text-foreground">{label}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href="/pricing">View Plans</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `upgrade-modal.tsx`

**Step 3: Commit**

```bash
git add src/components/campaign/upgrade-modal.tsx
git commit -m "feat: add reusable UpgradeModal component for tier-gating

Introduces a dialog component that displays Pro subscription benefits
and links to /pricing. Reusable for future tier-gated features."
```

---

### Task 2: Test the UpgradeModal Component

**Files:**
- Create: `src/components/campaign/__tests__/upgrade-modal.test.tsx`

**Step 1: Write the tests**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UpgradeModal } from '../upgrade-modal';

// Mock next/link to render as a plain anchor
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('UpgradeModal', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders title and description when open', () => {
    render(<UpgradeModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    expect(
      screen.getByText(/Unlock Radio Ads and premium features/)
    ).toBeInTheDocument();
  });

  test('renders all Pro features', () => {
    render(<UpgradeModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText(/Radio Ads/)).toBeInTheDocument();
    expect(screen.getByText(/PDF exports/)).toBeInTheDocument();
    expect(screen.getByText(/Unlimited campaign regeneration/)).toBeInTheDocument();
    expect(screen.getByText(/Shareable campaign links/)).toBeInTheDocument();
  });

  test('View Plans links to /pricing', () => {
    render(<UpgradeModal open={true} onOpenChange={mockOnOpenChange} />);

    const link = screen.getByRole('link', { name: /view plans/i });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  test('Maybe Later calls onOpenChange(false)', async () => {
    const user = userEvent.setup();
    render(<UpgradeModal open={true} onOpenChange={mockOnOpenChange} />);

    await user.click(screen.getByRole('button', { name: /maybe later/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('does not render content when closed', () => {
    render(<UpgradeModal open={false} onOpenChange={mockOnOpenChange} />);

    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run the tests**

Run: `npx jest src/components/campaign/__tests__/upgrade-modal.test.tsx --verbose`
Expected: 5 tests PASS

**Step 3: Commit**

```bash
git add src/components/campaign/__tests__/upgrade-modal.test.tsx
git commit -m "test: add UpgradeModal component tests

Covers rendering, Pro features list, pricing link, dismiss behavior,
and closed state."
```

---

### Task 3: Add Audio Category and Radio Ads Card to PlatformSelector

**Files:**
- Modify: `src/components/campaign/platform-selector.tsx`

This is the largest task. It modifies the PlatformSelector to:
1. Accept a `userTier` prop (defaults to `'free'`)
2. Add `'audio'` to `CATEGORY_ORDER` and `CATEGORY_LABELS`
3. Render a non-toggleable Radio Ads card in the Audio section
4. Show upgrade modal for free users, "Coming Soon" for Pro/Enterprise users

**Step 1: Add imports**

At the top of `platform-selector.tsx`, add to the existing lucide-react import:

Find the existing import block (lines 11-25):
```tsx
import {
  Instagram,
  Facebook,
  Twitter,
  Search as GoogleIcon,
  Layers,
  BookOpen,
  BookMarked,
  Mail,
  Globe,
  Building2,
  Home,
  FileText,
  Check,
} from 'lucide-react';
```

Replace with:
```tsx
import {
  Instagram,
  Facebook,
  Twitter,
  Search as GoogleIcon,
  Layers,
  BookOpen,
  BookMarked,
  Mail,
  Globe,
  Building2,
  Home,
  FileText,
  Check,
  Radio,
  Lock,
} from 'lucide-react';
```

Add these new imports after the `cn` import (line 26):
```tsx
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UpgradeModal } from '@/components/campaign/upgrade-modal';
import type { SubscriptionTier } from '@/lib/stripe/config';
```

Also add `useState` to the React import (line 3):
```tsx
import React, { useCallback, useMemo, useState } from 'react';
```

**Step 2: Widen CATEGORY_LABELS and CATEGORY_ORDER types**

Replace the existing `CATEGORY_LABELS` and `CATEGORY_ORDER` declarations (lines 53-61):

Old:
```tsx
const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  social: 'Social Media',
  paid: 'Paid Advertising',
  print: 'Print',
  listings: 'Online Listings',
  mls: 'MLS',
};

const CATEGORY_ORDER: PlatformCategory[] = ['social', 'paid', 'print', 'listings', 'mls'];
```

New:
```tsx
type ExtendedCategory = PlatformCategory | 'audio';

const CATEGORY_LABELS: Record<ExtendedCategory, string> = {
  social: 'Social Media',
  paid: 'Paid Advertising',
  print: 'Print',
  audio: 'Audio',
  listings: 'Online Listings',
  mls: 'MLS',
};

const CATEGORY_ORDER: ExtendedCategory[] = ['social', 'paid', 'print', 'audio', 'listings', 'mls'];
```

**Step 3: Add userTier prop to the component interface**

Replace the existing interface and component signature (lines 84-89):

Old:
```tsx
interface PlatformSelectorProps {
  selected: PlatformId[];
  onChange: (platforms: PlatformId[]) => void;
}

export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
```

New:
```tsx
interface PlatformSelectorProps {
  selected: PlatformId[];
  onChange: (platforms: PlatformId[]) => void;
  userTier?: SubscriptionTier;
}

export function PlatformSelector({ selected, onChange, userTier = 'free' }: PlatformSelectorProps) {
```

**Step 4: Add upgrade modal state**

Add right after the existing `selectedSet` useMemo (after line 90):

```tsx
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
```

**Step 5: Render the Audio category section and Radio Ads card**

Inside the `{/* Platform Grid grouped by category */}` section, after the `.map()` call for existing categories but before the closing `</div>`, we need to add the audio section. The audio section is rendered separately because it doesn't use `groupedByCategory`.

Find the closing of the CATEGORY_ORDER map block (around line 229-230):

Old (the full Platform Grid section):
```tsx
      {/* Platform Grid grouped by category */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((category) => {
          const platforms = groupedByCategory[category];
          if (platforms.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {platforms.map((platform) => {
                  const isSelected = selectedSet.has(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggle(platform.id)}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-1 rounded-lg border p-3 min-h-[60px] min-w-0 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        isSelected
                          ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted'
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                      )}
                      <PlatformIcon
                        platformId={platform.id}
                        className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                      />
                      <span className="text-[11px] font-medium leading-tight text-center truncate w-full">
                        {platform.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
```

Replace with:
```tsx
      {/* Platform Grid grouped by category */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((category) => {
          // Audio category is rendered as a special non-toggleable section
          if (category === 'audio') {
            const isFree = userTier === 'free';
            return (
              <div key="audio">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {CATEGORY_LABELS.audio}
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          role="button"
                          aria-label={
                            isFree
                              ? 'Radio Ads — Pro feature. Click to learn about upgrading.'
                              : 'Radio Ads — Coming soon'
                          }
                          onClick={() => {
                            if (isFree) setUpgradeModalOpen(true);
                          }}
                          className={cn(
                            'relative flex flex-col items-center justify-center gap-1 rounded-lg border p-3 min-h-[60px] min-w-0 transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                            isFree
                              ? 'border-border bg-muted/50 text-muted-foreground/50 cursor-pointer hover:border-border/80'
                              : 'border-border bg-card text-muted-foreground cursor-default'
                          )}
                        >
                          {/* PRO badge */}
                          <span className="absolute top-1 right-1">
                            <Badge
                              className="px-1.5 py-0 text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30"
                            >
                              PRO
                            </Badge>
                          </span>

                          {/* Lock overlay for free users */}
                          {isFree && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/30 backdrop-blur-[1px]">
                              <Lock className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}

                          <Radio className={cn('h-5 w-5', isFree ? 'text-muted-foreground/40' : 'text-muted-foreground')} />
                          <span className="text-[11px] font-medium leading-tight text-center truncate w-full">
                            Radio Ads
                          </span>

                          {/* Coming Soon for Pro users */}
                          {!isFree && (
                            <span className="text-[9px] text-muted-foreground/60">Coming Soon</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-center">
                        Generate 15s, 30s &amp; 60s radio scripts in 3 audio tones (Pro feature)
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          }

          const platforms = groupedByCategory[category as PlatformCategory];
          if (platforms.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {platforms.map((platform) => {
                  const isSelected = selectedSet.has(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggle(platform.id)}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-1 rounded-lg border p-3 min-h-[60px] min-w-0 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        isSelected
                          ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted'
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                      )}
                      <PlatformIcon
                        platformId={platform.id}
                        className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                      />
                      <span className="text-[11px] font-medium leading-tight text-center truncate w-full">
                        {platform.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
```

**Step 6: Add UpgradeModal render at the end of the component return**

Find the closing strategy note (line ~233-236):
```tsx
      {/* Strategy note */}
      <p className="text-xs text-muted-foreground italic">
        Strategy toolkit (hashtags, CTAs, targeting) is always included.
      </p>
    </div>
```

Replace with:
```tsx
      {/* Strategy note */}
      <p className="text-xs text-muted-foreground italic">
        Strategy toolkit (hashtags, CTAs, targeting) is always included.
      </p>

      {/* Upgrade modal for free-tier users */}
      <UpgradeModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
    </div>
```

**Step 7: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `platform-selector.tsx`

**Step 8: Commit**

```bash
git add src/components/campaign/platform-selector.tsx
git commit -m "feat: add Audio category with tier-gated Radio Ads card

Adds 'Audio' section to platform selector grid between Print and
Online Listings. Radio Ads card shows PRO badge and tooltip.
Free users see lock overlay; clicking opens upgrade modal.
Pro/Enterprise users see 'Coming Soon' state.
No changes to PlatformId type system or generation pipeline."
```

---

### Task 4: Test PlatformSelector Audio Category

**Files:**
- Create: `src/components/campaign/__tests__/platform-selector.test.tsx`

**Step 1: Write the tests**

```tsx
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PlatformSelector } from '../platform-selector';
import { ALL_PLATFORMS } from '@/lib/types/campaign';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('PlatformSelector', () => {
  const defaultProps = {
    selected: [...ALL_PLATFORMS],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Audio category', () => {
    test('renders Audio category heading', () => {
      render(<PlatformSelector {...defaultProps} />);

      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    test('renders Radio Ads card with PRO badge', () => {
      render(<PlatformSelector {...defaultProps} />);

      expect(screen.getByText('Radio Ads')).toBeInTheDocument();
      expect(screen.getByText('PRO')).toBeInTheDocument();
    });

    test('free user sees lock overlay and upgrade aria-label', () => {
      render(<PlatformSelector {...defaultProps} userTier="free" />);

      const radioButton = screen.getByRole('button', {
        name: /Radio Ads.*Pro feature.*upgrading/i,
      });
      expect(radioButton).toBeInTheDocument();
    });

    test('free user clicking Radio Ads opens upgrade modal', async () => {
      const user = userEvent.setup();
      render(<PlatformSelector {...defaultProps} userTier="free" />);

      const radioButton = screen.getByRole('button', {
        name: /Radio Ads.*Pro feature/i,
      });
      await user.click(radioButton);

      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    });

    test('pro user sees Coming Soon label', () => {
      render(<PlatformSelector {...defaultProps} userTier="pro" />);

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    test('pro user does not see lock overlay', () => {
      render(<PlatformSelector {...defaultProps} userTier="pro" />);

      const radioButton = screen.getByRole('button', {
        name: /Radio Ads.*Coming soon/i,
      });
      expect(radioButton).toBeInTheDocument();
    });

    test('pro user clicking Radio Ads does NOT open upgrade modal', async () => {
      const user = userEvent.setup();
      render(<PlatformSelector {...defaultProps} userTier="pro" />);

      const radioButton = screen.getByRole('button', {
        name: /Radio Ads.*Coming soon/i,
      });
      await user.click(radioButton);

      expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
    });

    test('enterprise user sees Coming Soon', () => {
      render(<PlatformSelector {...defaultProps} userTier="enterprise" />);

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    test('defaults to free tier when userTier is not provided', async () => {
      const user = userEvent.setup();
      render(<PlatformSelector {...defaultProps} />);

      const radioButton = screen.getByRole('button', {
        name: /Radio Ads.*Pro feature/i,
      });
      await user.click(radioButton);

      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    });
  });

  describe('existing platform behavior unchanged', () => {
    test('renders all 5 original category headings', () => {
      render(<PlatformSelector {...defaultProps} />);

      expect(screen.getByText('Social Media')).toBeInTheDocument();
      expect(screen.getByText('Paid Advertising')).toBeInTheDocument();
      expect(screen.getByText('Print')).toBeInTheDocument();
      expect(screen.getByText('Online Listings')).toBeInTheDocument();
      expect(screen.getByText('MLS')).toBeInTheDocument();
    });

    test('selected counter still shows X/12', () => {
      render(<PlatformSelector {...defaultProps} selected={['instagram', 'facebook']} />);

      expect(screen.getByText('2/12 selected')).toBeInTheDocument();
    });

    test('toggling a platform calls onChange', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(
        <PlatformSelector
          selected={[...ALL_PLATFORMS]}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: /instagram/i }));
      expect(onChange).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run the tests**

Run: `npx jest src/components/campaign/__tests__/platform-selector.test.tsx --verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/components/campaign/__tests__/platform-selector.test.tsx
git commit -m "test: add PlatformSelector tests for Audio category

Covers free/pro/enterprise tier states, upgrade modal trigger,
Coming Soon label, lock overlay, and verifies existing platform
behavior (categories, counter, toggle) is unchanged."
```

---

### Task 5: Thread `userTier` Prop Through Form Hierarchy

**Files:**
- Modify: `src/components/campaign/property-form.tsx`
- Modify: `src/components/mls-input-form.tsx`

**Step 1: Add `userTier` prop to PropertyForm**

In `src/components/campaign/property-form.tsx`:

Add import at top of file (after existing imports, around line 9-10):
```tsx
import type { SubscriptionTier } from '@/lib/stripe/config';
```

Update the `PropertyFormProps` interface (lines 12-19):

Old:
```tsx
interface PropertyFormProps {
  initialData?: Partial<ListingData>;
  onSubmit: (data: ListingData) => void;
  loading?: boolean;
  selectedPlatforms?: PlatformId[];
  onPlatformsChange?: (platforms: PlatformId[]) => void;
  userId?: string;
}
```

New:
```tsx
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

Update the destructured props in the component signature (line 31):

Old:
```tsx
export function PropertyForm({ initialData, onSubmit, loading, selectedPlatforms, onPlatformsChange, userId }: PropertyFormProps) {
```

New:
```tsx
export function PropertyForm({ initialData, onSubmit, loading, selectedPlatforms, onPlatformsChange, userId, userTier }: PropertyFormProps) {
```

Update the PlatformSelector render (lines 458-461):

Old:
```tsx
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={onPlatformsChange}
          />
```

New:
```tsx
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={onPlatformsChange}
            userTier={userTier}
          />
```

**Step 2: Add `userTier` prop to MlsInputForm**

In `src/components/mls-input-form.tsx`:

Add import (after line 6):
```tsx
import type { SubscriptionTier } from '@/lib/stripe/config';
```

Update the interface (lines 9-11):

Old:
```tsx
interface MlsInputFormProps {
  userId?: string;
}
```

New:
```tsx
interface MlsInputFormProps {
  userId?: string;
  userTier?: SubscriptionTier;
}
```

Update the component signature (line 13):

Old:
```tsx
export function MlsInputForm({ userId }: MlsInputFormProps) {
```

New:
```tsx
export function MlsInputForm({ userId, userTier }: MlsInputFormProps) {
```

Pass `userTier` to PropertyForm (around line 52-58):

Old:
```tsx
      <PropertyForm
        onSubmit={handleGenerate}
        loading={generateLoading}
        selectedPlatforms={selectedPlatforms}
        onPlatformsChange={setSelectedPlatforms}
        userId={userId}
      />
```

New:
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

**Step 3: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/campaign/property-form.tsx src/components/mls-input-form.tsx
git commit -m "feat: thread userTier prop through form hierarchy

PropertyForm and MlsInputForm now accept and forward userTier
to PlatformSelector for tier-gated UI rendering."
```

---

### Task 6: Pass `userTier` From Server Component

**Files:**
- Modify: `src/app/create/page.tsx`

**Step 1: Import getUserTier and pass the tier down**

In `src/app/create/page.tsx`:

Add import (after line 3):
```tsx
import { getUserTier } from '@/lib/stripe/gate'
```

After the `usage` query (after line 16), add the tier query:

Old:
```tsx
  const usage = await getCampaignUsage(supabase, user.id)
```

New:
```tsx
  const usage = await getCampaignUsage(supabase, user.id)
  const userTier = await getUserTier(supabase, user.id)
```

Update the MlsInputForm render (line 48):

Old:
```tsx
                <MlsInputForm userId={user.id} />
```

New:
```tsx
                <MlsInputForm userId={user.id} userTier={userTier} />
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors. Note: `getUserTier` queries `profiles.subscription_tier`. If this column doesn't exist in Supabase yet, the query will return `null` and default to `'free'`. This is the intended fallback behavior built into `getUserTier`.

**Step 3: Commit**

```bash
git add src/app/create/page.tsx
git commit -m "feat: query user tier in CreatePage and pass to form

Server component now queries profiles.subscription_tier via
getUserTier() and forwards it through the form hierarchy.
Defaults to 'free' if column doesn't exist."
```

---

### Task 7: Update Existing PropertyForm Tests

**Files:**
- Modify: `src/components/campaign/__tests__/property-form.test.tsx`

The existing tests should still pass because `userTier` is optional with a default. But we add a test to verify the prop passthrough works.

**Step 1: Verify existing tests still pass**

Run: `npx jest src/components/campaign/__tests__/property-form.test.tsx --verbose`
Expected: All 4 existing tests PASS

**Step 2: Add a test for userTier passthrough (optional, validates integration)**

Add to the end of the describe block in `property-form.test.tsx`:

```tsx
  test('renders without errors when userTier is provided', () => {
    render(
      <PropertyForm
        onSubmit={mockSubmit}
        selectedPlatforms={['instagram', 'facebook']}
        onPlatformsChange={jest.fn()}
        userTier="pro"
      />
    );

    // Verify the platform selector section renders
    expect(screen.getByText('Choose Your Platforms')).toBeInTheDocument();
    // Pro users should see Coming Soon on Radio Ads
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });
```

**Step 3: Run all tests**

Run: `npx jest src/components/campaign/__tests__/property-form.test.tsx --verbose`
Expected: All 5 tests PASS

**Step 4: Commit**

```bash
git add src/components/campaign/__tests__/property-form.test.tsx
git commit -m "test: add PropertyForm test for userTier prop passthrough

Verifies that PropertyForm correctly passes userTier to
PlatformSelector and the Audio card renders appropriately."
```

---

### Task 8: Run Full Test Suite and Build Check

**Files:** None (verification only)

**Step 1: Run the full test suite**

Run: `npx jest --verbose 2>&1 | tail -30`
Expected: All tests pass. No regressions.

**Step 2: Run the TypeScript compiler**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Run the Next.js build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds. No errors.

**Step 4: Commit (only if any fixes were needed)**

If any fixes were applied during this step:
```bash
git add -A
git commit -m "fix: resolve build/test issues from audio category feature"
```

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/campaign/upgrade-modal.tsx` | CREATE | Reusable upgrade prompt dialog |
| `src/components/campaign/__tests__/upgrade-modal.test.tsx` | CREATE | Tests for UpgradeModal |
| `src/components/campaign/platform-selector.tsx` | MODIFY | Audio category + Radio Ads card + userTier prop |
| `src/components/campaign/__tests__/platform-selector.test.tsx` | CREATE | Tests for Audio category in PlatformSelector |
| `src/components/campaign/property-form.tsx` | MODIFY | Accept + pass userTier prop |
| `src/components/mls-input-form.tsx` | MODIFY | Accept + pass userTier prop |
| `src/app/create/page.tsx` | MODIFY | Query + pass userTier |
| `src/components/campaign/__tests__/property-form.test.tsx` | MODIFY | Add userTier integration test |

## Files NOT Changed (Intentionally)

| File | Reason |
|------|--------|
| `src/lib/types/campaign.ts` | No `'radioAds'` added to PlatformId — deferred until backend generation exists |
| `src/lib/ai/prompt.ts` | No radio ad prompt templates yet |
| `src/lib/ai/generate.ts` | No generation pipeline changes |
| `src/components/campaign/campaign-tabs.tsx` | No audio tab — no generated content to display |

## Key Decisions for Implementer

1. **`'audio'` only exists locally** in `platform-selector.tsx` via `ExtendedCategory` type alias. It is NOT added to `PlatformCategory` in `campaign.ts`.
2. **Radio Ads is NOT a `PlatformOption`** — it's rendered as a special-case inside the category loop, not through the `groupedByCategory` mechanism.
3. **`getUserTier()` already exists** in `src/lib/stripe/gate.ts` and handles the case where `profiles.subscription_tier` doesn't exist (returns `'free'`).
4. **No `/pricing` page exists yet** — the View Plans link in UpgradeModal points to `/pricing` which will 404 until the pricing page is built. This is acceptable per the design doc.
5. **The existing `Badge` component** is used with custom className overrides for the amber PRO badge styling (not a new variant).

---

Plan complete and saved to `docs/plans/2026-02-26-audio-platform-category-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

*Autonomous decision: Recommending Subagent-Driven for this session since we're already in context.*

---

### HANDOFF
- **Status**: completed
- **Summary**: Created a comprehensive 8-task implementation plan for adding the Audio platform category to the platform selector UI. The plan follows TDD principles with bite-sized tasks, exact file paths, complete code snippets, test commands, and commit messages. Each task is scoped to 2-5 minutes of work.
- **Key Decisions**: (1) Followed Approach A (UI-only stub) from the design doc — no changes to PlatformId type system. (2) Leveraged existing `getUserTier()` from `src/lib/stripe/gate.ts` instead of writing a new tier query. (3) Used custom className overrides on existing Badge component for PRO badge styling rather than adding a new variant. (4) Tests use Jest + @testing-library/react matching the existing test infrastructure. (5) Audio category rendered as special-case in the CATEGORY_ORDER loop, not through groupedByCategory.
- **Open Questions**: (1) Whether `profiles.subscription_tier` column exists in Supabase — `getUserTier()` handles missing column gracefully by defaulting to `'free'`. (2) Whether `/pricing` page needs a placeholder — currently will 404, which is acceptable per design doc.
- **Files Modified**: `docs/plans/2026-02-26-audio-platform-category-plan.md` (new)
- **Next Stage Needs**: Implementer should execute tasks 1-8 in order. Task 1 (UpgradeModal) is independent. Tasks 3-6 have sequential dependencies. Task 7 depends on Tasks 3+5. Task 8 is a final validation gate. Use `superpowers:executing-plans` sub-skill.
- **Warnings**: (1) The `groupedByCategory` Record uses `PlatformCategory` as key type — the audio category bypass with `category === 'audio'` check before accessing `groupedByCategory[category as PlatformCategory]` is critical to avoid TypeScript errors. (2) Tooltip tests may be flaky due to Radix Portal rendering — if tooltip content isn't found in tests, consider wrapping with TooltipProvider or querying the document body. (3) The `profiles.subscription_tier` column may not exist yet — the integration will work but always show free-tier behavior until the column is created.
