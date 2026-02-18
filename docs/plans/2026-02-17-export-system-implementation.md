# Export System Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the text-only export system with platform-sized photo exports, ZIP bundle, share link, email delivery, print-ready PDF, and character count warnings.

**Architecture:** Server-side image processing with `sharp`, ZIP streaming with `archiver`, email via Resend, PDF rewrite with `@react-pdf/renderer`, public share page with dual-auth (session OR share token). All new API routes follow the existing `requireAuth()` pattern.

**Tech Stack:** Next.js 15 (App Router, standalone output), sharp, archiver, Resend, @react-pdf/renderer, Supabase (Postgres + Storage), React 19, TypeScript 5.9

**Design Doc:** `docs/plans/2026-02-17-export-system-design.md`

---

## Phase 1: Foundation (configs, types, utilities)

Sets up dependencies, shared configs, and utility functions that all features depend on.

### Task 1: Update dependencies

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Step 1: Install new packages**

Run:
```bash
npm install sharp archiver resend
npm install --save-dev @types/archiver
npm uninstall puppeteer
```

**Step 2: Configure sharp for standalone builds**

In `next.config.ts`, update `outputFileTracingIncludes` to include sharp's native modules:

```typescript
outputFileTracingIncludes: {
  '/api/*': ['./ad-docs/**/*', './node_modules/sharp/**/*'],
},
```

**Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no sharp-related errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore: add sharp, archiver, resend; remove puppeteer"
```

---

### Task 2: Platform dimensions and character limits config

**Files:**
- Create: `src/lib/export/platform-dimensions.ts`

**Step 1: Create the config file**

```typescript
// Platform photo dimensions for export
export interface PlatformDimension {
  platform: string;
  label: string;
  width: number;
  height: number;
  filenamePrefix: string;
}

export const PLATFORM_DIMENSIONS: PlatformDimension[] = [
  { platform: 'instagram', label: 'Instagram Post', width: 1080, height: 1080, filenamePrefix: 'Instagram' },
  { platform: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920, filenamePrefix: 'Instagram-Story' },
  { platform: 'facebook', label: 'Facebook Post', width: 1200, height: 630, filenamePrefix: 'Facebook' },
  { platform: 'twitter', label: 'Twitter/X Post', width: 1600, height: 900, filenamePrefix: 'Twitter' },
  { platform: 'linkedin', label: 'LinkedIn Post', width: 1200, height: 627, filenamePrefix: 'LinkedIn' },
];

// Character count limits per platform
export interface CharLimit {
  element: string;
  limit: number;
  type: 'hard' | 'truncation';
  notes?: string;
}

export const PLATFORM_CHAR_LIMITS: Record<string, CharLimit[]> = {
  twitter: [
    { element: 'tweet', limit: 280, type: 'hard' },
  ],
  googleAds: [
    { element: 'headline', limit: 30, type: 'hard' },
    { element: 'description', limit: 90, type: 'hard' },
  ],
  metaAd: [
    { element: 'primaryText', limit: 125, type: 'truncation', notes: 'Before "see more"' },
    { element: 'headline', limit: 40, type: 'hard' },
    { element: 'description', limit: 30, type: 'hard' },
  ],
  instagram: [
    { element: 'caption-visible', limit: 125, type: 'truncation', notes: 'Before "more"' },
    { element: 'caption-total', limit: 2200, type: 'hard' },
  ],
  facebook: [
    { element: 'post-visible', limit: 477, type: 'truncation', notes: 'Before "see more"' },
  ],
  zillow: [
    { element: 'description', limit: 4500, type: 'hard', notes: 'Approximate' },
  ],
  realtorCom: [
    { element: 'description', limit: 5000, type: 'hard', notes: 'Approximate' },
  ],
  homesComTrulia: [
    { element: 'description', limit: 4000, type: 'hard', notes: 'Approximate' },
  ],
  mlsDescription: [
    { element: 'description', limit: 2000, type: 'hard', notes: 'Safe default, varies by provider' },
  ],
};

// Supabase storage domain for SSRF validation
export const ALLOWED_PHOTO_DOMAINS = [
  'qunrofzwejafqzssmkpa.supabase.co',
];

export function isAllowedPhotoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_PHOTO_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/export/platform-dimensions.ts
git commit -m "feat: add platform dimensions and character limits config"
```

---

### Task 3: MLS text sanitization utility

**Files:**
- Create: `src/lib/export/sanitize-mls.ts`

**Step 1: Create the sanitize function**

```typescript
/**
 * Sanitizes text for MLS system compatibility.
 * Strips smart quotes, em/en dashes, emoji, zero-width chars, and normalizes whitespace.
 * Only used for MLS card copy — other platforms handle Unicode fine.
 */
