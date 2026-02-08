# RealEstate Ad Gen — System Design

**Date:** 2026-02-07
**Status:** Approved

---

## Overview

A real estate ad generation system that takes a property listing URL, scrapes the listing data, and uses AI (OpenAI GPT-5.2) to produce a complete campaign kit of ready-to-post ads across platforms.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack, SaaS-ready, single codebase |
| Language | TypeScript | Type safety, better DX |
| UI | Tailwind CSS + shadcn/ui | Professional look, customizable, owns the code |
| AI Model | OpenAI GPT-5.2 | Best-in-class marketing copy generation |
| Scraping | Server-side fetch + cheerio | No CORS issues, JSON-LD parsing |
| PDF Export | @react-pdf/renderer | Server-side PDF generation |
| API Key | Server-side env variable | Simple, owner controls costs |
| Database | None (MVP) | Session-based, real-time flow |
| Auth | None (MVP) | Added later for SaaS |
| MLS Compliance | Config-driven, Montana default | Extensible per-state via config objects |

## Architecture

```
realestate-ad-gen/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing/input page (paste URL)
│   │   ├── campaign/[id]/      # Campaign kit view page
│   │   ├── api/
│   │   │   ├── scrape/         # Listing scraper endpoint
│   │   │   ├── generate/       # AI ad generation endpoint
│   │   │   └── export/         # PDF/CSV export endpoint
│   ├── components/             # UI components (shadcn/ui based)
│   ├── lib/
│   │   ├── scraper/            # Listing page scraping logic
│   │   ├── ai/                 # GPT-5.2 prompt templates & generation
│   │   ├── export/             # PDF & CSV generation
│   │   └── types/              # TypeScript types
├── public/                     # Static assets
├── .env.local                  # API keys
└── package.json
```

## Data Flow

1. Agent pastes a listing URL → hits `/api/scrape`
2. Scraper extracts structured data (price, beds, baths, sqft, features, photos, remarks)
3. Normalized listing data sent to `/api/generate`
4. GPT-5.2 produces all ad variations in one structured JSON response
5. Campaign kit renders on-screen with copy buttons and export options

## Listing Data Model

```typescript
interface ListingData {
  url: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    neighborhood?: string;
  };
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSize?: string;
  yearBuilt?: number;
  propertyType: string;
  features: string[];
  description: string;
  photos: string[];
  listingAgent?: string;
  broker?: string;
}
```

## Scraping Strategy

- **Primary:** Parse JSON-LD structured data from listing pages
- **Secondary:** Fall back to Open Graph meta tags
- **Tertiary:** Basic HTML meta + title parsing
- Partial results flagged for future manual completion

## Ad Generation Output

| Ad Type | Format | Tones |
|---------|--------|-------|
| Instagram Caption | Short, emoji-friendly, ~2,200 chars | Professional, Casual, Luxury |
| Facebook Post | Conversational, lifestyle-focused, 500-800 words | Professional, Casual, Luxury |
| Google Ads (x3) | Headline (30 chars) + Description (90 chars) | N/A (strict format) |
| Meta/Facebook Ad | Primary text + Headline + Description | N/A (platform spec) |
| MLS Description | Montana MLS-compliant, ~1,000 chars | Professional only |
| Twitter/X Post | Ultra-short, link-friendly, 280 chars | N/A |
| Magazine — Full Page | Headline + body + CTA, print-ready | Professional, Luxury |
| Magazine — Half Page | Condensed version for smaller placements | Professional, Luxury |
| Postcard/Flyer | Front headline + back details for mailers | Professional, Casual |
| Zillow Description | Optimized for Zillow format and search SEO | Professional |
| Realtor.com Description | Tuned to Realtor.com tone and format | Professional |
| Homes.com/Trulia Description | Platform-specific variations | Professional |

**Additional outputs:**
- 15-20 suggested hashtags (broad + local + niche)
- 2-3 tailored calls-to-action
- Audience/geo targeting notes with suggested radius
- Top 5 selling points ranked by marketing impact

## MLS Compliance

Config-driven system. Ships with Montana as default:

```typescript
interface MLSComplianceConfig {
  state: string;
  mlsName: string;
  rules: string[];
  requiredDisclosures: string[];
  prohibitedTerms: string[];
  maxDescriptionLength?: number;
}
```

New states added as config objects — no code changes. Gated behind account setup when user accounts are added.

## Campaign Kit UI

- **Header:** Property summary card with hero photo + "Export All" button
- **Social Media tab:** Instagram (3 tones) + Facebook (3 tones) + Twitter. Copy buttons + character counts
- **Paid Ads tab:** Google Ads (3 combos) + Meta Ad. Character limit indicators (green/red)
- **Print/Magazine tab:** Full-page ad copy, half-page variation, postcard/flyer front and back. Copy buttons for each.
- **Online Listings tab:** Zillow, Realtor.com, Homes.com/Trulia descriptions. Each optimized for the platform's format and SEO. Copy buttons with character counts.
- **MLS Description tab:** Montana-compliant description + compliance checklist
- **Marketing Strategy tab:** Selling points, hashtags, CTAs, audience targeting

Every text block has one-click copy with "Copied!" confirmation. Tone selector as toggle pills. Clean white/slate design. Fully responsive.

## Export

- **PDF:** Branded, print-ready document with all ad variations. Generated server-side with @react-pdf/renderer.
- **CSV/JSON:** One row per ad variation with platform, tone, headline, body, character count, hashtags.

## Not in MVP (See POST-MVP-ROADMAP.md)

- User accounts & auth
- State compliance selector
- Manual listing entry form
- Photo/video upload
- Campaign history
- Direct platform posting
- Usage metering/billing
