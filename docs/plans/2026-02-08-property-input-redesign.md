# Property Input Redesign: MLS# Lookup + Manual Entry

**Date:** 2026-02-08
**Status:** Approved

## Overview

Replace the current URL-based scraping approach with two primary input methods for real estate agents:

1. **MLS# Lookup** — agent enters a listing number, app searches public listing sites and scrapes the data
2. **Manual Entry** — agent fills in property details directly

Both paths feed into an **editable property form** where the agent can review, modify, and enhance the data before generating their ad campaign.

## Goals

- More reliable than direct URL scraping — MLS numbers are universal and stable
- Give agents full control over their listing data before generation
- Simpler tech stack — remove Puppeteer/headless browser dependency
- Future-proof architecture — drop-in slot for real MLS API integration later

## Input Flow

### Path A: MLS# Lookup

1. Agent enters an MLS number (e.g., `30025432`)
2. App constructs search URLs and scrapes in a fallback chain:
   - **Primary:** Realtor.com (most reliable MLS# URL patterns)
   - **Fallback 1:** Redfin
   - **Fallback 2:** Zillow
3. Scraped data populates the editable property form
4. If no results found on any site: "Listing not found — enter details manually"

### Path B: Manual Entry

1. Agent clicks "Enter Manually" or just starts filling in the form
2. Empty form with all property fields
3. MLS# field is optional (for display/compliance on generated ads)

### Convergence

Both paths land on the same editable property form → "Generate Campaign" button.

## Editable Property Form

### Property Details (structured fields)

| Field | Type | Required |
|-------|------|----------|
| Street address | text | yes |
| City | text | yes |
| State | text | yes |
| Zip | text | yes |
| Price | currency | yes |
| Beds | number | yes |
| Baths | number | yes |
| Sqft | number | yes |
| Property type | dropdown (Residential, Condo, Townhouse, Land, Commercial) | yes |
| Year built | number | no |
| Lot size | text | no |
| MLS# | text | no |

### Listing Info

| Field | Type | Required |
|-------|------|----------|
| Listing agent name | text | no |
| Brokerage name | text | no |

These fields support compliance badge display on generated ads.

### Description

- Text area pre-filled with scraped description (fully editable)
- "Selling Points" section below — bullet-point inputs for agent highlights (e.g., "New roof 2024", "Walking distance to downtown")
- AI uses both the description and selling points as source material for ad copy generation

### Photos

- Grid of thumbnails from scrape results
- Remove: click X on any photo
- Reorder: drag-and-drop (first photo = default hero image)
- Add: upload button for agent's own photos
- After campaign generation, individual ad cards retain the existing per-ad image picker for swapping photos on specific ads

### Actions

- "Generate Campaign" button at the bottom of the form

## Architecture & Data Flow

```
MLS# Input → URL Resolver → Existing Scraper → Editable Form → Generate API → Campaign Kit
```

### What Changes

| Component | Change |
|-----------|--------|
| **New: MLS# → URL resolver** | Constructs search URLs from MLS numbers with fallback chain |
| **New: Editable property form** | Form component with all fields, photo management, description editing |
| **Modified: Campaign shell** | Replaces URL input with MLS# input + manual entry toggle |
| **Modified: ListingData type** | Add optional `mlsNumber` field |

### What Stays the Same

| Component | Notes |
|-----------|-------|
| Scraper core (`index.ts`, `parsers.ts`) | HTTP/Cheerio scraping logic unchanged |
| AI generation pipeline | Consumes `ListingData` as before |
| Ad card components | All card types unchanged |
| Image picker/carousel | Per-ad photo assignment unchanged |
| Compliance engine | Montana MLS rules unchanged |
| Property header | Display component unchanged |

### Future MLS API Slot

The editable form accepts `ListingData` regardless of source. When a real MLS API is added later:
- The MLS API returns `ListingData` instead of the scraper
- Everything downstream (form, generation, ads, compliance) stays the same
- No architectural changes needed — just swap the data source

## Removals

| File | Reason |
|------|--------|
| `src/lib/scraper/redfin.ts` | Dedicated Puppeteer-based Redfin scraper — unnecessary |
| `src/lib/scraper/browser.ts` | Browser-based scraping utilities — unnecessary |
| URL input form | Replaced by MLS# input + editable property form |

**Puppeteer dependency** can potentially be dropped entirely, resulting in lighter deploys and no headless browser issues.

## Summary

1. MLS# input replaces URL input as the primary entry point
2. Editable property form sits between data fetch and campaign generation
3. Manual entry is the same form, unfilled
4. Per-ad photo assignment continues working as-is
5. Architecture stays clean with a future MLS API drop-in slot
6. Puppeteer/browser scraping gets removed — simpler stack

---