export function sanitizeMlsText(text: string): string {
  let result = text;

  // Smart quotes → straight quotes
  result = result.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  result = result.replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  // Em dash / en dash → hyphen
  result = result.replace(/[\u2014\u2013]/g, '-');

  // Ellipsis character → three dots
  result = result.replace(/\u2026/g, '...');

  // Strip emoji (Unicode emoji ranges)
  result = result.replace(/[\u{1F600}-\u{1F64F}]/gu, '');  // Emoticons
  result = result.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');  // Misc symbols & pictographs
  result = result.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');  // Transport & map
  result = result.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');  // Flags
  result = result.replace(/[\u{2600}-\u{26FF}]/gu, '');     // Misc symbols
  result = result.replace(/[\u{2700}-\u{27BF}]/gu, '');     // Dingbats
  result = result.replace(/[\u{FE00}-\u{FE0F}]/gu, '');     // Variation selectors
  result = result.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');   // Supplemental symbols
  result = result.replace(/[\u{1FA00}-\u{1FA6F}]/gu, '');   // Chess symbols
  result = result.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');   // Symbols extended-A
  result = result.replace(/[\u{200D}]/gu, '');               // Zero-width joiner (emoji combiner)

  // Strip zero-width characters and BOM
  result = result.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');

  // Normalize whitespace
  result = result.replace(/[ \t]+/g, ' ');          // Collapse horizontal whitespace
  result = result.replace(/\n{3,}/g, '\n\n');       // Max two consecutive newlines
  result = result.replace(/[ \t]+$/gm, '');         // Trailing whitespace per line
  result = result.trim();

  return result;
}
```

**Step 2: Commit**

```bash
git add src/lib/export/sanitize-mls.ts
git commit -m "feat: add MLS text sanitization utility"
```

---

### Task 4: Photo resize utility with SSRF protection

**Files:**
- Create: `src/lib/export/photo-resize.ts`

**Step 1: Create the photo resize module**

```typescript
import sharp from 'sharp';
import { PLATFORM_DIMENSIONS, isAllowedPhotoUrl, type PlatformDimension } from './platform-dimensions';

export interface ResizedPhoto {
  buffer: Buffer;
  filename: string;
  width: number;
  height: number;
}

/**
 * Fetches a photo from URL and resizes it to the given dimensions.
 * Validates URL against allowed domains (SSRF protection).
 */
