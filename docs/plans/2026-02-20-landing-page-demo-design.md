# Landing Page Interactive Demo

## Overview

A zero-friction "Try It" experience on the landing page that lets anonymous visitors see the AI campaign generator and compliance pipeline in action — without logging in or creating an account.

## User Flow

1. Visitor scrolls past "How It Works" to the demo section
2. Sees a sample property card (pre-filled curated listing)
3. Clicks **"See It In Action"**
4. Animated pipeline plays out (reuses existing step animation pattern):
   - "Generating ad copy for 3 platforms..."
   - "Scanning for Fair Housing compliance..."
   - "Found N violations — auto-fixing..."
   - "All clear — Fair Housing Compliant"
5. Output reveals: Instagram, Facebook, and Google Ads copy with compliance badges
6. Remaining 9+ platforms shown as blurred/locked cards with platform icons visible
7. CTA: "This is just 3 of 12+ platforms. Sign up free to generate for your own listings." → `/signup`

## Cost Strategy: Cached-First with Periodic Refresh

- 2-3 curated sample properties stored in the database
- Results are pre-generated and cached (full pipeline: generate → compliance → quality score)
- Cache refreshes on a **time-based interval** (every 6 hours) OR **request-count threshold** (every 50 views) — whichever comes first
- A server action triggers the refresh and stores the new result
- **Cost estimate:** ~3-5 generations/day × ~$0.10 each = **$0.30-0.50/day max**

## Compliance Showcase

- Pipeline animation is scripted from cached data — plays out the real steps with real violation counts
- Before/after diffs derived from the cached compliance result (original vs. rewritten text)
- Violations shown are real ones the compliance agent caught, keeping it authentic
- Reuses the existing pipeline step animation components already in the app

## Demo Output Display

- 3 platform cards: Instagram, Facebook, Google Ads
- Each card shows final compliant copy, hashtags/CTAs where applicable
- Compliance badge on each card
- Remaining 9+ platforms shown as blurred/locked cards with visible platform icons (teaser)

## No Auth Required

- Demo reads from cached results — no `requireAuth()`, no user ID, no session needed
- No new generation API route needed for visitors
- IP-based rate limiting on the data endpoint as a scraping safeguard
- The demo itself is unlimited for normal visitors

## Sample Properties (Initial Set)

| Property | Type | Price | Beds/Baths | Purpose |
|----------|------|-------|------------|---------|
| Luxury SFH | Single-family | $1.2M | 5bd/4ba | Showcase premium copy |
| Starter Condo | Condo | $285K | 2bd/1ba | Relatable entry-level |
| Suburban Home | Single-family | $520K | 3bd/2ba | Mass-market appeal |

Each with realistic features, descriptions, and sample photos.

## Cache Mechanism

### Database

New Supabase table: `demo_cache`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| property_id | text | Sample property identifier |
| campaign_result | jsonb | Full CampaignKit output (3 platforms) |
| compliance_result | jsonb | Compliance agent result with violations |
| quality_result | jsonb | Quality scores |
| raw_campaign | jsonb | Pre-compliance output (for before/after diff) |
| generated_at | timestamptz | When this cache entry was created |
| view_count | integer | Number of times served to visitors |

### Refresh Logic

- On demo view: increment `view_count`
- If `view_count >= 50` OR `generated_at` older than 6 hours: queue a non-blocking refresh
- Refresh runs the full pipeline for the sample property and replaces the cache row
- Visitor always gets the current cached result (never waits for refresh)

## Page Placement

- New section inserted after `HowItWorks` and before `ShowcaseCarousel`
- Component: `InteractiveDemo` (or similar)
- Responsive: works on mobile and desktop

## Conversion Integration

- Primary CTA after demo output → `/signup`
- Secondary: "Want to try your own listing?" → `/signup`
- Blurred platform cards are clickable → `/signup`

## Out of Scope

- Photo generation/display in demo (text copy only for now)
- Live generation per visitor (cached approach only)
- User-customizable input fields (pre-filled only)
- Export/download of demo results
