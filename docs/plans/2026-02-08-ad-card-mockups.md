# Ad Preview Card Mockups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform text-only ad cards into platform-accurate visual mockups with listing images and inline image selection.

**Architecture:** Create dedicated mockup components for Instagram, Facebook, and Meta ads. Redesign PrintAdCard and PostcardCard to include images. Add a shared ImagePicker component for inline image swapping. Update CampaignTabs to wire photos through.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Lucide React icons

---

### Task 1: Create Shared ImagePicker Component

**Files:**
- Create: `src/components/ui/image-picker.tsx`

**Purpose:** Small inline image selector that appears on ad cards, letting users swap the displayed image.

**Component:**
```tsx
'use client';

import { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';

interface ImagePickerProps {
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ImagePicker({ images, selectedIndex, onSelect }: ImagePickerProps) {
  const [open, setOpen] = useState(false);

  if (images.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        aria-label="Change image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-20 rounded-lg bg-white shadow-xl border p-2 grid grid-cols-4 gap-1.5 w-[200px]">
          <button
            onClick={() => setOpen(false)}
            className="absolute -top-2 -right-2 rounded-full bg-slate-900 p-0.5 text-white hover:bg-slate-700"
          >
            <X className="h-3 w-3" />
          </button>
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => { onSelect(i); setOpen(false); }}
              className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                i === selectedIndex ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Commit:** `feat: add inline image picker component for ad cards`

---

### Task 2: Create Instagram Mockup Component

**Files:**
- Create: `src/components/campaign/instagram-card.tsx`

**Purpose:** Replace the generic AdCard for Instagram with a platform-accurate IG post mockup.

**Props:**
```tsx
interface InstagramCardProps {
  content: Record<string, string>;  // tone -> caption text
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}
```

**Visual Structure:**
- Card wrapper with subtle pink/purple left border (`border-l-4 border-pink-400/50`)
- **IG Header bar:** Row with gray circle avatar (32px), "yourbrand" bold text, "..." menu icon (MoreHorizontal from lucide)
- **Square image:** `aspect-square` container with `object-cover` image. ImagePicker button positioned absolute bottom-right.
- **Action row:** Heart, MessageCircle, Send, Bookmark icons (from lucide) in a row, all slate-700
- **Likes:** "123 likes" text in bold
- **Caption area:** "yourbrand" bold + caption text. Truncate to 3 lines with "... more" if long.
- **Tone switcher:** Keep existing tone toggle from AdCard for professional/casual/luxury
- **Character count badge** like current AdCard
- **Copy button** for the caption text
- **Compliance badge and violations** if present

The caption text comes from `content[selectedTone]`.

**Commit:** `feat: add Instagram post mockup card with image support`

---

### Task 3: Create Facebook Mockup Component

**Files:**
- Create: `src/components/campaign/facebook-card.tsx`

**Purpose:** Platform-accurate Facebook post mockup.

**Props:**
```tsx
interface FacebookCardProps {
  content: Record<string, string>;  // tone -> post text
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}
```

**Visual Structure:**
- Card wrapper with subtle blue left border (`border-l-4 border-blue-400/50`)
- **FB Header:** Circle avatar (40px) + "Your Brand" bold + "Just now · 🌐" subtext in gray
- **Post text:** The ad copy above the image, full text
- **Image:** Full-width landscape container (`aspect-[1.91/1]`) with `object-cover`. ImagePicker button bottom-right.
- **Engagement row:** 👍😍 "24" on left, "5 Comments · 2 Shares" on right, small gray text
- **Action row:** ThumbsUp "Like", MessageCircle "Comment", Share "Share" buttons in a bordered row
- **Tone switcher, character count, copy, compliance** same as Instagram card

**Commit:** `feat: add Facebook post mockup card with image support`

---

### Task 4: Redesign Meta Ad Card

**Files:**
- Modify: `src/components/campaign/meta-ad-card.tsx`

**Purpose:** Transform the text-only Meta ad card into a Facebook ad mockup with image.

**Props change:** Add `photos: string[]` to existing props.

**Visual Structure:**
- Card wrapper with subtle blue left border (`border-l-4 border-blue-500/50`)
- **Ad header:** "Sponsored" label in gray, small
- **Primary text** above the image
- **Image:** Full-width landscape (`aspect-[1.91/1]`), ImagePicker bottom-right
- **Below image:** Gray bar with headline on left (bold) and "Learn More" button on right (blue text, rounded)
- **Description** below that in gray text
- **Character count badges** for headline (40 limit) and description (30 limit)
- **Copy and compliance** as before

**Commit:** `feat: redesign Meta ad card with Facebook ad mockup layout`

---

### Task 5: Redesign Print Ad Card

**Files:**
- Modify: `src/components/campaign/print-ad-card.tsx`

**Purpose:** Add hero image to print/magazine ad layout.

**Props change:** Add `photos: string[]` to existing props.

**Visual Structure:**
- Card wrapper with subtle warm border (`border-l-4 border-amber-400/50`)
- **Hero image:** Top section, `aspect-[4/3]` with `object-cover`. Gradient overlay from bottom. ImagePicker bottom-right.
- **Headline** overlaid on gradient in white, large bold text
- **Body text** below image in the card body
- **CTA** styled as a bold accent line
- **Tone switcher** as before
- **Copy and compliance** as before

**Commit:** `feat: redesign print ad card with hero image layout`

---

### Task 6: Redesign Postcard Card

**Files:**
- Modify: `src/components/campaign/postcard-card.tsx`

**Purpose:** Add hero image to postcard front, create front/back visual mockup.

**Props change:** Add `photos: string[]` to existing props.

**Visual Structure:**
- Card wrapper with subtle green border (`border-l-4 border-emerald-400/50`)
- **Two-panel layout** with "Front" and "Back" labels
- **Front panel:**
  - Hero image filling the panel (`aspect-[3/2]`) with gradient overlay
  - Headline in white bold on gradient
  - CTA in white on gradient
  - ImagePicker bottom-right
- **Back panel:**
  - White background with subtle border
  - Back text content
  - Small "stamp" placeholder in top-right corner (a dashed border square)
  - "Place postage here" text in the stamp area
- **Tone switcher, compliance** as before

**Commit:** `feat: redesign postcard card with front/back image mockup`

---

### Task 7: Update CampaignTabs to Wire Photos

**Files:**
- Modify: `src/components/campaign/campaign-tabs.tsx`

**Purpose:** Pass listing photos to all image-enabled card components.

**Changes:**
1. Import new components: `InstagramCard`, `FacebookCard`
2. Replace Instagram's `AdCard` with `<InstagramCard content={campaign.instagram} photos={campaign.listing.photos} ...compliance/onReplace />`
3. Replace Facebook's `AdCard` with `<FacebookCard content={campaign.facebook} photos={campaign.listing.photos} ...compliance/onReplace />`
4. Pass `photos={campaign.listing.photos}` to `MetaAdCard`
5. Pass `photos={campaign.listing.photos}` to both `PrintAdCard` components
6. Pass `photos={campaign.listing.photos}` to `PostcardCard`
7. Keep Twitter, Google Ads, Zillow, Realtor, Homes.com, MLS, and Marketing as-is (no image needed)

**Commit:** `feat: wire listing photos to all image-enabled ad card components`

---

### Task 8: Build Verification and Polish

**Files:** Any files needing minor fixes

**Steps:**
1. Run `npx next build --no-lint` — fix any build errors
2. Visual review — check that all cards render correctly
3. Test image picker works on each card type
4. Test with no photos (should gracefully hide image sections)
5. Fix any issues found

**Commit:** `fix: polish ad card mockups and handle edge cases`

---

## Summary

| Task | Component | Can Parallelize? |
|------|-----------|-----------------|
| 1 | ImagePicker (shared) | Must be first |
| 2 | Instagram Mockup | Yes (after Task 1) |
| 3 | Facebook Mockup | Yes (after Task 1) |
| 4 | Meta Ad Card redesign | Yes (after Task 1) |
| 5 | Print Ad Card redesign | Yes (after Task 1) |
| 6 | Postcard Card redesign | Yes (after Task 1) |
| 7 | CampaignTabs wiring | After Tasks 2-6 |
| 8 | Build verification | After Task 7 |

**Parallelization opportunity:** Tasks 2-6 are fully independent (separate files, no shared state). Perfect for agent teams.

**Total new files:** 3 (`image-picker.tsx`, `instagram-card.tsx`, `facebook-card.tsx`)
**Modified files:** 4 (`meta-ad-card.tsx`, `print-ad-card.tsx`, `postcard-card.tsx`, `campaign-tabs.tsx`)
**New dependencies:** None
