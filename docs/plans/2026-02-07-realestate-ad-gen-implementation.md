# RealEstate Ad Gen — MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack Next.js app that takes a property listing URL, scrapes listing data, generates AI-powered ad copy for 10+ platforms, and presents it in a tabbed campaign kit with copy buttons and PDF/CSV export.

**Architecture:** Next.js 15 App Router with server-side API routes for scraping (cheerio), AI generation (OpenAI GPT-5.2), and export (react-pdf). Client-side tabbed UI built with shadcn/ui components. No database — session-based flow where data passes through URL → scrape → generate → render.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, OpenAI SDK, cheerio, @react-pdf/renderer

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run inside `C:\Users\dutte\OneDrive\Desktop\Projects\RealEstate Add Gen`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This creates the full Next.js 15 scaffold with TypeScript, Tailwind, ESLint, App Router, and src directory.

Expected: Project created with `package.json`, `src/app/`, `tailwind.config.ts`, etc.

**Step 2: Initialize git**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 15 project"
```

**Step 3: Install core dependencies**

```bash
npm install openai cheerio @react-pdf/renderer
npm install -D @types/cheerio
```

Expected: All packages install successfully.

**Step 4: Set up shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then install components we'll need:

```bash
npx shadcn@latest add button card tabs input badge textarea separator tooltip
```

Expected: Components added to `src/components/ui/`.

**Step 5: Create .env.local**

Create `C:\Users\dutte\OneDrive\Desktop\Projects\RealEstate Add Gen\.env.local`:
```
OPENAI_API_KEY=your-api-key-here
```

Ensure `.env.local` is in `.gitignore` (create-next-app adds it by default).

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: add dependencies and shadcn/ui setup"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types/listing.ts`
- Create: `src/lib/types/campaign.ts`
- Create: `src/lib/types/compliance.ts`

**Step 1: Create listing types**

Create `src/lib/types/listing.ts`:
```typescript
export interface ListingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
}

export interface ListingData {
  url: string;
  address: ListingAddress;
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

export interface ScrapeResult {
  success: boolean;
  data?: ListingData;
  error?: string;
  /** Fields that couldn't be scraped and may need manual entry */
  missingFields?: string[];
}
```

**Step 2: Create campaign types**

Create `src/lib/types/campaign.ts`:
```typescript
export type AdTone = 'professional' | 'casual' | 'luxury';

export interface AdVariation {
  platform: string;
  tone?: AdTone;
  headline?: string;
  body: string;
  characterCount: number;
  characterLimit?: number;
}

export interface GoogleAd {
  headline: string;       // max 30 chars
  description: string;    // max 90 chars
}

export interface MetaAd {
  primaryText: string;
  headline: string;
  description: string;
}

export interface PrintAd {
  headline: string;
  body: string;
  cta: string;
}

export interface CampaignKit {
  id: string;
  listing: import('./listing').ListingData;
  createdAt: string;

  // Social Media
  instagram: Record<AdTone, string>;
  facebook: Record<AdTone, string>;
  twitter: string;

  // Paid Ads
  googleAds: GoogleAd[];     // 3 variations
  metaAd: MetaAd;

  // Print
  magazineFullPage: Record<'professional' | 'luxury', PrintAd>;
  magazineHalfPage: Record<'professional' | 'luxury', PrintAd>;
  postcard: Record<'professional' | 'casual', { front: PrintAd; back: string }>;

  // Online Listings
  zillow: string;
  realtorCom: string;
  homesComTrulia: string;

  // MLS
  mlsDescription: string;
  mlsComplianceChecklist: ComplianceCheckItem[];

  // Marketing Strategy
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
  sellingPoints: string[];
}

export interface ComplianceCheckItem {
  rule: string;
  passed: boolean;
  detail?: string;
}
```

**Step 3: Create compliance types**

Create `src/lib/types/compliance.ts`:
```typescript
export interface MLSComplianceConfig {
  state: string;
  mlsName: string;
  rules: string[];
  requiredDisclosures: string[];
  prohibitedTerms: string[];
  maxDescriptionLength?: number;
}
```

**Step 4: Create barrel export**

Create `src/lib/types/index.ts`:
```typescript
export * from './listing';
export * from './campaign';
export * from './compliance';
```

**Step 5: Commit**

```bash
git add src/lib/types/
git commit -m "feat: add TypeScript types for listing, campaign, and compliance"
```

---

## Task 3: MLS Compliance Config

**Files:**
- Create: `src/lib/compliance/montana.ts`
- Create: `src/lib/compliance/index.ts`

**Step 1: Create Montana config**

Create `src/lib/compliance/montana.ts`:
```typescript
import { MLSComplianceConfig } from '@/lib/types';

export const montanaCompliance: MLSComplianceConfig = {
  state: 'Montana',
  mlsName: 'Montana Regional MLS',
  rules: [
    'Must include listing broker name',
    'Must include MLS number if available',
    'No guaranteed or promised appreciation language',
    'Must disclose if property is in a flood zone (if known)',
    'Fair housing compliance required',
    'No discriminatory language per Fair Housing Act',
  ],
  requiredDisclosures: [
    'Listing courtesy of [Broker Name]',
    'Information deemed reliable but not guaranteed',
    'Equal Housing Opportunity',
  ],
  prohibitedTerms: [
    'guaranteed appreciation',
    'sure investment',
    'exclusive neighborhood',
    'no crime',
    'safe area',
    'best schools',
    'walking distance to church',
    'family neighborhood',
    'perfect for couples',
  ],
  maxDescriptionLength: 1000,
};
```

**Step 2: Create compliance index**

Create `src/lib/compliance/index.ts`:
```typescript
import { MLSComplianceConfig } from '@/lib/types';
import { montanaCompliance } from './montana';

const complianceConfigs: Record<string, MLSComplianceConfig> = {
  MT: montanaCompliance,
};

export function getComplianceConfig(stateCode: string): MLSComplianceConfig | null {
  return complianceConfigs[stateCode.toUpperCase()] ?? null;
}

export function getDefaultCompliance(): MLSComplianceConfig {
  return montanaCompliance;
}

export function checkCompliance(
  text: string,
  config: MLSComplianceConfig
): { passed: boolean; rule: string; detail?: string }[] {
  const results: { passed: boolean; rule: string; detail?: string }[] = [];

  // Check prohibited terms
  for (const term of config.prohibitedTerms) {
    const found = text.toLowerCase().includes(term.toLowerCase());
    results.push({
      passed: !found,
      rule: `No prohibited term: "${term}"`,
      detail: found ? `Found "${term}" in description` : undefined,
    });
  }

  // Check max length
  if (config.maxDescriptionLength) {
    const withinLimit = text.length <= config.maxDescriptionLength;
    results.push({
      passed: withinLimit,
      rule: `Max ${config.maxDescriptionLength} characters`,
      detail: withinLimit
        ? undefined
        : `Description is ${text.length} characters (${text.length - config.maxDescriptionLength} over limit)`,
    });
  }

  return results;
}
```

