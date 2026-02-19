# Plan B: New Mockups + Editing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build dedicated mockup cards for Twitter/X, Zillow, Realtor.com, Homes.com/Trulia, and MLS. Add inline ad copy editing with persistence. Add per-platform "Redo with Tone" regeneration. Migrate legacy ad-card.tsx usage to new dedicated cards.

**Architecture:** New card components follow the established AdCardWrapper + PhoneFrame/BrowserFrame pattern. Inline editing uses a shared EditableText component with mode toggle (Preview/Edit) for mockup cards and click-to-edit for plain cards. Redo-with-tone requires a new lightweight API endpoint that regenerates a single platform's copy.

**Tech Stack:** Next.js 15, React 19, Supabase, shadcn/ui, Tailwind CSS, Lucide React, OpenAI, Jest

**Prerequisite:** Plan A must be completed first (quality wiring, error handling, persistence to Supabase).

---

## Task 1: Build twitter-card.tsx (20 min)

**Files:**
- Create: `src/components/campaign/twitter-card.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Test: `src/components/campaign/__tests__/twitter-card.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/twitter-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { TwitterCard } from '../twitter-card';

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

describe('TwitterCard', () => {
  test('renders Twitter/X post layout with content', () => {
    render(
      <TwitterCard
        content="Just listed! Beautiful 3BR home in Bozeman."
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/Just listed/)).toBeInTheDocument();
  });

  test('shows X logo and profile section', () => {
    render(
      <TwitterCard
        content="Check out this property!"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    // Display name derived from listing agent
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('renders 280-character badge', () => {
    render(
      <TwitterCard
        content="Short tweet"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/\/ 280 characters/)).toBeInTheDocument();
  });

  test('wraps content in AdCardWrapper', () => {
    const { container } = render(
      <TwitterCard
        content="Test tweet"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    // AdCardWrapper renders a bg-card div
    expect(container.querySelector('.bg-card')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/twitter-card.test.tsx --no-coverage`
Expected: FAIL — `twitter-card.tsx` does not exist yet.

**Step 3: Create twitter-card.tsx**

Create `src/components/campaign/twitter-card.tsx` following the InstagramCard pattern:

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { AdCardWrapper } from './ad-card-wrapper';
import { MockupImage } from './mockup-image';
import { PhoneFrame } from './phone-frame';
import { PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import { seededRandom } from '@/lib/utils/seeded-random';
import {
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  MoreHorizontal,
} from 'lucide-react';

interface TwitterCardProps {
  content: string; // Single string, not tone-keyed
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  listing?: ListingData;
}

export function TwitterCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  listing,
}: TwitterCardProps) {
  const characterCount = content.length;
  const isOverLimit = characterCount > 280;

  const seed = listing?.price ?? 450000;
  const replyCount = seededRandom(seed, 2, 12);
  const repostCount = seededRandom(seed + 1, 5, 30);
  const likeCount = seededRandom(seed + 2, 20, 150);
  const viewCount = seededRandom(seed + 3, 500, 5000);

  const displayName = listing?.listingAgent || 'Real Estate';
  const handle = '@' + (listing?.listingAgent?.toLowerCase().replace(/\s+/g, '') || 'realestate');

  const platformIcon = (
    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
      <span className="text-white text-[10px] font-bold">𝕏</span>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <AdCardWrapper
        platform="Twitter / X"
        platformIcon={platformIcon}
        dimensionLabel="Post"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={content}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        toneSwitcher={
          <Badge variant={isOverLimit ? 'destructive' : 'secondary'} className="text-xs">
            {characterCount} / 280 characters
          </Badge>
        }
      >
        <PhoneFrame>
          {/* Twitter/X post mockup */}
          <div className="bg-white text-[#0f1419]"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

            {/* X header bar */}
            <div className="flex items-center justify-center px-4 py-3 border-b border-slate-100">
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="text-black text-lg font-bold">𝕏</span>
              </div>
            </div>

            {/* Post */}
            <div className="px-4 py-3">
              {/* Profile row */}
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  {/* Name / handle / timestamp */}
                  <div className="flex items-center gap-1 text-[15px]">
                    <span className="font-bold truncate">{displayName}</span>
                    <span className="text-[#536471] truncate">{handle}</span>
                    <span className="text-[#536471]">·</span>
                    <span className="text-[#536471]">2h</span>
                    <MoreHorizontal className="h-4 w-4 text-[#536471] ml-auto flex-shrink-0" />
                  </div>

                  {/* Post text */}
                  <p className="text-[15px] leading-5 mt-0.5 whitespace-pre-wrap">
                    {content}
                  </p>

                  {/* Image */}
                  {photos.length > 0 && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200">
                      <MockupImage
                        src={photos[0]}
                        alt="Property photo"
                        aspectRatio="aspect-video"
                        sizes="(max-width: 448px) 100vw, 448px"
                      />
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="flex items-center justify-between mt-3 max-w-[425px] text-[#536471]">
                    <div className="flex items-center gap-1 group cursor-pointer">
                      <MessageCircle className="h-[18px] w-[18px]" />
                      <span className="text-[13px]">{replyCount}</span>
                    </div>
                    <div className="flex items-center gap-1 group cursor-pointer">
                      <Repeat2 className="h-[18px] w-[18px]" />
                      <span className="text-[13px]">{repostCount}</span>
                    </div>
                    <div className="flex items-center gap-1 group cursor-pointer">
                      <Heart className="h-[18px] w-[18px]" />
                      <span className="text-[13px]">{likeCount}</span>
                    </div>
                    <div className="flex items-center gap-1 group cursor-pointer">
                      <Bookmark className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex items-center gap-1 group cursor-pointer">
                      <Share className="h-[18px] w-[18px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PhoneFrame>
      </AdCardWrapper>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/twitter-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Register in campaign-tabs.tsx**

In `src/components/campaign/campaign-tabs.tsx`:
- Add import: `import { TwitterCard } from './twitter-card';`
- Replace the AdCard usage for twitter (line 134) with:

```typescript
{has(selected, 'twitter') && campaign.twitter && (
  <TwitterCard
    content={campaign.twitter}
    photos={photos}
    listing={listing}
    complianceResult={buildPlatformResult(agentResult, platformTexts, 'twitter')}
    onReplace={onReplace}
  />
)}
```

**Step 6: Run all campaign component tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 7: Commit**

```
git add src/components/campaign/twitter-card.tsx src/components/campaign/__tests__/twitter-card.test.tsx src/components/campaign/campaign-tabs.tsx
git commit -m "feat: build dedicated Twitter/X mockup card with phone frame"
```

---

## Task 2: Build zillow-card.tsx (20 min)

**Files:**
- Create: `src/components/campaign/zillow-card.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Test: `src/components/campaign/__tests__/zillow-card.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/zillow-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { ZillowCard } from '../zillow-card';

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
  broker: 'Montana Realty',
};

describe('ZillowCard', () => {
  test('renders Zillow branding header', () => {
    render(
      <ZillowCard
        content="Beautiful home with mountain views"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText('Zillow')).toBeInTheDocument();
  });

  test('shows price from listing data', () => {
    render(
      <ZillowCard
        content="Description text"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/450,000/)).toBeInTheDocument();
  });

  test('displays beds, baths, sqft badges', () => {
    render(
      <ZillowCard
        content="Description text"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/3 bd/i)).toBeInTheDocument();
    expect(screen.getByText(/2 ba/i)).toBeInTheDocument();
    expect(screen.getByText(/1,800/)).toBeInTheDocument();
  });

  test('renders the generated description content', () => {
    render(
      <ZillowCard
        content="Stunning mountain retreat with panoramic views"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/Stunning mountain retreat/)).toBeInTheDocument();
  });

  test('shows agent info in footer', () => {
    render(
      <ZillowCard
        content="Description"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/zillow-card.test.tsx --no-coverage`
Expected: FAIL — file does not exist.

**Step 3: Create zillow-card.tsx**

Create `src/components/campaign/zillow-card.tsx`:
- Use `AdCardWrapper` with Zillow blue (#006AFF) icon
- NO PhoneFrame — card-style listing detail mockup
- Layout structure:
  1. Header bar: Zillow blue background with "Z" logo and "Zillow" text
  2. Property photo via `MockupImage` with price overlay (`$${listing.price.toLocaleString()}` in bold white on dark gradient bottom)
  3. Stats bar: `{beds} bd | {baths} ba | {sqft.toLocaleString()} sqft` badges
  4. "Zestimate" placeholder badge (gray background, just the label text)
  5. Description section: the generated Zillow listing text in a clean serif or sans font
  6. Agent info footer: listing agent name, broker name, gray border-top separator
- Props: `content: string`, `photos: string[]`, `complianceResult?`, `qualityResult?`, `onReplace?`, `listing?`
- Badge showing character count
- Wrap in `<div className="w-full max-w-md mx-auto">` like other cards

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/zillow-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Register in campaign-tabs.tsx**

In `src/components/campaign/campaign-tabs.tsx`:
- Add import: `import { ZillowCard } from './zillow-card';`
- Replace line 170 (AdCard for zillow) with:

```typescript
{has(selected, 'zillow') && campaign.zillow && (
  <ZillowCard
    content={campaign.zillow}
    photos={photos}
    listing={listing}
    complianceResult={buildPlatformResult(agentResult, platformTexts, 'zillow')}
    onReplace={onReplace}
  />
)}
```

**Step 6: Run tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 7: Commit**

```
git add src/components/campaign/zillow-card.tsx src/components/campaign/__tests__/zillow-card.test.tsx src/components/campaign/campaign-tabs.tsx
git commit -m "feat: build dedicated Zillow listing mockup card"
```

---

## Task 3: Build realtor-card.tsx (20 min)

**Files:**
- Create: `src/components/campaign/realtor-card.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Test: `src/components/campaign/__tests__/realtor-card.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/realtor-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { RealtorCard } from '../realtor-card';

const mockListing = {
  url: 'https://example.com',
  address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
  price: 525000,
  beds: 4,
  baths: 3,
  sqft: 2400,
  propertyType: 'Single Family',
  features: ['Pool'],
  description: 'Great home',
  photos: ['/photo1.jpg'],
  listingAgent: 'John Doe',
  broker: 'Summit Realty',
};

describe('RealtorCard', () => {
  test('renders realtor.com branding', () => {
    render(
      <RealtorCard content="Lovely home" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/realtor\.com/i)).toBeInTheDocument();
  });

  test('shows listing price', () => {
    render(
      <RealtorCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/525,000/)).toBeInTheDocument();
  });

  test('displays property stats', () => {
    render(
      <RealtorCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/4 bd/i)).toBeInTheDocument();
    expect(screen.getByText(/3 ba/i)).toBeInTheDocument();
  });

  test('renders generated description', () => {
    render(
      <RealtorCard content="Spacious family home" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/Spacious family home/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/realtor-card.test.tsx --no-coverage`
Expected: FAIL

**Step 3: Create realtor-card.tsx**

Create `src/components/campaign/realtor-card.tsx`:
- Same listing-detail structure as zillow-card but with Realtor.com branding
- Header: red (#D92228) background with "realtor.com" text in white
- Platform icon: red circle with "r" letter
- Photo + price overlay (same pattern as Zillow)
- Stats bar: beds, baths, sqft
- Description section with the generated listing text
- Agent footer with listing agent and broker
- Props: `content: string`, `photos: string[]`, `complianceResult?`, `qualityResult?`, `onReplace?`, `listing?`

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/realtor-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Register in campaign-tabs.tsx**

In `src/components/campaign/campaign-tabs.tsx`:
- Add import: `import { RealtorCard } from './realtor-card';`
- Replace line 173 (AdCard for realtorCom) with:

```typescript
{has(selected, 'realtorCom') && campaign.realtorCom && (
  <RealtorCard
    content={campaign.realtorCom}
    photos={photos}
    listing={listing}
    complianceResult={buildPlatformResult(agentResult, platformTexts, 'realtorCom')}
    onReplace={onReplace}
  />
)}
```

**Step 6: Run tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 7: Commit**

```
git add src/components/campaign/realtor-card.tsx src/components/campaign/__tests__/realtor-card.test.tsx src/components/campaign/campaign-tabs.tsx
git commit -m "feat: build dedicated Realtor.com listing mockup card"
```

---

## Task 4: Build homes-trulia-card.tsx (20 min)

**Files:**
- Create: `src/components/campaign/homes-trulia-card.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Test: `src/components/campaign/__tests__/homes-trulia-card.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/homes-trulia-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { HomesTruliaCard } from '../homes-trulia-card';

const mockListing = {
  url: 'https://example.com',
  address: { street: '456 Oak Ave', city: 'Helena', state: 'MT', zip: '59601' },
  price: 375000,
  beds: 3,
  baths: 2,
  sqft: 1600,
  propertyType: 'Townhouse',
  features: ['Fireplace'],
  description: 'Cozy townhouse',
  photos: ['/photo1.jpg'],
  listingAgent: 'Sarah Lee',
  broker: 'Big Sky Realty',
};

describe('HomesTruliaCard', () => {
  test('renders Homes.com branding with teal color', () => {
    render(
      <HomesTruliaCard content="Charming townhouse" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/Homes\.com/i)).toBeInTheDocument();
  });

  test('shows listing price', () => {
    render(
      <HomesTruliaCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/375,000/)).toBeInTheDocument();
  });

  test('displays property stats', () => {
    render(
      <HomesTruliaCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/3 bd/i)).toBeInTheDocument();
    expect(screen.getByText(/2 ba/i)).toBeInTheDocument();
  });

  test('renders generated description', () => {
    render(
      <HomesTruliaCard content="Charming townhouse near downtown" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/Charming townhouse near downtown/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/homes-trulia-card.test.tsx --no-coverage`
Expected: FAIL

**Step 3: Create homes-trulia-card.tsx**

Create `src/components/campaign/homes-trulia-card.tsx`:
- Teal (#00A98F) branding for Homes.com
- Header: teal background with "Homes.com" text
- Platform icon: teal circle with "H" letter
- Same listing-detail structure as Zillow/Realtor cards: photo, price overlay, stats bar, description, agent footer
- Props: `content: string`, `photos: string[]`, `complianceResult?`, `qualityResult?`, `onReplace?`, `listing?`

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/homes-trulia-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Register in campaign-tabs.tsx**

In `src/components/campaign/campaign-tabs.tsx`:
- Add import: `import { HomesTruliaCard } from './homes-trulia-card';`
- Replace line 176 (AdCard for homesComTrulia) with:

```typescript
{has(selected, 'homesComTrulia') && campaign.homesComTrulia && (
  <HomesTruliaCard
    content={campaign.homesComTrulia}
    photos={photos}
    listing={listing}
    complianceResult={buildPlatformResult(agentResult, platformTexts, 'homesComTrulia')}
    onReplace={onReplace}
  />
)}
```

**Step 6: Run tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 7: Commit**

```
git add src/components/campaign/homes-trulia-card.tsx src/components/campaign/__tests__/homes-trulia-card.test.tsx src/components/campaign/campaign-tabs.tsx
git commit -m "feat: build dedicated Homes.com/Trulia listing mockup card"
```

---

## Task 5: Rebuild mls-card.tsx as MLS mockup (25 min)

**Files:**
- Modify: `src/components/campaign/mls-card.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Test: `src/components/campaign/__tests__/mls-card.test.tsx`

**Step 1: Write the failing test**

Create or update `src/components/campaign/__tests__/mls-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { MlsCard } from '../mls-card';

const mockListing = {
  url: 'https://example.com',
  address: { street: '789 Pine Rd', city: 'Missoula', state: 'MT', zip: '59801' },
  price: 620000,
  beds: 4,
  baths: 3,
  sqft: 2800,
  propertyType: 'Single Family',
  features: ['Mountain Views'],
  description: 'Mountain retreat',
  photos: ['/photo1.jpg'],
  listingAgent: 'Mike Ross',
  broker: 'Western Realty',
  mlsNumber: 'MLS-2026-1234',
  lotSize: '0.5 acres',
  yearBuilt: 2018,
};

describe('MlsCard', () => {
  test('renders MLS system header', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getByText(/MLS Listing Detail/i)).toBeInTheDocument();
  });

  test('shows MLS number badge', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getByText(/MLS-2026-1234/)).toBeInTheDocument();
  });

  test('renders structured property fields', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/620,000/)).toBeInTheDocument();
    expect(screen.getByText(/789 Pine Rd/)).toBeInTheDocument();
    expect(screen.getByText(/Single Family/)).toBeInTheDocument();
  });

  test('renders Public Remarks section with description in monospace', () => {
    render(
      <MlsCard description="Beautiful mountain retreat with panoramic views" listing={mockListing} />
    );
    expect(screen.getByText(/Public Remarks/i)).toBeInTheDocument();
    expect(screen.getByText(/Beautiful mountain retreat/)).toBeInTheDocument();
  });

  test('shows character count badge', () => {
    const desc = 'A'.repeat(500);
    render(
      <MlsCard description={desc} listing={mockListing} />
    );
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  test('wraps in AdCardWrapper', () => {
    const { container } = render(
      <MlsCard description="Test" listing={mockListing} />
    );
    expect(container.querySelector('.bg-card')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/mls-card.test.tsx --no-coverage`
Expected: FAIL — current MlsCard does not render MLS system mockup layout.

**Step 3: Rewrite mls-card.tsx**

Rewrite `src/components/campaign/mls-card.tsx` completely:
- Migrate to `AdCardWrapper` pattern
- Add `qualityResult?` and `listing?` props to `MlsCardProps`
- Updated props: `description: string`, `complianceResult?`, `qualityResult?`, `onReplace?`, `listing?`
- MLS system mockup layout:
  1. Header bar: neutral gray (#374151) background with "MLS Listing Detail" title, MLS number badge if available from `listing.mlsNumber`
  2. Structured grid (2-column key-value pairs):
     - Status: "Active" (green badge)
     - List Price: `$${listing.price.toLocaleString()}`
     - Address: `${listing.address.street}, ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`
     - Property Type: `${listing.propertyType}`
     - Beds/Baths/SqFt: `${listing.beds}BR / ${listing.baths}BA / ${listing.sqft.toLocaleString()} SF`
     - Lot Size: `${listing.lotSize || 'N/A'}`
     - Year Built: `${listing.yearBuilt || 'N/A'}`
  3. Photo section with `MockupImage`
  4. "Public Remarks" section: description rendered in `font-mono text-sm` (how agents actually see MLS descriptions)
  5. Agent/broker attribution: listing agent name, broker
  6. Character count badge (reference 1000-4000 char range typical for MLS)
- Platform icon: neutral gray circle with "MLS" text

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/mls-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Update campaign-tabs.tsx for new MlsCard props**

In `src/components/campaign/campaign-tabs.tsx`, update the MLS section (line 184) to pass `listing`:

```typescript
{has(selected, 'mlsDescription') && campaign.mlsDescription && (
  <MlsCard
    description={campaign.mlsDescription}
    listing={listing}
    complianceResult={buildPlatformResult(agentResult, platformTexts, 'mlsDescription')}
    onReplace={onReplace}
  />
)}
```

**Step 6: Run tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 7: Commit**

```
git add src/components/campaign/mls-card.tsx src/components/campaign/__tests__/mls-card.test.tsx src/components/campaign/campaign-tabs.tsx
git commit -m "feat: rebuild MLS card as structured MLS system mockup with AdCardWrapper"
```

---

## Task 6: Delete legacy ad-card.tsx usage (10 min)

**Files:**
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Keep (do not delete): `src/components/campaign/ad-card.tsx`

**Step 1: Verify all platforms have dedicated cards**

Confirm the mapping after Tasks 1-5:
- Instagram: `InstagramCard` (existing)
- Facebook: `FacebookCard` (existing)
- Twitter: `TwitterCard` (Task 1)
- Google Ads: `GoogleAdsCard` (existing)
- Meta Ad: `MetaAdCard` (existing)
- Print: `PrintAdCard` (existing)
- Postcard: `PostcardCard` (existing)
- Zillow: `ZillowCard` (Task 2)
- Realtor.com: `RealtorCard` (Task 3)
- Homes.com/Trulia: `HomesTruliaCard` (Task 4)
- MLS: `MlsCard` (Task 5, rebuilt)

**Step 2: Remove AdCard import from campaign-tabs.tsx**

In `src/components/campaign/campaign-tabs.tsx`, remove line 6:

```typescript
// DELETE: import { AdCard } from './ad-card';
```

**Step 3: Search for any remaining AdCard usage**

Run: `npx grep -rn "AdCard" src/components/campaign/campaign-tabs.tsx`
Expected: Zero matches after Tasks 1-5 replaced all usages.

**Step 4: Search across codebase for other AdCard imports**

Run: `npx grep -rn "from.*ad-card" src/ --include="*.tsx" --include="*.ts"`

If other files import AdCard, leave `ad-card.tsx` in place for backward compatibility. If no other files import it, optionally delete it (low priority).

**Step 5: Run build to verify no broken imports**

Run: `npx next build`
Expected: Build succeeds with no import errors.

**Step 6: Commit**

```
git add src/components/campaign/campaign-tabs.tsx
git commit -m "refactor: remove legacy AdCard usage from campaign-tabs, all platforms have dedicated cards"
```

---

## Task 7: Build EditableText component (20 min)

**Files:**
- Create: `src/components/campaign/editable-text.tsx`
- Test: `src/components/campaign/__tests__/editable-text.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/editable-text.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableText } from '../editable-text';

describe('EditableText', () => {
  test('renders text in view mode by default', () => {
    render(<EditableText value="Hello world" onChange={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  test('shows pencil icon on hover', () => {
    const { container } = render(
      <EditableText value="Hover me" onChange={jest.fn()} onSave={jest.fn()} />
    );
    // Pencil icon should be present but hidden until hover (opacity-0 group-hover:opacity-100)
    const pencilIcon = container.querySelector('[data-testid="edit-pencil"]');
    expect(pencilIcon).toBeInTheDocument();
  });

  test('switches to edit mode on click', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Click me" onChange={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByText('Click me'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('shows Save and Cancel buttons in edit mode', async () => {
    const user = userEvent.setup();
    render(<EditableText value="Edit me" onChange={jest.fn()} onSave={jest.fn()} />);
    await user.click(screen.getByText('Edit me'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls onSave with new value when Save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onChange = jest.fn();
    render(<EditableText value="Original" onChange={onChange} onSave={onSave} />);
    await user.click(screen.getByText('Original'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Updated text');
    await user.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith('Updated text');
  });

  test('reverts on Cancel', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<EditableText value="Original" onChange={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByText('Original'));
    await user.click(screen.getByText('Cancel'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  test('shows character count when maxLength is provided', async () => {
    const user = userEvent.setup();
    render(
      <EditableText value="Hello" onChange={jest.fn()} onSave={jest.fn()} maxLength={280} />
    );
    await user.click(screen.getByText('Hello'));
    expect(screen.getByText(/5 \/ 280/)).toBeInTheDocument();
  });

  test('handles Escape to cancel', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<EditableText value="Press Escape" onChange={jest.fn()} onSave={onSave} />);
    await user.click(screen.getByText('Press Escape'));
    await user.keyboard('{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Press Escape')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/editable-text.test.tsx --no-coverage`
Expected: FAIL

**Step 3: Create editable-text.tsx**

Create `src/components/campaign/editable-text.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}

export function EditableText({
  value,
  onChange,
  onSave,
  placeholder,
  multiline = true,
  maxLength,
  className,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  // Sync external value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  if (editing) {
    return (
      <div className={className}>
        {multiline ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full min-h-[100px] p-2 text-sm rounded border border-border bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-2 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
          {maxLength && (
            <span className="text-xs text-muted-foreground">
              {draft.length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative cursor-pointer ${className || ''}`}
      onClick={() => setEditing(true)}
    >
      <span>{value || placeholder}</span>
      <Pencil
        data-testid="edit-pencil"
        className="inline-block ml-1.5 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
      />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/editable-text.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```
git add src/components/campaign/editable-text.tsx src/components/campaign/__tests__/editable-text.test.tsx
git commit -m "feat: build EditableText component with view/edit mode toggle"
```

---

## Task 8: Add inline editing to InstagramCard (15 min)

**Files:**
- Modify: `src/components/campaign/instagram-card.tsx`
- Test: `src/components/campaign/__tests__/instagram-card.test.tsx` (add tests)

**Step 1: Write the failing test**

Add to `src/components/campaign/__tests__/instagram-card.test.tsx` (create if needed):

```typescript
test('renders EditableText for caption when onEditText is provided', async () => {
  const user = userEvent.setup();
  const onEditText = jest.fn();
  render(
    <InstagramCard
      content={{ casual: 'My caption' }}
      photos={['/photo1.jpg']}
      onEditText={onEditText}
    />
  );
  // Caption text should be clickable for editing
  const caption = screen.getByText(/My caption/);
  await user.click(caption);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/instagram-card.test.tsx --no-coverage`
Expected: FAIL — `onEditText` prop does not exist yet.

**Step 3: Add onEditText prop and EditableText to InstagramCard**

In `src/components/campaign/instagram-card.tsx`:
- Add to `InstagramCardProps`: `onEditText?: (platform: string, field: string, newValue: string) => void;`
- Import `EditableText` from `./editable-text`
- In the caption section (around line 164-168), wrap the caption text in `EditableText`:
  - When `onEditText` is provided, render `EditableText` with `value={currentCaption}`, `maxLength={2200}`
  - `onSave` calls `onEditText('instagram', selectedTone, newValue)`
  - When `onEditText` is not provided, render the existing truncated caption (backward compat)

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/instagram-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Run all campaign tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 6: Commit**

```
git add src/components/campaign/instagram-card.tsx src/components/campaign/__tests__/instagram-card.test.tsx
git commit -m "feat: add inline editing to InstagramCard caption"
```

---

## Task 9: Add inline editing to FacebookCard (15 min)

**Files:**
- Modify: `src/components/campaign/facebook-card.tsx`
- Test: `src/components/campaign/__tests__/facebook-card.test.tsx` (add tests)

**Step 1: Write the failing test**

Add to the Facebook card test file:

```typescript
test('renders EditableText for post text when onEditText is provided', async () => {
  const user = userEvent.setup();
  const onEditText = jest.fn();
  render(
    <FacebookCard
      content={{ casual: 'My post' }}
      photos={['/photo1.jpg']}
      onEditText={onEditText}
    />
  );
  const postText = screen.getByText(/My post/);
  await user.click(postText);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/facebook-card.test.tsx --no-coverage`
Expected: FAIL

**Step 3: Add onEditText prop and EditableText to FacebookCard**

Same pattern as InstagramCard:
- Add `onEditText?: (platform: string, field: string, newValue: string) => void;` to props
- Import `EditableText`
- Wrap post text in `EditableText` when `onEditText` is provided
- `onSave` calls `onEditText('facebook', selectedTone, newValue)`

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/facebook-card.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```
git add src/components/campaign/facebook-card.tsx src/components/campaign/__tests__/facebook-card.test.tsx
git commit -m "feat: add inline editing to FacebookCard post text"
```

---

## Task 10: Add inline editing to all remaining cards (20 min)

**Files:**
- Modify: `src/components/campaign/google-ads-card.tsx`
- Modify: `src/components/campaign/meta-ad-card.tsx`
- Modify: `src/components/campaign/print-ad-card.tsx`
- Modify: `src/components/campaign/postcard-card.tsx`
- Modify: `src/components/campaign/twitter-card.tsx`
- Modify: `src/components/campaign/zillow-card.tsx`
- Modify: `src/components/campaign/realtor-card.tsx`
- Modify: `src/components/campaign/homes-trulia-card.tsx`
- Modify: `src/components/campaign/mls-card.tsx`

**Step 1: Add onEditText to each card**

For each card, add `onEditText?: (platform: string, field: string, newValue: string) => void;` to the props interface and import `EditableText`.

**Step 2: Wrap editable fields in EditableText**

Per-card editable fields:

| Card | Editable Fields | Platform ID for onEditText |
|------|----------------|---------------------------|
| GoogleAdsCard | headline, description (per ad) | `googleAds[{idx}]`, field: `headline` or `description` |
| MetaAdCard | primaryText, headline, description | `metaAd`, field: `primaryText` / `headline` / `description` |
| PrintAdCard | headline, body, cta | `magazineFullPage` or `magazineHalfPage`, field uses dot notation |
| PostcardCard | front headline, front cta, back text | `postcard`, field uses dot notation |
| TwitterCard | post text | `twitter`, field: `text` |
| ZillowCard | listing description | `zillow`, field: `description` |
| RealtorCard | listing description | `realtorCom`, field: `description` |
| HomesTruliaCard | listing description | `homesComTrulia`, field: `description` |
| MlsCard | description text | `mlsDescription`, field: `description` |

**Step 3: For each card, only show EditableText when onEditText is provided**

This preserves backward compatibility. When `onEditText` is undefined, render the existing read-only text.

**Step 4: Write a quick integration test**

Add one test per card verifying the edit pencil appears when `onEditText` is provided. Can be a single test file `src/components/campaign/__tests__/editable-integration.test.tsx` with parameterized tests.

**Step 5: Run all campaign tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 6: Commit**

```
git add src/components/campaign/google-ads-card.tsx src/components/campaign/meta-ad-card.tsx src/components/campaign/print-ad-card.tsx src/components/campaign/postcard-card.tsx src/components/campaign/twitter-card.tsx src/components/campaign/zillow-card.tsx src/components/campaign/realtor-card.tsx src/components/campaign/homes-trulia-card.tsx src/components/campaign/mls-card.tsx src/components/campaign/__tests__/editable-integration.test.tsx
git commit -m "feat: add inline editing support to all remaining campaign cards"
```

---

## Task 11: Build handleEditText in campaign-shell.tsx (15 min)

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`

**Step 1: Add handleEditText handler to campaign-shell.tsx**

In `src/components/campaign/campaign-shell.tsx`, add a new `useCallback` handler after `handleReplace` (around line 149):

```typescript
const handleEditText = useCallback(
  async (platform: string, field: string, newValue: string) => {
    if (!campaign) return;

    const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

    // Simple string platforms: replace the whole field
    const simpleStringFields: Record<string, keyof CampaignKit> = {
      twitter: 'twitter',
      zillow: 'zillow',
      realtorCom: 'realtorCom',
      homesComTrulia: 'homesComTrulia',
      mlsDescription: 'mlsDescription',
    };

    if (simpleStringFields[platform]) {
      (updated as unknown as Record<string, unknown>)[platform] = newValue;
    }

    // Tone-keyed platforms: field = tone name
    if (platform === 'instagram' || platform === 'facebook') {
      const platformObj = updated[platform] as Record<string, string> | undefined;
      if (platformObj) {
        platformObj[field] = newValue;
      }
    }

    // metaAd: field = primaryText | headline | description
    if (platform === 'metaAd' && updated.metaAd) {
      (updated.metaAd as unknown as Record<string, string>)[field] = newValue;
    }

    // Google Ads: platform = googleAds[idx], field = headline | description
    const googleMatch = platform.match(/googleAds\[(\d+)\]/);
    if (googleMatch && updated.googleAds) {
      const idx = parseInt(googleMatch[1]);
      (updated.googleAds[idx] as unknown as Record<string, string>)[field] = newValue;
    }

    // Print and postcard: use dot-notation path from the field
    // (handled by the card passing the full path as field)

    // Track user edits
    if (!updated.userEdited) {
      (updated as unknown as Record<string, unknown>).userEdited = {};
    }
    (updated as unknown as Record<string, Record<string, boolean>>).userEdited[`${platform}.${field}`] = true;

    // Re-run compliance on modified campaign
    try {
      const res = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: updated }),
      });
      if (res.ok) {
        const result: ComplianceAgentResult = await res.json();
        updated.complianceResult = result;
      }
    } catch (err) {
      console.error('[campaign-shell] Compliance re-check failed after edit:', err);
    }

    // Persist to Supabase
    try {
      const supabase = createClient();
      await supabase
        .from('campaigns')
        .update({ generated_ads: updated })
        .eq('id', updated.id);
    } catch (err) {
      console.error('[campaign-shell] Failed to persist edit to Supabase:', err);
    }

    setCampaign(updated);
    sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
  },
  [campaign]
);
```

**Step 2: Thread onEditText through CampaignTabs**

In `src/components/campaign/campaign-tabs.tsx`:
- Add `onEditText?: (platform: string, field: string, newValue: string) => void;` to `CampaignTabsProps`
- Pass `onEditText` to every card component that supports it

In `src/components/campaign/campaign-shell.tsx`:
- Pass `onEditText={handleEditText}` to the `<CampaignTabs>` component (line 425)

**Step 3: Run tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 4: Commit**

```
git add src/components/campaign/campaign-shell.tsx src/components/campaign/campaign-tabs.tsx
git commit -m "feat: build handleEditText with Supabase persistence and compliance re-check"
```

---

## Task 12: Build regenerate-platform API endpoint (20 min)

**Files:**
- Create: `src/app/api/regenerate-platform/route.ts`
- Test: `src/app/api/regenerate-platform/__tests__/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/regenerate-platform/__tests__/route.test.ts`:

```typescript
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: () => ({ data: { user: { id: 'user-1' } }, error: null }) },
  }),
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '"Regenerated copy for this platform"' } }],
        }),
      },
    },
  }));
});

describe('POST /api/regenerate-platform', () => {
  test('returns regenerated copy for a single platform', async () => {
    const req = new NextRequest('http://localhost/api/regenerate-platform', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'test-campaign',
        platform: 'twitter',
        tone: 'professional',
        listingData: {
          address: { street: '123 Main', city: 'Bozeman', state: 'MT', zip: '59715' },
          price: 450000,
          beds: 3,
          baths: 2,
          sqft: 1800,
          propertyType: 'Single Family',
          features: ['Garage'],
          description: 'Nice home',
          photos: [],
          url: 'https://example.com',
        },
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.copy).toBeDefined();
    expect(typeof data.copy).toBe('string');
  });

  test('returns 400 for missing platform', async () => {
    const req = new NextRequest('http://localhost/api/regenerate-platform', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'test',
        tone: 'casual',
        listingData: {},
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/app/api/regenerate-platform/__tests__/route.test.ts --no-coverage`
Expected: FAIL — endpoint does not exist.

**Step 3: Create the endpoint**

Create `src/app/api/regenerate-platform/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase/server';
import { ListingData, PlatformId } from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RegeneratePlatformBody {
  campaignId: string;
  platform: PlatformId;
  tone?: string;
  listingData: ListingData;
  currentCopy?: string;
}

// Platform-specific generation prompts
const platformPrompts: Record<string, (listing: ListingData, tone?: string) => string> = {
  twitter: (listing, tone) =>
    `Write a Twitter/X post (max 280 chars) for this property listing. Tone: ${tone || 'professional'}.\n\nProperty: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}. $${listing.price?.toLocaleString()}. ${listing.beds}BR/${listing.baths}BA, ${listing.sqft?.toLocaleString()} sqft.\n\n${listing.description}\n\nReturn ONLY the tweet text, no quotes.`,

  zillow: (listing, tone) =>
    `Write a Zillow listing description for this property. Tone: ${tone || 'professional'}.\n\nProperty: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}. $${listing.price?.toLocaleString()}. ${listing.beds}BR/${listing.baths}BA, ${listing.sqft?.toLocaleString()} sqft. ${listing.propertyType}.\n\n${listing.description}\n\nFeatures: ${listing.features?.join(', ')}\n\nReturn ONLY the description text.`,

  realtorCom: (listing, tone) =>
    `Write a Realtor.com listing description for this property. Tone: ${tone || 'professional'}.\n\nProperty: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}. $${listing.price?.toLocaleString()}. ${listing.beds}BR/${listing.baths}BA, ${listing.sqft?.toLocaleString()} sqft. ${listing.propertyType}.\n\n${listing.description}\n\nFeatures: ${listing.features?.join(', ')}\n\nReturn ONLY the description text.`,

  homesComTrulia: (listing, tone) =>
    `Write a Homes.com/Trulia listing description for this property. Tone: ${tone || 'professional'}.\n\nProperty: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}. $${listing.price?.toLocaleString()}. ${listing.beds}BR/${listing.baths}BA, ${listing.sqft?.toLocaleString()} sqft. ${listing.propertyType}.\n\n${listing.description}\n\nFeatures: ${listing.features?.join(', ')}\n\nReturn ONLY the description text.`,

  mlsDescription: (listing, tone) =>
    `Write an MLS listing description (public remarks) for this property. Keep it professional and factual. Max 1000 characters.\n\nProperty: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}. $${listing.price?.toLocaleString()}. ${listing.beds}BR/${listing.baths}BA, ${listing.sqft?.toLocaleString()} sqft. ${listing.propertyType}.\n\n${listing.description}\n\nFeatures: ${listing.features?.join(', ')}\n\nReturn ONLY the description text.`,
};

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: RegeneratePlatformBody = await req.json();

  if (!body.platform) {
    return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
  }

  if (!body.listingData) {
    return NextResponse.json({ error: 'Missing listing data' }, { status: 400 });
  }

  const promptBuilder = platformPrompts[body.platform];
  if (!promptBuilder) {
    return NextResponse.json(
      { error: `Unsupported platform: ${body.platform}` },
      { status: 400 }
    );
  }

  try {
    const prompt = promptBuilder(body.listingData, body.tone);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a real estate marketing expert. Generate compelling, compliant ad copy. Never use language that violates the Fair Housing Act. Return only the requested text, no quotes or formatting.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_completion_tokens: 1000,
    });

    const copy = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ copy, platform: body.platform });
  } catch (error) {
    console.error('[regenerate-platform] Generation failed:', error);
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/app/api/regenerate-platform/__tests__/route.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```
git add src/app/api/regenerate-platform/route.ts src/app/api/regenerate-platform/__tests__/route.test.ts
git commit -m "feat: build regenerate-platform API endpoint for single-platform copy regeneration"
```

---

## Task 13: Add "Redo with Tone" button to each card (15 min)

**Files:**
- Modify: `src/components/campaign/ad-card-wrapper.tsx`
- Modify: `src/components/campaign/campaign-shell.tsx`
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Test: `src/components/campaign/__tests__/redo-with-tone.test.tsx`

**Step 1: Write the failing test**

Create `src/components/campaign/__tests__/redo-with-tone.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdCardWrapper } from '../ad-card-wrapper';

describe('AdCardWrapper Redo with Tone', () => {
  test('renders Regenerate button when onRegenerate is provided', () => {
    render(
      <AdCardWrapper
        platform="Test"
        platformIcon={<div />}
        dimensionLabel="Test"
        onRegenerate={jest.fn()}
      >
        <div>Content</div>
      </AdCardWrapper>
    );
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  test('shows tone selector when Regenerate is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AdCardWrapper
        platform="Test"
        platformIcon={<div />}
        dimensionLabel="Test"
        onRegenerate={jest.fn()}
        toneOptions={['professional', 'casual', 'luxury']}
      >
        <div>Content</div>
      </AdCardWrapper>
    );
    await user.click(screen.getByText('Regenerate'));
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Casual')).toBeInTheDocument();
    expect(screen.getByText('Luxury')).toBeInTheDocument();
  });

  test('calls onRegenerate with selected tone', async () => {
    const user = userEvent.setup();
    const onRegenerate = jest.fn();
    render(
      <AdCardWrapper
        platform="Test"
        platformIcon={<div />}
        dimensionLabel="Test"
        onRegenerate={onRegenerate}
        toneOptions={['professional', 'casual']}
      >
        <div>Content</div>
      </AdCardWrapper>
    );
    await user.click(screen.getByText('Regenerate'));
    await user.click(screen.getByText('Casual'));
    expect(onRegenerate).toHaveBeenCalledWith('casual');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/campaign/__tests__/redo-with-tone.test.tsx --no-coverage`
Expected: FAIL — `onRegenerate` and `toneOptions` props do not exist on AdCardWrapper.

**Step 3: Add Regenerate button to AdCardWrapper**

In `src/components/campaign/ad-card-wrapper.tsx`:
- Add to `AdCardWrapperProps`:
  - `onRegenerate?: (tone: string) => void;`
  - `toneOptions?: string[];`
  - `isRegenerating?: boolean;`
- Add state: `const [showToneSelector, setShowToneSelector] = useState(false);`
- In the header area (next to the copy button and compliance badge), add a Regenerate button:
  - When clicked, toggle `showToneSelector`
  - When a tone is selected, call `onRegenerate(tone)` and close the selector
  - Show a loading spinner when `isRegenerating` is true
  - Use `RefreshCw` icon from lucide-react

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/campaign/__tests__/redo-with-tone.test.tsx --no-coverage`
Expected: PASS

**Step 5: Build handleRegenerate in campaign-shell.tsx**

In `src/components/campaign/campaign-shell.tsx`, add a new handler:

```typescript
const handleRegenerate = useCallback(
  async (platform: string, tone: string) => {
    if (!campaign) return;

    // Store previous copy for undo
    const previousCopy = JSON.parse(JSON.stringify(campaign));
    setUndoState({ campaign: previousCopy, platform, expiresAt: Date.now() + 30000 });

    setRegeneratingPlatform(platform);

    try {
      const res = await fetch('/api/regenerate-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          platform,
          tone,
          listingData: campaign.listing,
        }),
      });

      if (!res.ok) throw new Error('Regeneration failed');

      const { copy } = await res.json();
      const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

      // Apply new copy to the correct platform field
      const simpleFields = ['twitter', 'zillow', 'realtorCom', 'homesComTrulia', 'mlsDescription'];
      if (simpleFields.includes(platform)) {
        (updated as unknown as Record<string, unknown>)[platform] = copy;
      }

      // Re-run compliance
      try {
        const compRes = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign: updated }),
        });
        if (compRes.ok) {
          updated.complianceResult = await compRes.json();
        }
      } catch {}

      // Persist to Supabase
      try {
        const supabase = createClient();
        await supabase.from('campaigns').update({ generated_ads: updated }).eq('id', updated.id);
      } catch {}

      setCampaign(updated);
      sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
    } catch (err) {
      console.error('[campaign-shell] Regeneration failed:', err);
    } finally {
      setRegeneratingPlatform(null);
    }
  },
  [campaign]
);
```

Add state for undo and regenerating:

```typescript
const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);
const [undoState, setUndoState] = useState<{
  campaign: CampaignKit;
  platform: string;
  expiresAt: number;
} | null>(null);
```

**Step 6: Thread onRegenerate through CampaignTabs to cards**

In `src/components/campaign/campaign-tabs.tsx`:
- Add `onRegenerate?: (platform: string, tone: string) => void;` and `regeneratingPlatform?: string | null;` to `CampaignTabsProps`
- Pass through to each card's `AdCardWrapper` via the appropriate props

In each card that wraps `AdCardWrapper`, pass:
- `onRegenerate={(tone) => onRegenerate?.(platformId, tone)}`
- `isRegenerating={regeneratingPlatform === platformId}`
- `toneOptions={['professional', 'casual', 'luxury', 'friendly']}`

**Step 7: Add 30-second undo toast/banner (optional enhancement)**

In `campaign-shell.tsx`, render a small undo banner when `undoState` is set and not expired:

```typescript
{undoState && Date.now() < undoState.expiresAt && (
  <div className="fixed bottom-4 right-4 bg-card border rounded-lg p-3 shadow-lg flex items-center gap-3">
    <span className="text-sm">Regenerated {undoState.platform}</span>
    <Button size="sm" variant="outline" onClick={() => {
      setCampaign(undoState.campaign);
      setUndoState(null);
    }}>
      Undo
    </Button>
  </div>
)}
```

**Step 8: Run all tests**

Run: `npx jest src/components/campaign/ --no-coverage`
Expected: All pass.

**Step 9: Run build**

Run: `npx next build`
Expected: Build succeeds.

**Step 10: Commit**

```
git add src/components/campaign/ad-card-wrapper.tsx src/components/campaign/campaign-shell.tsx src/components/campaign/campaign-tabs.tsx src/components/campaign/__tests__/redo-with-tone.test.tsx
git commit -m "feat: add Redo with Tone regeneration button to all campaign cards"
```

---

## Summary

| Task | What | Time | Creates/Modifies |
|------|------|------|------------------|
| 1 | Twitter/X card mockup | 20 min | `twitter-card.tsx`, `campaign-tabs.tsx` |
| 2 | Zillow card mockup | 20 min | `zillow-card.tsx`, `campaign-tabs.tsx` |
| 3 | Realtor.com card mockup | 20 min | `realtor-card.tsx`, `campaign-tabs.tsx` |
| 4 | Homes.com/Trulia card mockup | 20 min | `homes-trulia-card.tsx`, `campaign-tabs.tsx` |
| 5 | MLS card rebuild | 25 min | `mls-card.tsx`, `campaign-tabs.tsx` |
| 6 | Remove legacy AdCard usage | 10 min | `campaign-tabs.tsx` |
| 7 | EditableText component | 20 min | `editable-text.tsx` |
| 8 | Inline editing: Instagram | 15 min | `instagram-card.tsx` |
| 9 | Inline editing: Facebook | 15 min | `facebook-card.tsx` |
| 10 | Inline editing: all remaining | 20 min | 9 card files |
| 11 | handleEditText handler | 15 min | `campaign-shell.tsx`, `campaign-tabs.tsx` |
| 12 | Regenerate platform API | 20 min | `api/regenerate-platform/route.ts` |
| 13 | Redo with Tone button | 15 min | `ad-card-wrapper.tsx`, `campaign-shell.tsx`, `campaign-tabs.tsx` |

**Total estimated time:** ~4 hours

**Parallel opportunities:** Tasks 1-5 (new mockup cards) can be built in parallel by separate agents since they each create independent files. Task 6 depends on all of 1-5. Tasks 7-10 (editing) can start after Task 7. Tasks 12-13 can be worked in parallel with Tasks 8-11.

**Suggested agent split (3 agents):**
- **Agent A:** Tasks 1, 2, 3 (Twitter, Zillow, Realtor cards)
- **Agent B:** Tasks 4, 5, 6 (Homes/Trulia, MLS rebuild, legacy cleanup)
- **Agent C:** Tasks 7, 8, 9 (EditableText, Instagram edit, Facebook edit)
- **Then:** Tasks 10, 11, 12, 13 sequentially or split across agents

**File ownership boundaries (for agent teams):**
- `campaign-tabs.tsx`: shared — apply changes sequentially after card tasks complete
- `campaign-shell.tsx`: owned by whoever does Tasks 11 and 13
- `ad-card-wrapper.tsx`: owned by Task 13 agent
- Each new card file: owned by its creating agent