export async function resizePhoto(
  photoUrl: string,
  dimension: PlatformDimension,
  index?: number,
): Promise<ResizedPhoto> {
  if (!isAllowedPhotoUrl(photoUrl)) {
    throw new Error(`Blocked photo URL: not from allowed domain`);
  }

  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch photo: ${response.status}`);
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());

  const outputBuffer = await sharp(inputBuffer)
    .resize(dimension.width, dimension.height, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const suffix = index !== undefined ? `-${String(index + 1).padStart(2, '0')}` : '';
  const filename = `${dimension.filenamePrefix}-${dimension.width}x${dimension.height}${suffix}.jpg`;

  return {
    buffer: outputBuffer,
    filename,
    width: dimension.width,
    height: dimension.height,
  };
}

/**
 * Resizes a single photo to all platform dimensions.
 * Returns array of resized photos.
 */
export async function resizePhotoAllPlatforms(
  photoUrl: string,
  platformIds: string[],
  index?: number,
): Promise<ResizedPhoto[]> {
  const dimensions = PLATFORM_DIMENSIONS.filter(d =>
    platformIds.some(id => d.platform.startsWith(id) || d.platform === id)
  );

  // Process in batches of 3 to avoid memory pressure
  const results: ResizedPhoto[] = [];
  for (let i = 0; i < dimensions.length; i += 3) {
    const batch = dimensions.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(dim => resizePhoto(photoUrl, dim, index))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Resizes all photos for all platforms. Processes photos sequentially,
 * platform dimensions in batches of 3.
 */
export async function resizeAllPhotos(
  photoUrls: string[],
  platformIds: string[],
): Promise<ResizedPhoto[]> {
  const allResults: ResizedPhoto[] = [];

  for (let photoIndex = 0; photoIndex < photoUrls.length; photoIndex++) {
    const results = await resizePhotoAllPlatforms(
      photoUrls[photoIndex],
      platformIds,
      photoIndex,
    );
    allResults.push(...results);
  }

  return allResults;
}
```

**Step 2: Commit**

```bash
git add src/lib/export/photo-resize.ts
git commit -m "feat: add photo resize utility with SSRF protection and batching"
```

---

### Task 5: Database migration for share columns

**Files:**
- Create: `supabase/migrations/20260217_add_share_columns.sql`

**Step 1: Write the migration**

```sql
-- Add share link columns to campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Unique index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_share_token
  ON campaigns (share_token)
  WHERE share_token IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN campaigns.share_token IS 'Public share link token, nullable. Set when agent shares campaign.';
COMMENT ON COLUMN campaigns.share_expires_at IS 'Share link expiry timestamp. Default 7 days from creation.';
```

**Step 2: Apply migration**

Run:
```bash
npx supabase db push
```

Or apply manually via Supabase dashboard if using hosted.

**Step 3: Commit**

```bash
git add supabase/migrations/20260217_add_share_columns.sql
git commit -m "feat: add share_token and share_expires_at columns to campaigns"
```

---

## Phase 2: Character Count Warnings + MLS Fixes (quick wins)

These are small, self-contained UI changes that deliver immediate value.

### Task 6: Character count badge component

**Files:**
- Create: `src/components/campaign/character-count.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { PLATFORM_CHAR_LIMITS, type CharLimit } from '@/lib/export/platform-dimensions';
import { cn } from '@/lib/utils';

interface CharacterCountProps {
  platformId: string;
  text: string;
  /** Override element name if a platform has multiple limits (e.g. 'headline' vs 'description') */
  element?: string;
}

export function CharacterCount({ platformId, text, element }: CharacterCountProps) {
  const limits = PLATFORM_CHAR_LIMITS[platformId];
  if (!limits || limits.length === 0) return null;

  const relevantLimits = element
    ? limits.filter(l => l.element === element)
    : limits;

  if (relevantLimits.length === 0) return null;

  const count = text.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {relevantLimits.map((limit) => {
        const ratio = count / limit.limit;
        const isOver = count > limit.limit;
        const isWarning = ratio >= 0.9 && !isOver;
        const overBy = count - limit.limit;

        return (
          <div key={limit.element} className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                'text-xs font-mono tabular-nums',
                isOver && 'text-red-500 font-semibold',
                isWarning && 'text-yellow-600',
                !isOver && !isWarning && 'text-muted-foreground',
              )}
            >
              {count.toLocaleString()}/{limit.limit.toLocaleString()}
              {limit.type === 'truncation' && (
                <span className="text-[10px] ml-1 opacity-70">visible</span>
              )}
            </span>
            {isOver && (
              <span className="text-[10px] text-red-500">
                Over by {overBy} char{overBy !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/character-count.tsx
git commit -m "feat: add CharacterCount badge component"
```

---

### Task 7: Wire character counts into AdCardWrapper

**Files:**
- Modify: `src/components/campaign/ad-card-wrapper.tsx`

**Step 1: Add CharacterCount to the card header area**

Add import at top:
```typescript
import { CharacterCount } from './character-count';
```

Add new props to the interface:
```typescript
interface AdCardWrapperProps {
  // ... existing props ...
  platformId?: string;        // For character count lookup
  charCountText?: string;     // Text to count characters for
  charCountElement?: string;  // Specific element (e.g. 'headline')
}
```

In the JSX, near the existing controls/header area (near the copy button), add:
```tsx
{platformId && charCountText && (
  <CharacterCount
    platformId={platformId}
    text={charCountText}
    element={charCountElement}
  />
)}
```

**Step 2: Update the disabled Export button placeholder**

Replace the disabled Export button (lines 119-128) with a comment placeholder for now — it will be replaced with the real "Download Photo" button in Phase 3:

```tsx
{/* Download Photo button — implemented in Phase 3, Task 11 */}
```

**Step 3: Commit**

```bash
git add src/components/campaign/ad-card-wrapper.tsx
git commit -m "feat: wire CharacterCount into AdCardWrapper, remove disabled Export placeholder"
```

---

### Task 8: Pass platformId and charCountText from each card component

**Files:**
- Modify: Each card component that uses `AdCardWrapper` — check each one and add the `platformId` and `charCountText` props.

The card components to update (pass the appropriate platformId and text):
- `src/components/campaign/twitter-card.tsx` → `platformId="twitter"` + the tweet text
- `src/components/campaign/zillow-card.tsx` → `platformId="zillow"` + description text. **Also fix hardcoded 2000 char check to 4500.**
- `src/components/campaign/realtor-card.tsx` → `platformId="realtorCom"` + description text
- `src/components/campaign/homes-trulia-card.tsx` → `platformId="homesComTrulia"` + description text
- Instagram card → `platformId="instagram"` + caption text
- Facebook card → `platformId="facebook"` + post text
- Google Ads card → `platformId="googleAds"` + headline/description (use `charCountElement` for each)
- Meta Ad card → `platformId="metaAd"` + each field separately
- MLS card → `platformId="mlsDescription"` + description text

Each card already passes `copyText` — the `charCountText` will typically be the same value.

**Step 1: Update each card component to pass the new props**

For each card, add `platformId` and `charCountText` props to the `<AdCardWrapper>` usage. Example for Twitter:

```tsx
<AdCardWrapper
  platform="Twitter / X"
  platformIcon={...}
  dimensionLabel="..."
  copyText={campaign.twitter}
  platformId="twitter"
  charCountText={campaign.twitter || ''}
  // ... other existing props
>
```

**Step 2: Wire MLS sanitization into MLS card's copy button**

In the MLS card component, import `sanitizeMlsText` from `@/lib/export/sanitize-mls` and wrap the `copyText` prop:

```typescript
import { sanitizeMlsText } from '@/lib/export/sanitize-mls';

// In the JSX:
copyText={campaign.mlsDescription ? sanitizeMlsText(campaign.mlsDescription) : undefined}
```

**Step 3: Fix Zillow card hardcoded char limit**

In `zillow-card.tsx`, find the hardcoded 2000 character check and update to 4500, or remove it entirely since CharacterCount now handles this.

**Step 4: Commit**

```bash
git add src/components/campaign/
git commit -m "feat: wire character counts to all card components, add MLS sanitization"
```

---

### Task 9: Fix hardcoded "Montana" in PDF

**Files:**
- Modify: `src/lib/export/pdf-document.tsx`

**Step 1: Find and replace the hardcoded label**

At line ~151, replace:
```
MLS Description (Montana)
```

With dynamic state resolution:
```typescript
const mlsState = campaign.listing?.address?.state || campaign.stateCode || 'Unknown State';
// Then in the text:
`MLS Description (${mlsState})`
```

Handle empty string: use `campaign.listing?.address?.state?.trim() || campaign.stateCode || 'Unknown State'`.

**Step 2: Commit**

```bash
git add src/lib/export/pdf-document.tsx
git commit -m "fix: use dynamic state label in MLS PDF section instead of hardcoded Montana"
```

---

## Phase 3: Photo Export API + Per-Card Download

### Task 10: Photo export API route

**Files:**
- Create: `src/app/api/export/photo/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { resizePhoto } from '@/lib/export/photo-resize';
import { PLATFORM_DIMENSIONS, isAllowedPhotoUrl } from '@/lib/export/platform-dimensions';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    // Dual-auth: session OR share token
    const body = await request.json();
    const { photoUrl, platform, shareToken } = body as {
      photoUrl: string;
      platform: string;
      shareToken?: string;
    };

    // Auth check
    if (shareToken) {
      // Validate share token
      const supabase = await createClient();
      const { data: row } = await supabase
        .from('campaigns')
        .select('id')
        .eq('share_token', shareToken)
        .gt('share_expires_at', new Date().toISOString())
        .single();
      if (!row) {
        return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 401 });
      }
    } else {
      const { error: authError } = await requireAuth();
      if (authError) return authError;
    }

    // Validate photo URL (SSRF protection)
    if (!photoUrl || !isAllowedPhotoUrl(photoUrl)) {
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
    }

    // Find dimension config
    const dimension = PLATFORM_DIMENSIONS.find(d => d.platform === platform);
    if (!dimension) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const result = await resizePhoto(photoUrl, dimension);

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Photo export error:', error);
    return NextResponse.json({ error: 'Photo export failed' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/export/photo/route.ts
git commit -m "feat: add photo export API route with SSRF protection and dual-auth"
```

---

### Task 11: Per-card "Download Photo" button

**Files:**
- Modify: `src/components/campaign/ad-card-wrapper.tsx`

**Step 1: Add the Download Photo button**

Add new props:
```typescript
interface AdCardWrapperProps {
  // ... existing props ...
  photoUrl?: string;         // Hero photo URL for download
  photoPlatform?: string;    // Platform ID for photo dimensions
}
```

Replace the Phase 2 placeholder comment with:
```tsx
{photoUrl && photoPlatform && (
  <Button
    size="sm"
    variant="outline"
    className="text-xs gap-1.5"
    disabled={downloadingPhoto}
    onClick={handleDownloadPhoto}
  >
    <Download className="h-3.5 w-3.5" />
    {downloadingPhoto ? 'Downloading...' : 'Download Photo'}
  </Button>
)}
```

Add state and handler:
```typescript
const [downloadingPhoto, setDownloadingPhoto] = useState(false);

async function handleDownloadPhoto() {
  if (!photoUrl || !photoPlatform) return;
  setDownloadingPhoto(true);
  try {
    const res = await fetch('/api/export/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl, platform: photoPlatform }),
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || `${photoPlatform}-photo.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Photo download failed');
  } finally {
    setDownloadingPhoto(false);
  }
}
```

**Step 2: Pass photoUrl and photoPlatform from card components**

Each card component that has a relevant platform dimension should pass:
- `photoUrl={campaign.listing.photos?.[0]}` (hero photo)
- `photoPlatform` mapped to the correct platform dimension ID:
  - Instagram cards → `"instagram"`
  - Facebook cards → `"facebook"`
  - Twitter card → `"twitter"`
  - Listing cards (Zillow, Realtor, etc.) → no photo download (text-only platforms)
  - Print cards → no photo download (handled via PDF)

**Step 3: Commit**

```bash
git add src/components/campaign/ad-card-wrapper.tsx src/components/campaign/
git commit -m "feat: add per-card Download Photo button wired to photo export API"
```

---

## Phase 4: Print-Ready PDF Rewrite

### Task 12: Rewrite PDF document with photos and all tones

**Files:**
- Modify: `src/lib/export/pdf-document.tsx` (complete rewrite)
- Modify: `src/lib/export/generate-pdf.tsx` (minor update)

**Step 1: Rewrite pdf-document.tsx**

Complete rewrite with:
- **Cover page:** Hero photo via `@react-pdf/renderer` `Image` component (fetches URL directly), address, price, beds/baths/sqft, agent/broker info
- **Social Media section:** Instagram (all 3 tones), Facebook (all 3 tones), Twitter, Hashtags
- **Paid Ads section:** Google Ads variations in table layout, Meta Ad fields
- **Listings section:** Zillow, Realtor.com, Homes/Trulia, MLS Description with dynamic state label (`campaign.listing.address.state?.trim() || campaign.stateCode || ''`)
- **Print section:** Postcard (professional/casual), Magazine Full (professional/luxury), Magazine Half (professional/luxury)
- **Strategy section:** Selling points, calls to action, targeting notes

Key imports:
```typescript
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
```

Use `Image` component with `src={campaign.listing.photos[0]}` for the cover photo. `@react-pdf/renderer`'s `Image` fetches the URL server-side automatically.

**Step 2: Update generate-pdf.tsx if needed**

The signature likely stays the same (`generatePdfBuffer(campaign: CampaignKit)`), but verify the new component renders correctly:

Run:
```bash
npm run build
```

**Step 3: Test PDF export manually**

Start dev server, navigate to a campaign, click "Export PDF." Verify:
- Cover page has photo
- All tones present for Instagram/Facebook
- MLS shows correct state (not Montana)
- Postcard content included

**Step 4: Commit**

```bash
git add src/lib/export/pdf-document.tsx src/lib/export/generate-pdf.tsx
git commit -m "feat: rewrite PDF with photos, all tones, cover page, dynamic MLS state"
```

---

### Task 13: Fix CSV export to include all platforms

**Files:**
- Modify: `src/app/api/export/route.ts`

**Step 1: Update buildCsvRows to include missing platforms**

Add rows for: postcard (professional front/back, casual front/back), magazineFullPage (professional/luxury), magazineHalfPage (professional/luxury), sellingPoints, callsToAction, targetingNotes.

Example additions to `buildCsvRows`:
```typescript
// Postcard
if (c.postcard?.professional) {
  rows.push(['Postcard', 'Professional (Front)', `${c.postcard.professional.front.headline}\n${c.postcard.professional.front.body}\n${c.postcard.professional.front.cta}`, '']);
  rows.push(['Postcard', 'Professional (Back)', c.postcard.professional.back, String(c.postcard.professional.back.length)]);
}
if (c.postcard?.casual) {
  rows.push(['Postcard', 'Casual (Front)', `${c.postcard.casual.front.headline}\n${c.postcard.casual.front.body}\n${c.postcard.casual.front.cta}`, '']);
  rows.push(['Postcard', 'Casual (Back)', c.postcard.casual.back, String(c.postcard.casual.back.length)]);
}