**Step 3: Commit**

```bash
git add src/lib/compliance/
git commit -m "feat: add MLS compliance config system with Montana default"
```

---

## Task 4: Listing Scraper

**Files:**
- Create: `src/lib/scraper/index.ts`
- Create: `src/lib/scraper/parsers.ts`
- Create: `src/app/api/scrape/route.ts`

**Step 1: Create HTML parsers**

Create `src/lib/scraper/parsers.ts`:
```typescript
import * as cheerio from 'cheerio';
import { ListingData, ListingAddress } from '@/lib/types';

/**
 * Try to parse JSON-LD structured data from the page.
 * Real estate sites often embed Schema.org RealEstateListing or Product data.
 */
export function parseJsonLd($: cheerio.CheerioAPI): Partial<ListingData> | null {
  const scripts = $('script[type="application/ld+json"]');
  let best: Partial<ListingData> | null = null;

  scripts.each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const json = JSON.parse(raw);
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        const type = item['@type'];
        if (
          type === 'RealEstateListing' ||
          type === 'SingleFamilyResidence' ||
          type === 'Residence' ||
          type === 'Product' ||
          type === 'Place'
        ) {
          best = extractFromSchema(item);
          return false; // break
        }
        // Check @graph
        if (item['@graph']) {
          for (const node of item['@graph']) {
            if (
              ['RealEstateListing', 'SingleFamilyResidence', 'Residence'].includes(
                node['@type']
              )
            ) {
              best = extractFromSchema(node);
              return false;
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return best;
}

function extractFromSchema(item: Record<string, unknown>): Partial<ListingData> {
  const address = item.address as Record<string, string> | undefined;
  const geo = item.geo as Record<string, unknown> | undefined;
  const result: Partial<ListingData> = {};

  if (address) {
    result.address = {
      street: address.streetAddress || '',
      city: address.addressLocality || '',
      state: address.addressRegion || '',
      zip: address.postalCode || '',
    };
  }

  if (item.name && typeof item.name === 'string') {
    // Often the name IS the address on listing sites
    if (!result.address?.street) {
      result.address = parseAddressFromString(item.name);
    }
  }

  const price =
    (item as Record<string, unknown>).price ??
    ((item as Record<string, unknown>).offers as Record<string, unknown>)?.price;
  if (price) result.price = Number(String(price).replace(/[^0-9.]/g, ''));

  if (item.numberOfRooms) result.beds = Number(item.numberOfRooms);
  if (item.numberOfBathroomsTotal) result.baths = Number(item.numberOfBathroomsTotal);
  if (item.floorSize) {
    const size = item.floorSize as Record<string, unknown>;
    result.sqft = Number(size.value || size);
  }

  if (item.description && typeof item.description === 'string') {
    result.description = item.description;
  }

  if (item.photo || item.image) {
    const photos = item.photo || item.image;
    if (Array.isArray(photos)) {
      result.photos = photos.map((p: unknown) =>
        typeof p === 'string' ? p : (p as Record<string, string>).contentUrl || (p as Record<string, string>).url || ''
      ).filter(Boolean);
    } else if (typeof photos === 'string') {
      result.photos = [photos];
    }
  }

  if (item.yearBuilt) result.yearBuilt = Number(item.yearBuilt);

  return result;
}

function parseAddressFromString(str: string): ListingAddress {
  // Basic address parsing — tries "Street, City, State Zip"
  const parts = str.split(',').map((s: string) => s.trim());
  const stateZip = (parts[2] || '').split(/\s+/);
  return {
    street: parts[0] || str,
    city: parts[1] || '',
    state: stateZip[0] || '',
    zip: stateZip[1] || '',
  };
}

/**
 * Parse Open Graph meta tags.
 */
export function parseOpenGraph($: cheerio.CheerioAPI): Partial<ListingData> {
  const result: Partial<ListingData> = {};
  const title = $('meta[property="og:title"]').attr('content');
  const desc = $('meta[property="og:description"]').attr('content');
  const image = $('meta[property="og:image"]').attr('content');
  const price = $('meta[property="product:price:amount"]').attr('content');

  if (title) {
    result.address = parseAddressFromString(title);
  }
  if (desc) result.description = desc;
  if (image) result.photos = [image];
  if (price) result.price = Number(price.replace(/[^0-9.]/g, ''));

  return result;
}

/**
 * Parse basic HTML meta tags and common CSS selectors.
 */
export function parseHtmlMeta($: cheerio.CheerioAPI): Partial<ListingData> {
  const result: Partial<ListingData> = {};
  const title = $('title').text();
  const desc =
    $('meta[name="description"]').attr('content') || '';

  if (title) {
    result.address = parseAddressFromString(title);
  }
  if (desc) result.description = desc;

  // Try common real estate page patterns
  const priceText =
    $('[data-testid="price"]').text() ||
    $('.price').first().text() ||
    $('[class*="price"]').first().text() ||
    '';
  if (priceText) {
    const num = priceText.replace(/[^0-9.]/g, '');
    if (num) result.price = Number(num);
  }

  // Beds/baths/sqft from common patterns
  const statsText = $('[data-testid="bed-bath-sqft"]').text() ||
    $('.bed-bath').text() ||
    $('[class*="stats"]').first().text() || '';

  const bedsMatch = statsText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  const bathsMatch = statsText.match(/(\d+\.?\d*)\s*(?:bath|ba|bathroom)/i);
  const sqftMatch = statsText.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i);

  if (bedsMatch) result.beds = Number(bedsMatch[1]);
  if (bathsMatch) result.baths = Number(bathsMatch[1]);
  if (sqftMatch) result.sqft = Number(sqftMatch[1].replace(/,/g, ''));

  // Photos
  const photos: string[] = [];
  $('img[src*="photo"], img[src*="image"], img[data-src]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http')) photos.push(src);
  });
  if (photos.length > 0) result.photos = photos.slice(0, 10);

  return result;
}

/**
 * Deep merge partial listing data. Later sources fill in gaps.
 */
export function mergeListingData(...sources: Partial<ListingData>[]): Partial<ListingData> {
  const result: Partial<ListingData> = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || value === '') continue;
      if (key === 'address') {
        result.address = result.address || { street: '', city: '', state: '', zip: '' };
        const addr = value as Partial<ListingAddress>;
        if (addr.street && !result.address.street) result.address.street = addr.street;
        if (addr.city && !result.address.city) result.address.city = addr.city;
        if (addr.state && !result.address.state) result.address.state = addr.state;
        if (addr.zip && !result.address.zip) result.address.zip = addr.zip;
        if (addr.neighborhood) result.address.neighborhood = addr.neighborhood;
      } else if (key === 'photos') {
        result.photos = result.photos?.length ? result.photos : (value as string[]);
      } else if (key === 'features') {
        result.features = result.features?.length ? result.features : (value as string[]);
      } else if (!(key in result) || (result as Record<string, unknown>)[key] === undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}
```

