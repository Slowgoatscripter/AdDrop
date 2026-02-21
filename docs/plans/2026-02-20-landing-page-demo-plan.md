# Landing Page Interactive Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a zero-friction interactive demo on the landing page that lets anonymous visitors experience the AI campaign generator and compliance pipeline without signing up.

**Architecture:** Cached-first approach — sample property results are pre-generated and stored in Supabase `demo_cache`. A landing page component plays an animated pipeline sequence from cached data, then reveals 3 platform outputs with compliance badges. Remaining platforms are shown as blurred teasers with a signup CTA. Cache refreshes periodically (every 6h or 50 views) to keep output fresh.

**Tech Stack:** Next.js 15 (App Router), React 19, Supabase (Postgres + RLS), Framer Motion, Tailwind CSS, shadcn/ui, OpenAI GPT-5.2 (for cache refresh only)

**Design Doc:** `docs/plans/2026-02-20-landing-page-demo-design.md`

---

## Task 1: Database Migration — `demo_cache` Table

**Files:**
- Create: `supabase/migrations/20260220_create_demo_cache.sql`

**Step 1: Write the migration**

```sql
-- Demo cache for landing page interactive demo
-- Stores pre-generated campaign results for sample properties
-- No user_id — this is public, anonymous data

create table public.demo_cache (
  id uuid primary key default gen_random_uuid(),
  property_id text not null unique,
  campaign_result jsonb not null,
  compliance_result jsonb not null,
  quality_result jsonb,
  raw_campaign jsonb not null,
  generated_at timestamptz not null default now(),
  view_count integer not null default 0
);

-- Public read access (no auth needed), admin-only write
alter table public.demo_cache enable row level security;

create policy "Anyone can read demo cache"
  on public.demo_cache for select
  using (true);

create policy "Only service role can write demo cache"
  on public.demo_cache for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.demo_cache is 'Pre-generated campaign results for the landing page demo';
```

**Step 2: Apply the migration**

Run: `npx supabase db push` (or however migrations are applied in this project)
Expected: Table created successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/20260220_create_demo_cache.sql
git commit -m "feat(demo): add demo_cache table migration"
```

---

## Task 2: Sample Property Data

**Files:**
- Create: `src/lib/demo/sample-properties.ts`

**Step 1: Create sample property data file**

Define 3 curated `ListingData` objects that the demo rotates through. These are hardcoded — no database needed for the listings themselves.

```typescript
import type { ListingData } from '@/lib/types/listing';

export const DEMO_PROPERTIES: ListingData[] = [
  {
    url: '',
    address: {
      street: '742 Evergreen Terrace',
      city: 'Scottsdale',
      state: 'AZ',
      zip: '85251',
      neighborhood: 'Old Town',
    },
    price: 1_195_000,
    beds: 5,
    baths: 4,
    sqft: 4_200,
    lotSize: '0.35 acres',
    yearBuilt: 2019,
    propertyType: 'Single Family',
    features: [
      'Resort-style pool with spa',
      'Gourmet kitchen with Sub-Zero appliances',
      'Primary suite with private balcony',
      'Home theater',
      'Three-car garage',
      'Smart home technology throughout',
    ],
    description:
      'Stunning modern luxury home in the heart of Old Town Scottsdale. This architectural masterpiece features soaring ceilings, floor-to-ceiling windows, and seamless indoor-outdoor living. The chef\'s kitchen opens to a grand entertaining space with views of Camelback Mountain.',
    photos: [],
    sellingPoints: [
      'Walking distance to Old Town dining and nightlife',
      'Mountain views from multiple rooms',
      'Energy-efficient construction with solar panels',
    ],
  },
  {
    url: '',
    address: {
      street: '1580 Market Street',
      city: 'Denver',
      state: 'CO',
      zip: '80202',
      neighborhood: 'LoDo',
    },
    price: 285_000,
    beds: 2,
    baths: 1,
    sqft: 950,
    yearBuilt: 2015,
    propertyType: 'Condo',
    features: [
      'Open floor plan',
      'In-unit washer/dryer',
      'Stainless steel appliances',
      'Rooftop terrace access',
      'One reserved parking space',
    ],
    description:
      'Move-in ready condo in Denver\'s vibrant LoDo neighborhood. This bright and airy unit features modern finishes, an open-concept layout, and access to a shared rooftop terrace with panoramic city views. Steps from Union Station, restaurants, and entertainment.',
    photos: [],
    sellingPoints: [
      'Steps from Union Station and light rail',
      'Low HOA with rooftop terrace',
      'Walkable to 100+ restaurants',
    ],
  },
  {
    url: '',
    address: {
      street: '4821 Maple Ridge Drive',
      city: 'Charlotte',
      state: 'NC',
      zip: '28277',
      neighborhood: 'Ballantyne',
    },
    price: 520_000,
    beds: 3,
    baths: 2,
    sqft: 2_100,
    lotSize: '0.25 acres',
    yearBuilt: 2021,
    propertyType: 'Single Family',
    features: [
      'Open-concept living and dining',
      'Quartz countertops',
      'Covered patio with ceiling fan',
      'Fenced backyard',
      'Two-car garage',
      'Energy-efficient windows',
    ],
    description:
      'Beautiful move-in ready home in the sought-after Ballantyne community. This well-designed home offers a spacious open floor plan, a modern kitchen with quartz countertops, and a private backyard perfect for entertaining. Located in a top-rated school district with easy access to shopping and dining.',
    photos: [],
    sellingPoints: [
      'Top-rated school district',
      'Minutes from Ballantyne Town Center',
      'Community pool and walking trails',
    ],
  },
];