// Magazine Full Page
if (c.magazineFullPage?.professional) {
  const m = c.magazineFullPage.professional;
  rows.push(['Magazine Full Page', 'Professional', `${m.headline}\n${m.body}\n${m.cta}`, '']);
}
if (c.magazineFullPage?.luxury) {
  const m = c.magazineFullPage.luxury;
  rows.push(['Magazine Full Page', 'Luxury', `${m.headline}\n${m.body}\n${m.cta}`, '']);
}

// Magazine Half Page (same pattern)
// Selling Points
if (c.sellingPoints?.length) {
  rows.push(['Selling Points', '', c.sellingPoints.join('\n'), '']);
}
// Calls to Action
if (c.callsToAction?.length) {
  rows.push(['Calls to Action', '', c.callsToAction.join('\n'), '']);
}
// Targeting Notes
if (c.targetingNotes) {
  rows.push(['Targeting Notes', '', c.targetingNotes, String(c.targetingNotes.length)]);
}
```

**Step 2: Commit**

```bash
git add src/app/api/export/route.ts
git commit -m "fix: include all platforms in CSV export (postcard, magazine, strategy)"
```

---

## Phase 5: ZIP Bundle

### Task 14: Bundle assembly utility

**Files:**
- Create: `src/lib/export/bundle.ts`

**Step 1: Create the bundle module**

```typescript
import archiver from 'archiver';
import { Writable } from 'stream';
import { CampaignKit } from '@/lib/types';
import { resizeAllPhotos } from './photo-resize';
import { generatePdfBuffer } from './generate-pdf';
import { PLATFORM_DIMENSIONS } from './platform-dimensions';