**Step 2: Create scraper orchestrator**

Create `src/lib/scraper/index.ts`:
```typescript
import * as cheerio from 'cheerio';
import { ScrapeResult, ListingData } from '@/lib/types';
import { parseJsonLd, parseOpenGraph, parseHtmlMeta, mergeListingData } from './parsers';

export async function scrapeListing(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { success: false, error: 'Invalid URL protocol. Use http or https.' };
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch listing page: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Parse with all strategies (priority order)
    const jsonLdData = parseJsonLd($) || {};
    const ogData = parseOpenGraph($);
    const htmlData = parseHtmlMeta($);

    // Merge: JSON-LD wins, then OG, then HTML
    const merged = mergeListingData(jsonLdData, ogData, htmlData);

    // Check required fields
    const missingFields: string[] = [];
    if (!merged.address?.street) missingFields.push('address');
    if (!merged.price) missingFields.push('price');
    if (!merged.beds) missingFields.push('beds');
    if (!merged.baths) missingFields.push('baths');
    if (!merged.sqft) missingFields.push('sqft');
    if (!merged.description) missingFields.push('description');

    // Build final listing
    const listing: ListingData = {
      url,
      address: merged.address || { street: '', city: '', state: '', zip: '' },
      price: merged.price || 0,
      beds: merged.beds || 0,
      baths: merged.baths || 0,
      sqft: merged.sqft || 0,
      lotSize: merged.lotSize,
      yearBuilt: merged.yearBuilt,
      propertyType: merged.propertyType || 'Residential',
      features: merged.features || [],
      description: merged.description || '',
      photos: merged.photos || [],
      listingAgent: merged.listingAgent,
      broker: merged.broker,
    };

    return {
      success: true,
      data: listing,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scraping error';
    return { success: false, error: message };
  }
}
```

**Step 3: Create scrape API route**

Create `src/app/api/scrape/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { scrapeListing } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const result = await scrapeListing(url);
    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/scraper/ src/app/api/scrape/
git commit -m "feat: add listing scraper with JSON-LD, Open Graph, and HTML fallback"
```

---

## Task 5: AI Ad Generation

**Files:**
- Create: `src/lib/ai/prompt.ts`
- Create: `src/lib/ai/generate.ts`
- Create: `src/app/api/generate/route.ts`

**Step 1: Create the prompt template**

Create `src/lib/ai/prompt.ts`:
```typescript
import { ListingData } from '@/lib/types';
import { getDefaultCompliance } from '@/lib/compliance';

export function buildGenerationPrompt(listing: ListingData): string {
  const compliance = getDefaultCompliance();
  const addr = listing.address;
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(', ');

  return `You are an expert real estate marketing copywriter. Generate a complete campaign kit for the following property listing.

## Property Details
- **Address:** ${fullAddress}
- **Price:** $${listing.price.toLocaleString()}
- **Bedrooms:** ${listing.beds}
- **Bathrooms:** ${listing.baths}
- **Square Feet:** ${listing.sqft.toLocaleString()}
${listing.lotSize ? `- **Lot Size:** ${listing.lotSize}` : ''}
${listing.yearBuilt ? `- **Year Built:** ${listing.yearBuilt}` : ''}
- **Property Type:** ${listing.propertyType}
${listing.features.length > 0 ? `- **Features:** ${listing.features.join(', ')}` : ''}
${listing.listingAgent ? `- **Listing Agent:** ${listing.listingAgent}` : ''}
${listing.broker ? `- **Broker:** ${listing.broker}` : ''}

## Listing Description
${listing.description || 'No description available — generate based on property details above.'}

## MLS Compliance Rules (${compliance.state})
- MLS: ${compliance.mlsName}
- Rules: ${compliance.rules.join('; ')}
- Required disclosures: ${compliance.requiredDisclosures.join('; ')}
- PROHIBITED TERMS (never use): ${compliance.prohibitedTerms.join(', ')}
${compliance.maxDescriptionLength ? `- Max MLS description length: ${compliance.maxDescriptionLength} characters` : ''}

## Output Requirements

Return a JSON object with EXACTLY this structure. Do not include any text outside the JSON.