/** Platforms shown in the demo (3 of 12+) */
export const DEMO_PLATFORMS = ['instagram', 'facebook', 'googleAds'] as const;

/** All platform IDs for the blurred teaser cards */
export const ALL_PLATFORM_IDS = [
  'instagram', 'facebook', 'googleAds', 'twitter', 'metaAd',
  'magazineFullPage', 'magazineHalfPage', 'postcard',
  'zillow', 'realtorCom', 'homesComTrulia', 'mlsDescription',
] as const;
```

**Step 2: Commit**

```bash
git add src/lib/demo/sample-properties.ts
git commit -m "feat(demo): add curated sample property data"
```

---

## Task 3: Demo Cache Service — Read & Refresh Logic

**Files:**
- Create: `src/lib/demo/cache.ts`

**Step 1: Write the cache service**

This module handles reading cached results from Supabase and triggering refreshes. The refresh function calls the real `generateCampaign` pipeline.

```typescript
import { createClient } from '@supabase/supabase-js';
import { generateCampaign } from '@/lib/ai/generate';
import { DEMO_PROPERTIES, DEMO_PLATFORMS } from './sample-properties';
import type { CampaignKit } from '@/lib/types/campaign';

// Use service role client for write operations (bypasses RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Use anon client for public reads
function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface DemoCacheEntry {
  id: string;
  property_id: string;
  campaign_result: CampaignKit;
  compliance_result: Record<string, unknown>;
  quality_result: Record<string, unknown> | null;
  raw_campaign: CampaignKit;
  generated_at: string;
  view_count: number;
}

const REFRESH_VIEW_THRESHOLD = 50;
const REFRESH_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Get a cached demo result. Picks a random property if none specified.
 * Increments view_count and triggers refresh if thresholds are met.
 */
export async function getDemoCacheEntry(
  propertyId?: string,
): Promise<DemoCacheEntry | null> {
  const supabase = getAnonClient();

  // Pick random property if not specified
  const targetId = propertyId ?? DEMO_PROPERTIES[Math.floor(Math.random() * DEMO_PROPERTIES.length)]
    .address.street.toLowerCase().replace(/\s+/g, '-');

  const { data, error } = await supabase
    .from('demo_cache')
    .select('*')
    .eq('property_id', targetId)
    .single();

  if (error || !data) return null;

  // Increment view count (fire-and-forget, non-blocking)
  const serviceClient = getServiceClient();
  serviceClient
    .from('demo_cache')
    .update({ view_count: data.view_count + 1 })
    .eq('id', data.id)
    .then(() => {
      // Check if refresh needed
      const age = Date.now() - new Date(data.generated_at).getTime();
      if (data.view_count + 1 >= REFRESH_VIEW_THRESHOLD || age >= REFRESH_AGE_MS) {
        refreshDemoCache(targetId).catch(console.error);
      }
    });

  return data as DemoCacheEntry;
}

/**
 * Get all cached entries (for the demo to pick from).
 */
export async function getAllDemoCacheEntries(): Promise<DemoCacheEntry[]> {
  const supabase = getAnonClient();
  const { data } = await supabase
    .from('demo_cache')
    .select('*')
    .order('generated_at', { ascending: false });
  return (data as DemoCacheEntry[]) ?? [];
}