/**
 * Maps PlatformId to photo dimension platform keys.
 * Only platforms that have photo dimensions are included.
 */
const PLATFORM_TO_PHOTO_MAP: Record<string, string[]> = {
  instagram: ['instagram', 'instagram-story'],
  facebook: ['facebook'],
  twitter: ['twitter'],
  // LinkedIn not in PlatformId but included in all social exports
};

export interface BundleProgress {
  phase: string;
  detail: string;
}

export async function generateBundle(
  campaign: CampaignKit,
  onProgress?: (progress: BundleProgress) => void,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(writable);

  const address = campaign.listing?.address?.street?.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Campaign';
  const folderName = address;

  // 1. Resize and add photos
  const photos = campaign.listing?.photos?.filter(Boolean) || [];
  if (photos.length > 0) {
    onProgress?.({ phase: 'photos', detail: `Processing ${photos.length} photos...` });

    // Determine which platform dimensions to include
    const selectedPlatforms = campaign.selectedPlatforms || [];
    const photoPlatformIds: string[] = [];
    for (const pid of selectedPlatforms) {
      const mapped = PLATFORM_TO_PHOTO_MAP[pid];
      if (mapped) photoPlatformIds.push(...mapped);
    }
    // Always include LinkedIn for social campaigns
    if (selectedPlatforms.some(p => ['instagram', 'facebook', 'twitter'].includes(p))) {
      if (!photoPlatformIds.includes('linkedin')) photoPlatformIds.push('linkedin');
    }

    // If no specific platforms selected, include all
    const platformIds = photoPlatformIds.length > 0
      ? photoPlatformIds
      : PLATFORM_DIMENSIONS.map(d => d.platform);

    const resized = await resizeAllPhotos(photos, platformIds);
    for (const photo of resized) {
      archive.append(photo.buffer, { name: `${folderName}/${photo.filename}` });
    }

    // Add originals
    for (let i = 0; i < photos.length; i++) {
      onProgress?.({ phase: 'originals', detail: `Adding original ${i + 1}/${photos.length}...` });
      try {
        const res = await fetch(photos[i]);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const ext = photos[i].split('.').pop()?.split('?')[0] || 'jpg';
          archive.append(buf, { name: `${folderName}/Originals/photo-${String(i + 1).padStart(2, '0')}.${ext}` });
        }
      } catch {
        // Skip failed original downloads
      }
    }
  }

  // 2. Generate and add PDF
  onProgress?.({ phase: 'pdf', detail: 'Generating campaign PDF...' });
  const pdfBuffer = await generatePdfBuffer(campaign);
  archive.append(Buffer.from(pdfBuffer), { name: `${folderName}/Campaign-Full.pdf` });

  // 3. Finalize
  await archive.finalize();

  // Wait for writable to finish
  await new Promise<void>((resolve, reject) => {
    writable.on('finish', resolve);
    writable.on('error', reject);
  });

  return Buffer.concat(chunks);
}
```

**Step 2: Commit**

```bash
git add src/lib/export/bundle.ts
git commit -m "feat: add ZIP bundle assembly utility with batched photo processing"
```

---

### Task 15: Bundle API route

**Files:**
- Create: `src/app/api/export/bundle/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { CampaignKit } from '@/lib/types';
import { generateBundle } from '@/lib/export/bundle';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, shareToken } = body as { campaignId: string; shareToken?: string };

    if (!campaignId || !uuidRegex.test(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    let campaign: CampaignKit;

    if (shareToken) {
      // Public access via share token
      const supabase = await createClient();
      const { data: row, error } = await supabase
        .from('campaigns')
        .select('generated_ads')
        .eq('id', campaignId)
        .eq('share_token', shareToken)
        .gt('share_expires_at', new Date().toISOString())
        .single();
      if (error || !row) {
        return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 401 });
      }
      campaign = row.generated_ads as CampaignKit;
    } else {
      // Authenticated access
      const { user, supabase, error: authError } = await requireAuth();
      if (authError) return authError;
      const { data: row, error } = await supabase
        .from('campaigns')
        .select('generated_ads')
        .eq('id', campaignId)
        .eq('user_id', user!.id)
        .single();
      if (error || !row) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      campaign = row.generated_ads as CampaignKit;
    }

    const zipBuffer = await generateBundle(campaign);

    const address = campaign.listing?.address?.street?.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'Campaign';

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${address}.zip"`,
      },
    });
  } catch (error) {
    console.error('Bundle export error:', error);
    return NextResponse.json({ error: 'Bundle export failed' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/export/bundle/route.ts
git commit -m "feat: add ZIP bundle export API route with dual-auth"
```

---

### Task 16: "Download All" button in campaign shell

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx`

**Step 1: Add Download All handler and button**

Add state:
```typescript
const [bundling, setBundling] = useState(false);
```

Add handler (similar pattern to `handleExport`):
```typescript
async function handleDownloadAll() {
  setBundling(true);
  try {
    const res = await fetch('/api/export/bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign!.id }),
    });
    if (!res.ok) {
      toast.error('Bundle download failed — please try again.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const address = campaign!.listing?.address?.street || 'Campaign';
    a.download = `${address}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  } catch (err) {
    console.error('[campaign-shell] Bundle download failed:', err);
    toast.error('Bundle download failed — please try again.');
  } finally {
    setBundling(false);
  }
}
```

Add button alongside existing export buttons:
```tsx
<Button onClick={handleDownloadAll} disabled={bundling}>
  {bundling ? 'Preparing download...' : 'Download All'}
</Button>
```

**Step 2: Commit**

```bash
git add src/components/campaign/campaign-shell.tsx
git commit -m "feat: add Download All button to campaign shell"
```

---

## Phase 6: Shareable Preview Link

### Task 17: Share link API routes

**Files:**
- Create: `src/app/api/campaign/[id]/share/route.ts`

**Step 1: Create the share route with PUT (generate), DELETE (revoke)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { randomUUID } from 'crypto';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXPIRY_MAP: Record<string, number> = {
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const expiry = body.expiry || '7d';
    const expiryMs = EXPIRY_MAP[expiry] || EXPIRY_MAP['7d'];

    const shareToken = randomUUID();
    const shareExpiresAt = new Date(Date.now() + expiryMs).toISOString();

    const { error } = await supabase
      .from('campaigns')
      .update({ share_token: shareToken, share_expires_at: shareExpiresAt })
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${shareToken}`;

    return NextResponse.json({
      shareToken,
      shareUrl,
      expiresAt: shareExpiresAt,
    });
  } catch (error) {
    console.error('Share link error:', error);
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('campaigns')
      .update({ share_token: null, share_expires_at: null })
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke share link error:', error);
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/campaign/[id]/share/route.ts
git commit -m "feat: add share link API routes (generate, revoke)"
```

---

### Task 18: Share popover UI component

**Files:**
- Create: `src/components/campaign/share-popover.tsx`

**Step 1: Create the component**

Build a popover with:
- Share link display + copy button
- Expiry selector (48h / 7d / 30d) — dropdown or radio group
- "Revoke Link" button
- Expiry countdown display
- Confirmation dialog on regeneration ("This will invalidate the previous link")

Use existing UI components: `Button`, `Popover`/`PopoverContent`/`PopoverTrigger` from the project's UI library, `toast` from `sonner`.

State management:
- `shareToken`, `shareExpiresAt`, `loading` state
- Fetch current share status on mount (check if campaign already has a share token)
- `handleGenerate(expiry)`, `handleRevoke()`, `handleCopy()`

**Step 2: Commit**

```bash
git add src/components/campaign/share-popover.tsx
git commit -m "feat: add SharePopover component with expiry selector and revoke"
```

---

### Task 19: Public share page

**Files:**
- Create: `src/app/share/[token]/page.tsx`

**Step 1: Create the share page**

Server component that:
1. Takes `params.token`
2. Queries Supabase for campaign by `share_token` where `share_expires_at > NOW()`
3. If not found or expired → render expired message
4. If valid → render read-only campaign view

Layout:
- Mobile-first responsive design
- Property hero photo + details header
- Sections: Social, Paid Ads, Listings, Print, Strategy
- Each section shows all tone variants
- Copy button per text block
- "Copy All" button per section
- "Download All" button at top → calls bundle API with shareToken

Use `createClient` from `@/lib/supabase/server` (no auth required — public page).

For the expired state:
```tsx
<div className="flex flex-col items-center justify-center min-h-screen p-4">
  <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
  <p className="text-muted-foreground text-center">
    This campaign link has expired. Please contact the sender for a new link.
  </p>
</div>
```

**Step 2: Commit**

```bash
git add src/app/share/[token]/page.tsx
git commit -m "feat: add public share page with mobile-first layout and Copy All"
```

---

### Task 20: Wire Share button into campaign shell

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx`

**Step 1: Add SharePopover to the campaign header**

Import and add next to existing export buttons:
```tsx
import { SharePopover } from './share-popover';

// In the buttons area:
<SharePopover campaignId={campaign!.id} />
```

**Step 2: Commit**

```bash
git add src/components/campaign/campaign-shell.tsx
git commit -m "feat: add Share button to campaign header"
```

---

## Phase 7: Email to Client/Team

### Task 21: Email API route with Resend

**Files:**
- Create: `src/app/api/campaign/[id]/email/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { Resend } from 'resend';
import { CampaignKit } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const body = await request.json();
    const { to, message } = body as { to: string[]; message?: string };

    // Validate recipients
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'At least one recipient required' }, { status: 400 });
    }
    if (to.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 recipients per send' }, { status: 400 });
    }
    for (const email of to) {
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
      }
    }

    // Fetch campaign
    const { data: row, error } = await supabase
      .from('campaigns')
      .select('generated_ads, share_token, share_expires_at')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = row.generated_ads as CampaignKit;

    // Auto-generate share link if needed
    let shareToken = row.share_token;
    if (!shareToken || new Date(row.share_expires_at) < new Date()) {
      const crypto = await import('crypto');
      shareToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('campaigns')
        .update({ share_token: shareToken, share_expires_at: expiresAt })
        .eq('id', id);
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${shareToken}`;
    const address = campaign.listing?.address;
    const addressStr = address ? `${address.street}, ${address.city}, ${address.state} ${address.zip}` : 'Property Campaign';
    const platforms = campaign.selectedPlatforms?.join(', ') || 'Multiple platforms';

    // Send emails individually
    const results = await Promise.allSettled(
      to.map(email =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'campaigns@yourdomain.com',
          to: email.trim(),
          subject: `Campaign: ${addressStr}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>${addressStr}</h2>
              ${campaign.listing?.price ? `<p style="font-size: 18px; color: #16a34a;">$${campaign.listing.price.toLocaleString()}</p>` : ''}
              ${campaign.listing ? `<p>${campaign.listing.beds} bed · ${campaign.listing.baths} bath · ${campaign.listing.sqft?.toLocaleString()} sqft</p>` : ''}
              ${message ? `<p style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">${message}</p>` : ''}
              <p><strong>Platforms:</strong> ${platforms}</p>
              <div style="margin: 24px 0;">
                <a href="${shareUrl}" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Campaign</a>
              </div>
              <p style="font-size: 12px; color: #888;">This link expires in 7 days.</p>
            </div>
          `,
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }
}
```

**Step 2: Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.local**

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=campaigns@yourdomain.com
```

**Step 3: Commit**

```bash
git add src/app/api/campaign/[id]/email/route.ts
git commit -m "feat: add email campaign API route with Resend"
```

---

### Task 22: Email modal UI component

**Files:**
- Create: `src/components/campaign/email-modal.tsx`

**Step 1: Create the component**

Build a modal/dialog with:
- "Send to myself" quick button (reads user email from session/context)
- Email input supporting comma-separated addresses
- Recent recipients list (from localStorage key `recentEmailRecipients`, max 5)
- Optional message textarea
- Send button with loading state
- Success/error toast

State management:
- `emails` string state (comma-separated input)
- `message` string state
- `sending` boolean
- `recentRecipients` loaded from localStorage on mount
- On successful send, save new emails to localStorage

**Step 2: Wire into campaign shell**

Add "Email" button next to Share popover that opens the modal.

**Step 3: Commit**

```bash
git add src/components/campaign/email-modal.tsx src/components/campaign/campaign-shell.tsx
git commit -m "feat: add email campaign modal with Send to myself and recent recipients"
```

---

## Phase 8: Final Polish + Verification

### Task 23: Build verification and integration test

**Step 1: Run full build**

```bash
npm run build
```

Fix any TypeScript errors, import issues, or build failures.

**Step 2: Manual smoke test all features**

Test each feature on a campaign with photos:
- [ ] Character count badges appear on all cards
- [ ] MLS copy button produces sanitized text
- [ ] PDF export includes photos, all tones, correct state label
- [ ] CSV export includes all platforms
- [ ] Download Photo button works on social cards
- [ ] Download All produces a ZIP with correct structure
- [ ] Share link generates and copies
- [ ] Share page loads publicly, shows all content
- [ ] Share page expired state works
- [ ] Email sends successfully
- [ ] Revoke share link works

**Step 3: Test edge cases**

- Campaign with no photos → photo buttons hidden, ZIP has just PDF
- Campaign with only 1 platform selected → ZIP only includes that platform's photos
- Share link after 48h/7d/30d expiry selection
- Email with invalid addresses → validation error

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: export system redesign complete — photos, ZIP, share, email, PDF, char counts"
```

---

## Summary

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| 1: Foundation | 1-5 | Dependencies, configs, utilities, migration |
| 2: Quick Wins | 6-9 | Character counts, MLS sanitization, Montana fix |
| 3: Photo Export | 10-11 | Photo API route, per-card download button |
| 4: PDF Rewrite | 12-13 | Print-ready PDF, complete CSV |
| 5: ZIP Bundle | 14-16 | Bundle utility, API route, Download All button |
| 6: Share Link | 17-20 | Share API, popover, public page, campaign shell |
| 7: Email | 21-22 | Email API with Resend, modal UI |
| 8: Verification | 23 | Build check, smoke test, edge cases |

**Total: 23 tasks across 8 phases.**