{
  "instagram": {
    "professional": "Instagram caption, professional tone, emoji-friendly, max 2200 chars",
    "casual": "Instagram caption, casual/fun tone, emoji-friendly, max 2200 chars",
    "luxury": "Instagram caption, luxury/aspirational tone, emoji-friendly, max 2200 chars"
  },
  "facebook": {
    "professional": "Facebook post, professional tone, lifestyle-focused, 500-800 words",
    "casual": "Facebook post, casual conversational tone, 500-800 words",
    "luxury": "Facebook post, luxury/aspirational tone, 500-800 words"
  },
  "twitter": "Ultra-short tweet, max 280 chars, include key stats and link placeholder [LINK]",
  "googleAds": [
    { "headline": "Max 30 chars", "description": "Max 90 chars" },
    { "headline": "Max 30 chars", "description": "Max 90 chars" },
    { "headline": "Max 30 chars", "description": "Max 90 chars" }
  ],
  "metaAd": {
    "primaryText": "Engaging ad copy for Meta/Facebook paid ad, 125 chars ideal",
    "headline": "Attention-grabbing headline, max 40 chars",
    "description": "Supporting description, max 30 chars"
  },
  "magazineFullPage": {
    "professional": { "headline": "Print headline", "body": "Full page ad body copy", "cta": "Call to action" },
    "luxury": { "headline": "Print headline", "body": "Full page ad body copy", "cta": "Call to action" }
  },
  "magazineHalfPage": {
    "professional": { "headline": "Print headline", "body": "Condensed half page body", "cta": "Call to action" },
    "luxury": { "headline": "Print headline", "body": "Condensed half page body", "cta": "Call to action" }
  },
  "postcard": {
    "professional": { "front": { "headline": "Postcard front headline", "body": "Brief teaser", "cta": "Call to action" }, "back": "Back details text" },
    "casual": { "front": { "headline": "Postcard front headline", "body": "Brief teaser", "cta": "Call to action" }, "back": "Back details text" }
  },
  "zillow": "Zillow-optimized listing description, SEO-focused, professional tone",
  "realtorCom": "Realtor.com-optimized description, warm and informative tone",
  "homesComTrulia": "Homes.com/Trulia description, detail-oriented, professional tone",
  "mlsDescription": "MLS-compliant description, max ${compliance.maxDescriptionLength || 1000} chars, professional tone. MUST include required disclosures. MUST NOT use prohibited terms.",
  "hashtags": ["15-20 hashtags mixing broad (#realestate), local (#${addr.city?.replace(/\s/g, '') || 'Montana'}homes), and niche"],
  "callsToAction": ["CTA 1", "CTA 2", "CTA 3"],
  "targetingNotes": "Audience/geo targeting recommendations with suggested radius",
  "sellingPoints": ["Top selling point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
}

IMPORTANT RULES:
- Respect ALL character limits exactly
- Use MLS compliance rules for the mlsDescription
- Never use prohibited terms in ANY output
- Make each platform's copy feel native to that platform
- Hashtags should be a mix of broad reach + local + niche (15-20 total)
- Selling points ranked by marketing impact (best first)
- All copy must be Fair Housing compliant`;
}
```

**Step 2: Create the generation function**

Create `src/lib/ai/generate.ts`:
```typescript
import OpenAI from 'openai';
import { ListingData, CampaignKit } from '@/lib/types';
import { checkCompliance, getDefaultCompliance } from '@/lib/compliance';
import { buildGenerationPrompt } from './prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCampaign(listing: ListingData): Promise<CampaignKit> {
  const prompt = buildGenerationPrompt(listing);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content:
          'You are a real estate marketing expert. Always respond with valid JSON only. No markdown, no code fences, no explanatory text.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 16000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI model');
  }

  const generated = JSON.parse(content);

  // Run MLS compliance check
  const compliance = getDefaultCompliance();
  const complianceResults = checkCompliance(generated.mlsDescription || '', compliance);

  const campaignId = crypto.randomUUID();

  return {
    id: campaignId,
    listing,
    createdAt: new Date().toISOString(),

    // Social
    instagram: generated.instagram,
    facebook: generated.facebook,
    twitter: generated.twitter,

    // Paid Ads
    googleAds: generated.googleAds,
    metaAd: generated.metaAd,

    // Print
    magazineFullPage: generated.magazineFullPage,
    magazineHalfPage: generated.magazineHalfPage,
    postcard: generated.postcard,

    // Online Listings
    zillow: generated.zillow,
    realtorCom: generated.realtorCom,
    homesComTrulia: generated.homesComTrulia,

    // MLS
    mlsDescription: generated.mlsDescription,
    mlsComplianceChecklist: complianceResults,

    // Marketing
    hashtags: generated.hashtags,
    callsToAction: generated.callsToAction,
    targetingNotes: generated.targetingNotes,
    sellingPoints: generated.sellingPoints,
  };
}
```

**Step 3: Create generate API route**

Create `src/app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ListingData } from '@/lib/types';
import { generateCampaign } from '@/lib/ai/generate';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const listing = body.listing as ListingData;

    if (!listing || !listing.address) {
      return NextResponse.json(
        { error: 'Listing data is required' },
        { status: 400 }
      );
    }

    const campaign = await generateCampaign(listing);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('Generate API error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/ai/ src/app/api/generate/
git commit -m "feat: add AI ad generation with GPT-5.2 and MLS compliance checking"
```

---

## Task 6: Landing Page (URL Input)

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/components/url-input-form.tsx`

**Step 1: Create URL input component**

Create `src/components/url-input-form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function UrlInputForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a listing URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Scrape
      setStatus('Scraping listing data...');
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const scrapeData = await scrapeRes.json();

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to scrape listing');
      }

      // Step 2: Generate
      setStatus('Generating campaign kit with AI...');
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing: scrapeData.data }),
      });
      const genData = await genRes.json();

      if (!genData.success) {
        throw new Error(genData.error || 'Failed to generate campaign');
      }

      // Store campaign in sessionStorage and navigate
      sessionStorage.setItem(`campaign-${genData.campaign.id}`, JSON.stringify(genData.campaign));
      router.push(`/campaign/${genData.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Generate Your Ad Campaign</CardTitle>
        <CardDescription>
          Paste a property listing URL and we&apos;ll create ready-to-post ads for every platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://www.zillow.com/homedetails/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Working...' : 'Generate Ads'}
            </Button>
          </div>

          {loading && status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {status}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Supports Zillow, Realtor.com, Redfin, and most MLS listing pages.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create landing page**

Replace `src/app/page.tsx`:
```tsx
import { UrlInputForm } from '@/components/url-input-form';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
          RealEstate Ad Gen
        </h1>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          Turn any property listing into a complete marketing campaign in seconds.
        </p>
      </div>

      <UrlInputForm />

      <footer className="mt-12 text-center text-xs text-slate-400 space-y-1">
        <p>Generates ads for Instagram, Facebook, Google, Twitter/X, Zillow, print &amp; more.</p>
        <p>Montana MLS compliant. Powered by AI.</p>
      </footer>
    </main>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/components/url-input-form.tsx
git commit -m "feat: add landing page with URL input form"
```

---

## Task 7: Campaign Kit Page — Layout & Property Header

**Files:**
- Create: `src/app/campaign/[id]/page.tsx`
- Create: `src/components/campaign/property-header.tsx`
- Create: `src/components/campaign/campaign-shell.tsx`

**Step 1: Create property header component**

Create `src/components/campaign/property-header.tsx`:
```tsx
import { ListingData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PropertyHeaderProps {
  listing: ListingData;
}

export function PropertyHeader({ listing }: PropertyHeaderProps) {
  const addr = listing.address;
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(', ');

  return (
    <Card>
      <CardContent className="flex flex-col md:flex-row gap-6 p-6">
        {/* Hero Photo */}
        {listing.photos[0] && (
          <div className="w-full md:w-64 h-48 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
            <img
              src={listing.photos[0]}
              alt={fullAddress}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Property Info */}
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{addr.street || 'Property'}</h2>
            <p className="text-slate-500">
              {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
            </p>
          </div>

          <p className="text-3xl font-bold text-slate-900">
            ${listing.price.toLocaleString()}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{listing.beds} Beds</Badge>
            <Badge variant="secondary">{listing.baths} Baths</Badge>
            <Badge variant="secondary">{listing.sqft.toLocaleString()} Sq Ft</Badge>
            <Badge variant="secondary">{listing.propertyType}</Badge>
            {listing.yearBuilt && (
              <Badge variant="secondary">Built {listing.yearBuilt}</Badge>
            )}
          </div>

          {listing.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.features.slice(0, 6).map((f, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {f}
                </Badge>
              ))}
              {listing.features.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{listing.features.length - 6} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create campaign shell**

Create `src/components/campaign/campaign-shell.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignKit } from '@/lib/types';
import { PropertyHeader } from './property-header';
import { CampaignTabs } from './campaign-tabs';
import { Button } from '@/components/ui/button';

export function CampaignShell() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignKit | null>(null);

  useEffect(() => {
    const id = params.id as string;
    const stored = sessionStorage.getItem(`campaign-${id}`);
    if (stored) {
      setCampaign(JSON.parse(stored));
    }
  }, [params.id]);

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-500">Campaign not found or session expired.</p>
          <Button onClick={() => router.push('/')}>Generate New Campaign</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Campaign Kit</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>
              New Campaign
            </Button>
            <Button
              onClick={() => {
                window.open(`/api/export?id=${campaign.id}&format=pdf`, '_blank');
              }}
            >
              Export All (PDF)
            </Button>
          </div>
        </div>

        <PropertyHeader listing={campaign.listing} />
        <CampaignTabs campaign={campaign} />
      </div>
    </div>
  );
}
```

**Step 3: Create campaign page**

Create `src/app/campaign/[id]/page.tsx`:
```tsx
import { CampaignShell } from '@/components/campaign/campaign-shell';

export default function CampaignPage() {
  return <CampaignShell />;
}
```

**Step 4: Commit**

```bash
git add src/app/campaign/ src/components/campaign/property-header.tsx src/components/campaign/campaign-shell.tsx
git commit -m "feat: add campaign page layout with property header"
```

---

## Task 8: Copy Button Component

**Files:**
- Create: `src/components/copy-button.tsx`

**Step 1: Create reusable copy button**

Create `src/components/copy-button.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="text-xs"
    >
      {copied ? 'Copied!' : label}
    </Button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/copy-button.tsx
git commit -m "feat: add reusable copy-to-clipboard button component"
```

---

## Task 9: Ad Card Component

**Files:**
- Create: `src/components/campaign/ad-card.tsx`

**Step 1: Create ad card with tone selector**

Create `src/components/campaign/ad-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { AdTone } from '@/lib/types';

interface AdCardProps {
  title: string;
  /** Content keyed by tone, or a single string if no tones */
  content: Record<string, string> | string;
  tones?: AdTone[];
  characterLimit?: number;
  subtitle?: string;
}

export function AdCard({ title, content, tones, characterLimit, subtitle }: AdCardProps) {
  const [activeTone, setActiveTone] = useState<string>(tones?.[0] || 'default');

  const text = typeof content === 'string' ? content : content[activeTone] || '';
  const charCount = text.length;
  const isOverLimit = characterLimit ? charCount > characterLimit : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <CopyButton text={text} />
        </div>

        {/* Tone selector pills */}
        {tones && tones.length > 1 && (
          <div className="flex gap-1 mt-2">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => setActiveTone(tone)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTone === tone
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>

        {/* Character count */}
        <div className="flex justify-end mt-2">
          <Badge variant={isOverLimit ? 'destructive' : 'secondary'} className="text-xs">
            {charCount}{characterLimit ? ` / ${characterLimit}` : ''} chars
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/ad-card.tsx
git commit -m "feat: add ad card component with tone selector and character count"
```

---

## Task 10: Print Ad Card Component

**Files:**
- Create: `src/components/campaign/print-ad-card.tsx`

**Step 1: Create print-specific card**

Create `src/components/campaign/print-ad-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { PrintAd } from '@/lib/types';

interface PrintAdCardProps {
  title: string;
  content: Record<string, PrintAd>;
  subtitle?: string;
}

export function PrintAdCard({ title, content, subtitle }: PrintAdCardProps) {
  const tones = Object.keys(content);
  const [activeTone, setActiveTone] = useState(tones[0]);
  const ad = content[activeTone];

  if (!ad) return null;

  const fullText = `${ad.headline}\n\n${ad.body}\n\n${ad.cta}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <CopyButton text={fullText} />
        </div>

        {tones.length > 1 && (
          <div className="flex gap-1 mt-2">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => setActiveTone(tone)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTone === tone
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Headline</p>
            <p className="text-lg font-bold">{ad.headline}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Body</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ad.body}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Call to Action</p>
            <p className="text-sm font-semibold text-primary">{ad.cta}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/print-ad-card.tsx
git commit -m "feat: add print ad card component for magazine and postcard ads"
```

---

## Task 11: Google Ads Card Component

**Files:**
- Create: `src/components/campaign/google-ads-card.tsx`

**Step 1: Create Google Ads card**

Create `src/components/campaign/google-ads-card.tsx`:
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { GoogleAd } from '@/lib/types';

interface GoogleAdsCardProps {
  ads: GoogleAd[];
}

export function GoogleAdsCard({ ads }: GoogleAdsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Google Ads</CardTitle>
        <p className="text-sm text-muted-foreground">3 headline + description combinations</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {ads.map((ad, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">Variation {i + 1}</p>
              <CopyButton text={`${ad.headline}\n${ad.description}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-blue-700">{ad.headline}</p>
                <Badge
                  variant={ad.headline.length > 30 ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {ad.headline.length}/30
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-600">{ad.description}</p>
                <Badge
                  variant={ad.description.length > 90 ? 'destructive' : 'secondary'}
                  className="text-xs flex-shrink-0"
                >
                  {ad.description.length}/90
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/google-ads-card.tsx
git commit -m "feat: add Google Ads card with character limit indicators"
```

---

## Task 12: Meta Ad Card Component

**Files:**
- Create: `src/components/campaign/meta-ad-card.tsx`

**Step 1: Create Meta Ad card**

Create `src/components/campaign/meta-ad-card.tsx`:
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { MetaAd } from '@/lib/types';

interface MetaAdCardProps {
  ad: MetaAd;
}

export function MetaAdCard({ ad }: MetaAdCardProps) {
  const fullText = `Primary: ${ad.primaryText}\nHeadline: ${ad.headline}\nDescription: ${ad.description}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Meta / Facebook Ad</CardTitle>
            <p className="text-sm text-muted-foreground">Paid ad format with all required fields</p>
          </div>
          <CopyButton text={fullText} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Primary Text</p>
              <Badge variant="secondary" className="text-xs">{ad.primaryText.length} chars</Badge>
            </div>
            <p className="text-sm">{ad.primaryText}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Headline</p>
              <Badge
                variant={ad.headline.length > 40 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {ad.headline.length}/40
              </Badge>
            </div>
            <p className="text-sm font-semibold">{ad.headline}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Description</p>
              <Badge
                variant={ad.description.length > 30 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {ad.description.length}/30
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{ad.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/meta-ad-card.tsx
git commit -m "feat: add Meta/Facebook paid ad card with field limits"
```

---

## Task 13: MLS Compliance Card Component

**Files:**
- Create: `src/components/campaign/mls-card.tsx`

**Step 1: Create MLS card with compliance checklist**

Create `src/components/campaign/mls-card.tsx`:
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { ComplianceCheckItem } from '@/lib/types';

interface MlsCardProps {
  description: string;
  checklist: ComplianceCheckItem[];
}

export function MlsCard({ description, checklist }: MlsCardProps) {
  const passCount = checklist.filter((c) => c.passed).length;
  const allPassed = passCount === checklist.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">MLS Description</CardTitle>
            <p className="text-sm text-muted-foreground">Montana MLS Compliant</p>
          </div>
          <CopyButton text={description} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {description}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {description.length} chars
          </Badge>
        </div>

        {/* Compliance Checklist */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">Compliance Checklist</h3>
            <Badge variant={allPassed ? 'secondary' : 'destructive'} className="text-xs">
              {passCount}/{checklist.length} passed
            </Badge>
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={item.passed ? 'text-green-600' : 'text-red-500'}>
                  {item.passed ? '✓' : '✗'}
                </span>
                <div>
                  <p className={item.passed ? 'text-slate-600' : 'text-red-700 font-medium'}>
                    {item.rule}
                  </p>
                  {item.detail && (
                    <p className="text-xs text-red-500 mt-0.5">{item.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/mls-card.tsx
git commit -m "feat: add MLS description card with compliance checklist"
```

---

## Task 14: Marketing Strategy Card

**Files:**
- Create: `src/components/campaign/marketing-card.tsx`

**Step 1: Create marketing strategy card**

Create `src/components/campaign/marketing-card.tsx`:
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';

interface MarketingCardProps {
  sellingPoints: string[];
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
}

export function MarketingCard({
  sellingPoints,
  hashtags,
  callsToAction,
  targetingNotes,
}: MarketingCardProps) {
  return (
    <div className="space-y-4">
      {/* Selling Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Selling Points</CardTitle>
          <p className="text-sm text-muted-foreground">Ranked by marketing impact</p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {sellingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="pt-0.5">{point}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Hashtags</CardTitle>
            <CopyButton text={hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-sm">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calls to Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calls to Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {callsToAction.map((cta, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <p className="text-sm font-medium">{cta}</p>
              <CopyButton text={cta} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Targeting Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Audience & Geo Targeting</CardTitle>
            <CopyButton text={targetingNotes} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {targetingNotes}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/marketing-card.tsx
git commit -m "feat: add marketing strategy cards for selling points, hashtags, CTAs, and targeting"
```

---

## Task 15: Postcard Card Component

**Files:**
- Create: `src/components/campaign/postcard-card.tsx`

**Step 1: Create postcard-specific card**

Create `src/components/campaign/postcard-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { PrintAd } from '@/lib/types';

interface PostcardCardProps {
  content: Record<string, { front: PrintAd; back: string }>;
}

export function PostcardCard({ content }: PostcardCardProps) {
  const tones = Object.keys(content);
  const [activeTone, setActiveTone] = useState(tones[0]);
  const postcard = content[activeTone];

  if (!postcard) return null;

  const fullText = `FRONT:\n${postcard.front.headline}\n${postcard.front.body}\n${postcard.front.cta}\n\nBACK:\n${postcard.back}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Postcard / Flyer</CardTitle>
            <p className="text-sm text-muted-foreground">Front headline + back details for mailers</p>
          </div>
          <CopyButton text={fullText} />
        </div>

        {tones.length > 1 && (
          <div className="flex gap-1 mt-2">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => setActiveTone(tone)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTone === tone
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Front */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">Front</p>
          <p className="text-lg font-bold">{postcard.front.headline}</p>
          <p className="text-sm">{postcard.front.body}</p>
          <p className="text-sm font-semibold text-primary">{postcard.front.cta}</p>
        </div>

        {/* Back */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">Back</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{postcard.back}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/postcard-card.tsx
git commit -m "feat: add postcard/flyer card component with front and back sections"
```

---

## Task 16: Campaign Tabs (Main Tab Layout)

**Files:**
- Create: `src/components/campaign/campaign-tabs.tsx`

**Step 1: Create the tabbed campaign layout**

Create `src/components/campaign/campaign-tabs.tsx`:
```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, AdTone } from '@/lib/types';
import { AdCard } from './ad-card';
import { GoogleAdsCard } from './google-ads-card';
import { MetaAdCard } from './meta-ad-card';
import { PrintAdCard } from './print-ad-card';
import { PostcardCard } from './postcard-card';
import { MlsCard } from './mls-card';
import { MarketingCard } from './marketing-card';

const socialTones: AdTone[] = ['professional', 'casual', 'luxury'];
const printTones: ('professional' | 'luxury')[] = ['professional', 'luxury'];

interface CampaignTabsProps {
  campaign: CampaignKit;
}

export function CampaignTabs({ campaign }: CampaignTabsProps) {
  return (
    <Tabs defaultValue="social" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="social">Social Media</TabsTrigger>
        <TabsTrigger value="paid">Paid Ads</TabsTrigger>
        <TabsTrigger value="print">Print</TabsTrigger>
        <TabsTrigger value="listings">Online Listings</TabsTrigger>
        <TabsTrigger value="mls">MLS</TabsTrigger>
        <TabsTrigger value="strategy">Strategy</TabsTrigger>
      </TabsList>

      {/* Social Media Tab */}
      <TabsContent value="social" className="space-y-4 mt-4">
        <AdCard
          title="Instagram Caption"
          content={campaign.instagram}
          tones={socialTones}
          characterLimit={2200}
          subtitle="Emoji-friendly, optimized for engagement"
        />
        <AdCard
          title="Facebook Post"
          content={campaign.facebook}
          tones={socialTones}
          subtitle="Conversational, lifestyle-focused, 500-800 words"
        />
        <AdCard
          title="Twitter / X Post"
          content={campaign.twitter}
          characterLimit={280}
          subtitle="Ultra-short, link-friendly"
        />
      </TabsContent>

      {/* Paid Ads Tab */}
      <TabsContent value="paid" className="space-y-4 mt-4">
        <GoogleAdsCard ads={campaign.googleAds} />
        <MetaAdCard ad={campaign.metaAd} />
      </TabsContent>

      {/* Print Tab */}
      <TabsContent value="print" className="space-y-4 mt-4">
        <PrintAdCard
          title="Magazine — Full Page"
          content={campaign.magazineFullPage}
          subtitle="Headline + body + CTA for full-page print placement"
        />
        <PrintAdCard
          title="Magazine — Half Page"
          content={campaign.magazineHalfPage}
          subtitle="Condensed version for smaller placements"
        />
        <PostcardCard content={campaign.postcard} />
      </TabsContent>

      {/* Online Listings Tab */}
      <TabsContent value="listings" className="space-y-4 mt-4">
        <AdCard
          title="Zillow Description"
          content={campaign.zillow}
          subtitle="Optimized for Zillow format and search SEO"
        />
        <AdCard
          title="Realtor.com Description"
          content={campaign.realtorCom}
          subtitle="Tuned to Realtor.com tone and format"
        />
        <AdCard
          title="Homes.com / Trulia Description"
          content={campaign.homesComTrulia}
          subtitle="Platform-specific variation"
        />
      </TabsContent>

      {/* MLS Tab */}
      <TabsContent value="mls" className="mt-4">
        <MlsCard
          description={campaign.mlsDescription}
          checklist={campaign.mlsComplianceChecklist}
        />
      </TabsContent>

      {/* Marketing Strategy Tab */}
      <TabsContent value="strategy" className="mt-4">
        <MarketingCard
          sellingPoints={campaign.sellingPoints}
          hashtags={campaign.hashtags}
          callsToAction={campaign.callsToAction}
          targetingNotes={campaign.targetingNotes}
        />
      </TabsContent>
    </Tabs>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campaign/campaign-tabs.tsx
git commit -m "feat: add campaign tabs layout assembling all ad card components"
```

---

## Task 17: PDF Export

**Files:**
- Create: `src/lib/export/pdf-document.tsx`
- Create: `src/lib/export/generate-pdf.tsx`
- Create: `src/app/api/export/route.ts`

**Step 1: Create PDF document component**

Create `src/lib/export/pdf-document.tsx`:
```tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CampaignKit } from '@/lib/types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#0f172a' },
  label: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { fontSize: 10, color: '#334155' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 12 },
  badge: { fontSize: 9, color: '#475569', backgroundColor: '#f1f5f9', padding: '2 6', borderRadius: 3 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
});

interface CampaignPdfProps {
  campaign: CampaignKit;
}

export function CampaignPdf({ campaign }: CampaignPdfProps) {
  const { listing: l } = campaign;
  const addr = [l.address.street, l.address.city, l.address.state, l.address.zip].filter(Boolean).join(', ');

  return (
    <Document>
      {/* Page 1: Overview + Social Media */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{l.address.street || 'Property'}</Text>
        <Text style={styles.subtitle}>{addr} — ${l.price.toLocaleString()}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{l.beds} Beds</Text>
          <Text style={styles.stat}>{l.baths} Baths</Text>
          <Text style={styles.stat}>{l.sqft.toLocaleString()} Sq Ft</Text>
          <Text style={styles.stat}>{l.propertyType}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instagram Caption (Professional)</Text>
          <Text style={styles.body}>{campaign.instagram.professional}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facebook Post (Professional)</Text>
          <Text style={styles.body}>{campaign.facebook.professional}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Twitter / X</Text>
          <Text style={styles.body}>{campaign.twitter}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>

      {/* Page 2: Paid Ads + Online Listings */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Paid Ads & Online Listings</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Ads</Text>
          {campaign.googleAds.map((ad, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Variation {i + 1}</Text>
              <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{ad.headline}</Text>
              <Text style={styles.body}>{ad.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meta / Facebook Ad</Text>
          <Text style={styles.label}>Primary Text</Text>
          <Text style={styles.body}>{campaign.metaAd.primaryText}</Text>
          <Text style={styles.label}>Headline</Text>
          <Text style={styles.body}>{campaign.metaAd.headline}</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.body}>{campaign.metaAd.description}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zillow</Text>
          <Text style={styles.body}>{campaign.zillow}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Realtor.com</Text>
          <Text style={styles.body}>{campaign.realtorCom}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Homes.com / Trulia</Text>
          <Text style={styles.body}>{campaign.homesComTrulia}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>

      {/* Page 3: Print + MLS */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Print Ads & MLS</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Magazine — Full Page (Professional)</Text>
          <Text style={styles.label}>Headline</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>{campaign.magazineFullPage.professional.headline}</Text>
          <Text style={styles.body}>{campaign.magazineFullPage.professional.body}</Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2563eb' }}>{campaign.magazineFullPage.professional.cta}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Magazine — Half Page (Professional)</Text>
          <Text style={styles.label}>Headline</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>{campaign.magazineHalfPage.professional.headline}</Text>
          <Text style={styles.body}>{campaign.magazineHalfPage.professional.body}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MLS Description (Montana)</Text>
          <Text style={styles.body}>{campaign.mlsDescription}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>

      {/* Page 4: Marketing Strategy */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Marketing Strategy</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Points</Text>
          {campaign.sellingPoints.map((point, i) => (
            <Text key={i} style={styles.body}>{i + 1}. {point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hashtags</Text>
          <Text style={styles.body}>{campaign.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calls to Action</Text>
          {campaign.callsToAction.map((cta, i) => (
            <Text key={i} style={styles.body}>• {cta}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audience & Geo Targeting</Text>
          <Text style={styles.body}>{campaign.targetingNotes}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>
    </Document>
  );
}
```

**Step 2: Create PDF generation utility**

Create `src/lib/export/generate-pdf.tsx`:
```typescript
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { CampaignKit } from '@/lib/types';
import { CampaignPdf } from './pdf-document';

export async function generatePdfBuffer(campaign: CampaignKit): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(CampaignPdf, { campaign })
  );
  return Buffer.from(buffer);
}
```

**Step 3: Create export API route**

Create `src/app/api/export/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CampaignKit } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign, format } = body as { campaign: CampaignKit; format: 'pdf' | 'csv' | 'json' };

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign data is required' }, { status: 400 });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(campaign, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="campaign-${campaign.id}.json"`,
        },
      });
    }

    if (format === 'csv') {
      const rows = buildCsvRows(campaign);
      const csv = rows.map((r) => r.map(escCsv).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="campaign-${campaign.id}.csv"`,
        },
      });
    }

    // PDF
    const { generatePdfBuffer } = await import('@/lib/export/generate-pdf');
    const pdfBuffer = await generatePdfBuffer(campaign);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="campaign-${campaign.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

function escCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function buildCsvRows(c: CampaignKit): string[][] {
  const header = ['Platform', 'Tone', 'Content', 'Character Count'];
  const rows: string[][] = [header];

  // Social
  for (const tone of ['professional', 'casual', 'luxury'] as const) {
    rows.push(['Instagram', tone, c.instagram[tone], String(c.instagram[tone].length)]);
    rows.push(['Facebook', tone, c.facebook[tone], String(c.facebook[tone].length)]);
  }
  rows.push(['Twitter/X', '', c.twitter, String(c.twitter.length)]);

  // Paid
  c.googleAds.forEach((ad, i) => {
    rows.push([`Google Ad ${i + 1}`, '', `${ad.headline} | ${ad.description}`, String(ad.headline.length + ad.description.length)]);
  });
  rows.push(['Meta Ad', '', `${c.metaAd.primaryText} | ${c.metaAd.headline} | ${c.metaAd.description}`, '']);

  // Listings
  rows.push(['Zillow', 'professional', c.zillow, String(c.zillow.length)]);
  rows.push(['Realtor.com', 'professional', c.realtorCom, String(c.realtorCom.length)]);
  rows.push(['Homes.com/Trulia', 'professional', c.homesComTrulia, String(c.homesComTrulia.length)]);

  // MLS
  rows.push(['MLS Description', 'professional', c.mlsDescription, String(c.mlsDescription.length)]);

  // Hashtags
  rows.push(['Hashtags', '', c.hashtags.join(' '), String(c.hashtags.length)]);

  return rows;
}
```

**Step 4: Update campaign shell to support export**

In `src/components/campaign/campaign-shell.tsx`, update the "Export All (PDF)" button handler to POST the campaign data:

Replace the Export button `onClick` in `campaign-shell.tsx`:
```tsx
<Button
  onClick={async () => {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, format: 'pdf' }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }}
>
  Export All (PDF)
</Button>
```

**Step 5: Commit**

```bash
git add src/lib/export/ src/app/api/export/ src/components/campaign/campaign-shell.tsx
git commit -m "feat: add PDF, CSV, and JSON export functionality"
```

---

## Task 18: App Layout & Global Styles

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update layout**

Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RealEstate Ad Gen — AI-Powered Property Marketing',
  description:
    'Generate ready-to-post ads for Instagram, Facebook, Google, Zillow, print, and more from any property listing URL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Ensure globals.css has Tailwind directives**

`src/app/globals.css` should have (create-next-app with Tailwind usually sets this, but verify):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Keep any shadcn/ui CSS variables that were added during `npx shadcn init`. Remove any default Next.js demo styles.

**Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "chore: update layout with metadata and clean global styles"
```

---

## Task 19: Build & Smoke Test

**Step 1: Build the project**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Fix any type errors**

If build fails, read errors carefully and fix. Common issues:
- Missing imports
- Type mismatches in campaign data
- React PDF server-side rendering issues (may need `dynamic` import)

**Step 3: Start dev server and test**

```bash
npm run dev
```

Open http://localhost:3000 — verify:
- Landing page renders with URL input
- Form validates empty/invalid URLs
- (Don't test scraping/generation without API key — just verify UI renders)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues from initial implementation"
```

---

## Task 20: CSV/JSON Export Buttons in UI

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx`

**Step 1: Add CSV and JSON export buttons**

In `campaign-shell.tsx`, add dropdown or extra buttons next to the PDF export:

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={() => router.push('/')}>
    New Campaign
  </Button>
  <Button
    variant="outline"
    onClick={async () => {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, format: 'csv' }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }}
  >
    Export CSV
  </Button>
  <Button
    onClick={async () => {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, format: 'pdf' }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }}
  >
    Export PDF
  </Button>
</div>
```

**Step 2: Commit**

```bash
git add src/components/campaign/campaign-shell.tsx
git commit -m "feat: add CSV and JSON export buttons to campaign page"
```

---

## Summary of Tasks

| # | Task | Key Files | Est. |
|---|------|-----------|------|
| 1 | Project Scaffolding | package.json, next.config, tailwind | ~5 min |
| 2 | TypeScript Types | src/lib/types/* | ~3 min |
| 3 | MLS Compliance Config | src/lib/compliance/* | ~3 min |
| 4 | Listing Scraper | src/lib/scraper/*, api/scrape | ~5 min |
| 5 | AI Ad Generation | src/lib/ai/*, api/generate | ~5 min |
| 6 | Landing Page | src/app/page.tsx, url-input-form | ~3 min |
| 7 | Campaign Page Layout | campaign/[id]/page, header, shell | ~5 min |
| 8 | Copy Button | copy-button.tsx | ~2 min |
| 9 | Ad Card Component | ad-card.tsx | ~3 min |
| 10 | Print Ad Card | print-ad-card.tsx | ~3 min |
| 11 | Google Ads Card | google-ads-card.tsx | ~3 min |
| 12 | Meta Ad Card | meta-ad-card.tsx | ~3 min |
| 13 | MLS Card | mls-card.tsx | ~3 min |
| 14 | Marketing Strategy Card | marketing-card.tsx | ~3 min |
| 15 | Postcard Card | postcard-card.tsx | ~3 min |
| 16 | Campaign Tabs | campaign-tabs.tsx | ~3 min |
| 17 | PDF Export | export/*, api/export | ~5 min |
| 18 | App Layout & Styles | layout.tsx, globals.css | ~2 min |
| 19 | Build & Smoke Test | — | ~5 min |
| 20 | CSV/JSON Export Buttons | campaign-shell.tsx | ~2 min |

---

## Dependency Graph

```
Task 1 (scaffold) ← everything depends on this
  ├── Task 2 (types) ← Tasks 3-17 depend on this
  │   ├── Task 3 (compliance) ← Tasks 5, 13
  │   ├── Task 4 (scraper) ← Task 6
  │   ├── Task 5 (AI generation) ← Task 6
  │   ├── Task 8 (copy button) ← Tasks 9-15
  │   ├── Tasks 9-15 (UI components) ← Task 16
  │   ├── Task 16 (campaign tabs) ← Task 7
  │   ├── Task 7 (campaign page) ← Task 17, 20
  │   └── Task 17 (PDF export) ← Task 20
  ├── Task 6 (landing page) — independent after 4+5
  └── Task 18 (layout/styles) — independent after 1
Task 19 (build test) — after everything
Task 20 (CSV buttons) — after 17
```

## Parallel Execution Groups

These tasks can be executed simultaneously within each group:

- **Group A (after Task 2):** Tasks 3, 4, 5, 8, 18
- **Group B (after Group A):** Tasks 6, 9, 10, 11, 12, 13, 14, 15
- **Group C (after Group B):** Tasks 7, 16, 17
- **Group D (after Group C):** Tasks 19, 20