/**
 * Refresh the cache for a specific property by running the full pipeline.
 * This is the only place that costs money (OpenAI calls).
 */
export async function refreshDemoCache(propertyId: string): Promise<void> {
  const property = DEMO_PROPERTIES.find(
    (p) => p.address.street.toLowerCase().replace(/\s+/g, '-') === propertyId,
  );
  if (!property) return;

  // Generate with only 3 platforms to minimize cost
  const campaign = await generateCampaign(property, {
    platforms: [...DEMO_PLATFORMS],
    tone: 'professional',
  });

  const serviceClient = getServiceClient();
  await serviceClient.from('demo_cache').upsert(
    {
      property_id: propertyId,
      campaign_result: campaign,
      compliance_result: campaign.complianceResult ?? {},
      quality_result: campaign.qualityResult ?? {},
      raw_campaign: campaign, // Note: ideally capture pre-compliance output — see Task 4
      generated_at: new Date().toISOString(),
      view_count: 0,
    },
    { onConflict: 'property_id' },
  );
}

/**
 * Seed the cache for all sample properties. Run once on deploy or via admin action.
 */
export async function seedDemoCache(): Promise<void> {
  for (const property of DEMO_PROPERTIES) {
    const propertyId = property.address.street.toLowerCase().replace(/\s+/g, '-');
    await refreshDemoCache(propertyId);
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/demo/cache.ts
git commit -m "feat(demo): add demo cache read/refresh service"
```

---

## Task 4: Capture Pre-Compliance Output for Before/After Diff

**Files:**
- Modify: `src/lib/ai/generate.ts` (the `generateCampaign` function)
- Create: `src/lib/demo/generate-with-diff.ts`

**Context:** The design calls for showing before/after compliance diffs. Currently `generateCampaign` doesn't expose the pre-compliance campaign. Rather than modifying the core function, create a wrapper that captures the intermediate state.

**Step 1: Create the demo-specific generation wrapper**

```typescript
import { generateCampaign } from '@/lib/ai/generate';
import type { ListingData } from '@/lib/types/listing';
import type { CampaignKit } from '@/lib/types/campaign';
import type { PlatformId } from '@/lib/types/campaign';

export interface DemoGenerationResult {
  finalCampaign: CampaignKit;
  rawCampaign: CampaignKit; // Pre-compliance version for diff display
}

/**
 * Generates a campaign twice — once to capture raw output, once with full pipeline.
 *
 * Alternative approach: If `generateCampaign` can be modified to return intermediate
 * results, do that instead to avoid the double call. Check if the compliance result
 * already contains the original text — if so, use that and skip this wrapper entirely.
 */
export async function generateDemoWithDiff(
  listing: ListingData,
  platforms: PlatformId[],
): Promise<DemoGenerationResult> {
  // The full pipeline already stores violations and auto-fixes in complianceResult.
  // The autoFixes array contains { platform, original, replacement } — this IS the diff data.
  // So we only need one generation call.
  const finalCampaign = await generateCampaign(listing, { platforms, tone: 'professional' });

  // Reconstruct "raw" campaign by reverting autoFixes
  // complianceResult.autoFixes[] has { platform, original, replacement }
  // We apply them in reverse to reconstruct pre-compliance text
  const rawCampaign = structuredClone(finalCampaign);
  const autoFixes = finalCampaign.complianceResult?.autoFixes ?? [];

  for (const fix of autoFixes) {
    const platformKey = fix.platform as keyof CampaignKit;
    const platformData = rawCampaign[platformKey];
    if (typeof platformData === 'string') {
      (rawCampaign as Record<string, unknown>)[platformKey] = platformData.replace(fix.replacement, fix.original);
    } else if (platformData && typeof platformData === 'object') {
      // Handle Record<AdTone, string> case
      for (const tone of Object.keys(platformData)) {
        const text = (platformData as Record<string, string>)[tone];
        if (typeof text === 'string') {
          (platformData as Record<string, string>)[tone] = text.replace(fix.replacement, fix.original);
        }
      }
    }
  }

  return { finalCampaign, rawCampaign };
}
```

**Step 2: Update `refreshDemoCache` in `src/lib/demo/cache.ts` to use `generateDemoWithDiff`**

Replace the `refreshDemoCache` function body to call `generateDemoWithDiff` and store `rawCampaign` separately from `campaign_result`.

**Step 3: Commit**

```bash
git add src/lib/demo/generate-with-diff.ts src/lib/demo/cache.ts
git commit -m "feat(demo): capture pre-compliance output for before/after diff"
```

---

## Task 5: API Route — Fetch Demo Data

**Files:**
- Create: `src/app/api/demo/route.ts`

**Step 1: Write the API route**

```typescript
import { NextResponse } from 'next/server';
import { getDemoCacheEntry, getAllDemoCacheEntries } from '@/lib/demo/cache';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Rate limit config for demo endpoint — generous for normal use, prevents scraping
const DEMO_RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30/min per IP

export async function GET(request: Request) {
  const ip = getClientIp(request) ?? 'unknown';
  const { allowed } = checkRateLimit(`demo:${ip}`, DEMO_RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('propertyId') ?? undefined;

  const entry = await getDemoCacheEntry(propertyId);

  if (!entry) {
    // No cached data yet — return a flag so the UI can show a fallback
    return NextResponse.json({ available: false });
  }

  return NextResponse.json({
    available: true,
    propertyId: entry.property_id,
    campaign: entry.campaign_result,
    compliance: entry.compliance_result,
    quality: entry.quality_result,
    rawCampaign: entry.raw_campaign,
    generatedAt: entry.generated_at,
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/demo/route.ts
git commit -m "feat(demo): add public API route for demo cache reads"
```

---

## Task 6: API Route — Seed/Refresh Demo Cache (Admin Only)

**Files:**
- Create: `src/app/api/demo/refresh/route.ts`

**Step 1: Write the admin-only refresh route**

```typescript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { seedDemoCache, refreshDemoCache } from '@/lib/demo/cache';

export async function POST(request: Request) {
  // Admin only
  const { user, error: authError } = await requireAuth();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin (adapt to your admin check pattern)
  // If there's no admin check yet, use the rate_limit_exempt field or a specific email
  const body = await request.json().catch(() => ({}));
  const propertyId = body.propertyId as string | undefined;

  if (propertyId) {
    await refreshDemoCache(propertyId);
    return NextResponse.json({ refreshed: propertyId });
  }

  // Seed all properties
  await seedDemoCache();
  return NextResponse.json({ seeded: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/demo/refresh/route.ts
git commit -m "feat(demo): add admin-only cache refresh/seed endpoint"
```

---

## Task 7: Demo Pipeline Stepper Component

**Files:**
- Create: `src/components/landing/demo-pipeline.tsx`

**Context:** Reuse the exact animation pattern from `src/components/campaign/campaign-generating-view.tsx`. The `STEPS` array with `activeAt` timing, `elapsed` + `setInterval`, and the pending/active/completed visual states.

**Step 1: Build the pipeline stepper**

This component takes cached compliance data and plays the animation sequence. It does NOT call any API — it's purely visual, driven by the cached violation count.

Key differences from `campaign-generating-view.tsx`:
- Steps include a 4th step: "Found N violations — auto-fixing..." that shows the real violation count
- After animation completes, calls `onComplete()` callback so the parent can reveal results
- Uses landing page color tokens (`text-cream`, `text-gold`, `bg-surface`) instead of app theme
- Has a configurable `duration` (total animation time, e.g. 4 seconds)

```typescript
// Props:
interface DemoPipelineProps {
  violationCount: number;  // From cached compliance result
  onComplete: () => void;  // Called when animation finishes
}
```

Steps:
1. "Generating ad copy for 3 platforms..." (activeAt: 0)
2. "Scanning for Fair Housing compliance..." (activeAt: 1.5s)
3. `Found ${violationCount} violations — auto-fixing...` (activeAt: 2.5s)
4. "All clear — Fair Housing Compliant ✓" (activeAt: 3.5s, calls onComplete at 4.5s)

Reuse the same visual pattern: connector lines, spinning border circle for active, check icon for completed, pulsing "In progress..." label.

**Step 2: Commit**

```bash
git add src/components/landing/demo-pipeline.tsx
git commit -m "feat(demo): add pipeline stepper animation component"
```

---

## Task 8: Demo Platform Card Component (Read-Only)

**Files:**
- Create: `src/components/landing/demo-platform-card.tsx`

**Context:** Simplified, read-only version of the campaign cards styled for the landing page. No editing, no tone switching, no export — just display.

**Step 1: Build the demo card**

```typescript
interface DemoPlatformCardProps {
  platform: string;           // 'instagram' | 'facebook' | 'googleAds'
  content: string;            // The ad copy text
  hashtags?: string[];        // For instagram/facebook
  compliance: {
    passed: boolean;
    fixCount: number;
  };
  qualityScore?: number;      // Overall 1-10 score
}
```

Features:
- Platform icon + name in header (reuse platform icon mapping from existing cards)
- Ad copy text displayed in a styled card
- Compliance badge: green "Fair Housing Compliant ✓" or yellow with fix count
- Quality score badge if available
- Landing page styling: `bg-surface`, `border-gold/20`, `text-cream`, `font-serif` headings
- Framer Motion fade-in on reveal

**Step 2: Commit**

```bash
git add src/components/landing/demo-platform-card.tsx
git commit -m "feat(demo): add read-only demo platform card"
```

---

## Task 9: Blurred Teaser Cards Component

**Files:**
- Create: `src/components/landing/demo-locked-cards.tsx`

**Step 1: Build the blurred teaser grid**

Shows the remaining 9+ platforms as blurred/locked cards with visible platform icons. Each card is clickable → `/signup`.

```typescript
interface DemoLockedCardsProps {
  unlockedPlatforms: string[];  // Platforms already shown (to exclude)
}
```

Features:
- Grid of small cards (3-4 per row on desktop, 2 on mobile)
- Each card: platform icon + platform name, blurred overlay with lock icon
- `backdrop-blur-sm` or `blur-sm` on the content
- Entire card is a Link to `/signup`
- Subtle hover effect (slight unblur or scale)
- Caption below grid: "Sign up free to unlock all 12+ platforms"

**Step 2: Commit**

```bash
git add src/components/landing/demo-locked-cards.tsx
git commit -m "feat(demo): add blurred teaser cards for locked platforms"
```

---

## Task 10: Interactive Demo Main Component

**Files:**
- Create: `src/components/landing/interactive-demo.tsx`

**Step 1: Build the main orchestrator component**

This is the parent component that ties everything together. It manages state across the demo lifecycle.

```typescript
'use client';

// States: 'idle' → 'animating' → 'revealed'
```

**Layout (idle state):**
- Section header: "See It In Action" (font-serif, text-cream)
- Subheading: "Watch our AI generate compliant real estate ads in seconds"
- Sample property card showing: address, price, beds/baths/sqft, 2-3 features
- CTA button: "Generate Sample Campaign" (styled like hero CTA)

**Layout (animating state):**
- Property card stays visible (slightly dimmed)
- `DemoPipeline` component plays the animation sequence
- No interaction allowed during animation

**Layout (revealed state):**
- 3 `DemoPlatformCard` components (Instagram, Facebook, Google Ads)
- Before/after compliance diff section (expandable): shows original text with red strikethrough, fixed text with green highlight
- `DemoLockedCards` grid below
- Primary CTA: "Create Your Own Campaign — Free" → `/signup`
- Secondary CTA: "Try another property" → resets to idle with a different sample property
- "Try another property" button picks the next property from the rotation

**Data fetching:**
- Fetch from `/api/demo` on mount (or on button click)
- Show loading skeleton if data isn't ready
- If no cached data available, show a static fallback (hardcoded example output)

**Step 2: Commit**

```bash
git add src/components/landing/interactive-demo.tsx
git commit -m "feat(demo): add InteractiveDemo main component"
```

---

## Task 11: Compliance Diff Display Component

**Files:**
- Create: `src/components/landing/demo-compliance-diff.tsx`

**Step 1: Build the before/after diff display**

Shows what the compliance agent caught and fixed. This is the "wow factor" that showcases the compliance pipeline.

```typescript
interface DemoComplianceDiffProps {
  autoFixes: Array<{
    platform: string;
    original: string;
    replacement: string;
    rule?: string;
  }>;
}
```

Features:
- Expandable section (collapsed by default, "See what we caught →" toggle)
- Each fix shown as a card:
  - Red background strip: original text with strikethrough
  - Green background strip: replacement text
  - Badge with the violation category (e.g., "Familial Status", "Steering")
- Framer Motion expand/collapse animation
- Landing page styling consistent with other components

**Step 2: Commit**

```bash
git add src/components/landing/demo-compliance-diff.tsx
git commit -m "feat(demo): add compliance before/after diff display"
```

---

## Task 12: Wire Into Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Import and insert the InteractiveDemo component**

Add the import and insert `<InteractiveDemo />` between `<HowItWorks />` and `<ShowcaseCarousel />`.

```typescript
import { InteractiveDemo } from '@/components/landing/interactive-demo';

// In the JSX, after <HowItWorks /> and before <ShowcaseCarousel />:
<InteractiveDemo />
```

**Step 2: Test the landing page**

Run: `npm run dev`
Visit: `http://localhost:3000`
Expected: New demo section visible between How It Works and Showcase Carousel.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(demo): wire InteractiveDemo into landing page"
```

---

## Task 13: Seed Initial Cache Data

**Step 1: Create a seed script**

**Files:**
- Create: `scripts/seed-demo-cache.ts`

A simple script that calls `seedDemoCache()` to populate the `demo_cache` table with initial results for all 3 sample properties.

```typescript
import { seedDemoCache } from '@/lib/demo/cache';

async function main() {
  console.log('Seeding demo cache...');
  await seedDemoCache();
  console.log('Done! Demo cache seeded for all sample properties.');
}

main().catch(console.error);
```

**Step 2: Run the seed**

Run: `npx tsx scripts/seed-demo-cache.ts`
Expected: 3 rows in `demo_cache` table, one per sample property.

**Step 3: Commit**

```bash
git add scripts/seed-demo-cache.ts
git commit -m "feat(demo): add demo cache seed script"
```

---

## Task 14: Rate Limit Config for Demo

**Files:**
- Modify: `src/lib/rate-limit.ts`

**Step 1: Add demo rate limit config**

Add to the `RATE_LIMIT_CONFIGS` object:

```typescript
demo: { limit: 30, windowMs: 60_000 }, // 30/min per IP — generous, just prevents scraping
```

**Step 2: Update the API route to use the centralized config**

Update `src/app/api/demo/route.ts` to import `RATE_LIMIT_CONFIGS` instead of inline config.

**Step 3: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/demo/route.ts
git commit -m "feat(demo): add centralized demo rate limit config"
```

---

## Task 15: End-to-End Testing

**Step 1: Test the full flow manually**

1. Ensure demo cache is seeded (run seed script if needed)
2. Visit landing page → scroll to demo section
3. Click "Generate Sample Campaign"
4. Verify pipeline animation plays (4 steps, ~4.5 seconds)
5. Verify 3 platform cards appear with content
6. Verify compliance badge shows on each card
7. Expand compliance diff → verify before/after is shown
8. Verify blurred locked cards show remaining platforms
9. Click a locked card → verify redirect to `/signup`
10. Click "Try another property" → verify it cycles to a different listing
11. Check mobile responsive layout

**Step 2: Test edge cases**

- Visit demo with empty cache → verify fallback/loading state
- Rapid-click the generate button → verify no double-animation
- Test rate limiting: hit `/api/demo` 31 times in a minute → verify 429

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(demo): complete landing page interactive demo"
```

---

## Summary of Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/20260220_create_demo_cache.sql` |
| Create | `src/lib/demo/sample-properties.ts` |
| Create | `src/lib/demo/cache.ts` |
| Create | `src/lib/demo/generate-with-diff.ts` |
| Create | `src/app/api/demo/route.ts` |
| Create | `src/app/api/demo/refresh/route.ts` |
| Create | `src/components/landing/demo-pipeline.tsx` |
| Create | `src/components/landing/demo-platform-card.tsx` |
| Create | `src/components/landing/demo-locked-cards.tsx` |
| Create | `src/components/landing/interactive-demo.tsx` |
| Create | `src/components/landing/demo-compliance-diff.tsx` |
| Create | `scripts/seed-demo-cache.ts` |
| Modify | `src/app/page.tsx` (add InteractiveDemo import + placement) |
| Modify | `src/lib/rate-limit.ts` (add demo config) |

## Task Dependencies

```
Task 1 (migration) ──┐
Task 2 (sample data) ├─→ Task 3 (cache service) ──→ Task 4 (diff wrapper) ──→ Task 5 (API read) ──→ Task 6 (API refresh)
                      │
                      ├─→ Task 7 (pipeline stepper) ─┐
                      ├─→ Task 8 (platform cards) ────┤
                      ├─→ Task 9 (locked cards) ──────┼─→ Task 10 (main component) ──→ Task 11 (diff display) ──→ Task 12 (wire into page)
                      │                               │
                      └───────────────────────────────┘
                                                           Task 13 (seed) depends on Tasks 3, 4, 6
                                                           Task 14 (rate limit) depends on Task 5
                                                           Task 15 (E2E test) depends on all
```

**Parallelizable groups:**
- Group A (backend): Tasks 1, 2, 3, 4, 5, 6, 13, 14
- Group B (frontend): Tasks 7, 8, 9, 10, 11, 12
- Group C (integration): Task 15
