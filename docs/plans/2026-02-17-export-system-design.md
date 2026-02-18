# Export System Redesign

**Date:** 2026-02-17
**Status:** Approved (revised after team review)
**Scope:** Campaign export, sharing, email delivery, print PDF, MLS cleanup, character warnings

---

## Problem Statement

The current export system provides a text-only PDF and a CSV. Neither includes photos, only the professional tone is exported, the MLS section hardcodes "Montana," and there is no way to share a campaign with clients or marketing teams. Per-card export buttons exist but are permanently disabled.

Users need platform-ready assets they can actually use — correctly sized photos, organized copy documents, and a way to share everything with one link or email.

---

## Design Overview

Six features, in priority order:

1. **Platform-sized photo exports** — auto-crop all photos to each platform's dimensions
2. **ZIP bundle download** — photos + single campaign PDF in one download
3. **Shareable preview link** — public read-only campaign page, 7-day default expiry
4. **Email to client/team** — send share link + summary via Resend
5. **Print-ready PDF** — professional layout with photos and all tone variants
6. **MLS-ready paste + character count warnings** — sanitized copy, visible limits on every card

### Dependencies

**Add:** `sharp`, `archiver`, `resend`, `@types/archiver`
**Remove:** `puppeteer` (installed but unused anywhere in src/ — confirmed safe to remove)

---

## Infrastructure & Security

These concerns apply across all features and must be addressed during implementation.

### Sharp + Standalone Build Compatibility

The project uses `output: "standalone"` in `next.config.ts`. Sharp requires native binaries that are often excluded from standalone output. **Resolution:** Configure `outputFileTracingIncludes` in `next.config.ts` to explicitly include sharp's native modules. If deployment is Vercel, test with their build pipeline and fall back to `@vercel/og` image processing if needed.

### Serverless Timeout / Memory for ZIP Generation

A campaign with 10 photos across 6 platform sizes = 60+ sharp resize operations. On serverless (Vercel: 60s pro timeout, ~1GB memory), this risks timeout or OOM. **Resolution:** Process photos in batches (not all 60 in parallel), stream results into archiver as each completes. If a single request still exceeds limits, fall back to a chunked approach: pre-process photos on upload (background), then ZIP assembly just packages pre-existing files.

### SSRF Protection on Photo Endpoint

The `/api/export/photo` endpoint accepts a `photoUrl` and fetches server-side. **Resolution:** Validate that `photoUrl` matches the Supabase storage domain (`qunrofzwejafqzssmkpa.supabase.co`) before fetching. Reject all other origins. This prevents internal network scanning via crafted URLs.

### Auth Strategy: Session OR Share Token

Authenticated routes (campaign owner) use `requireAuth()` + `user_id` ownership check, matching the existing pattern in `src/app/api/export/route.ts`. Public routes (share page visitors) authenticate via valid, non-expired share token. Export endpoints (`/api/export/photo`, `/api/export/bundle`) accept EITHER a valid session OR a valid share token — dual-auth check.

### Rate Limiting

All public endpoints (`/share/[token]`, public bundle/photo downloads) must be rate-limited:
- Share page views: 60/min per IP
- Bundle downloads: 5/min per IP
- Photo downloads: 30/min per IP
- Email sends: 10/day per user

### Email Security

- Validate email format (RFC 5322) before sending
- Maximum 10 recipients per send
- Rate limit: 10 emails per user per day
- Emails sent individually (not BCC) for proper delivery tracking

### CSP Considerations

`next.config.ts` restricts `img-src` to specific domains including the Supabase storage domain. The share page and resized photo endpoints must serve from allowed origins. Document this constraint — if photo storage origins change, CSP must be updated.

---

## 1. Platform-Sized Photo Exports

### What It Does

Takes ALL of the user's uploaded property photos and auto-crops/resizes them to each platform's required dimensions using `sharp` server-side.

### Platform Dimensions

| Platform | Size | Aspect Ratio | Use Case |
|----------|------|--------------|----------|
| Instagram Post | 1080x1080 | 1:1 | Feed posts, carousels |
| Instagram Story | 1080x1920 | 9:16 | Stories/reels cover |
| Facebook Post | 1200x630 | ~1.91:1 | Feed posts |
| Twitter/X Post | 1600x900 | 16:9 | Tweet images |
| LinkedIn Post | 1200x627 | ~1.91:1 | Feed posts, agent networking |

### Technical Approach

- **New API route:** `POST /api/export/photo`
- **Accepts:** `{ photoUrl: string, platform: string }`
- **Validation:** `photoUrl` must match Supabase storage domain (SSRF protection)
- **Auth:** Session OR valid share token (dual-auth)
- **Process:** Fetch source image → `sharp` center-crop to target dimensions → output JPEG at 90% quality
- **Returns:** Resized image as blob download
- **All photos exported:** Every photo in `listing.photos[]` gets resized per platform, not just the hero. Instagram carousels use up to 10 photos — agents want all their listing photos sized correctly.
- **Why sharp:** Purpose-built for image processing. 10x faster than puppeteer, fraction of the memory, no headless browser overhead.

### Crop Strategy

Smart center-crop. The source image is resized to cover the target dimensions (maintaining aspect ratio), then cropped from center. This works well for real estate photos where the subject is typically centered. No manual crop UI — if the auto-crop is bad, the user can upload a different photo.

### Per-Card Export Button

The currently disabled Export button in `ad-card-wrapper.tsx` becomes a **"Download Photo"** button. Clicking it downloads that platform's correctly sized photo (hero image by default). If the campaign has multiple photos, it downloads a ZIP of all photos sized for that platform. The existing "Copy Ad Text" button remains separate.

---

## 2. ZIP Bundle Download

### What It Does

One-click "Download All" that packages every platform's assets into a single organized ZIP.

### Bundle Structure

```
123-Main-St/
  Instagram-1080x1080-01.jpg
  Instagram-1080x1080-02.jpg
  Instagram-1080x1080-03.jpg
  Instagram-Story-1080x1920-01.jpg
  Instagram-Story-1080x1920-02.jpg
  Instagram-Story-1080x1920-03.jpg
  Facebook-1200x630-01.jpg
  Facebook-1200x630-02.jpg
  Facebook-1200x630-03.jpg
  Twitter-1600x900-01.jpg
  Twitter-1600x900-02.jpg
  Twitter-1600x900-03.jpg
  LinkedIn-1200x627-01.jpg
  LinkedIn-1200x627-02.jpg
  LinkedIn-1200x627-03.jpg
  Originals/
    photo-01.jpg
    photo-02.jpg
    photo-03.jpg
  Campaign-Full.pdf
```

**Design decisions:**
- **Flat structure** — no nested platform folders. Platform name is the file prefix. Non-technical agents find files faster at one level.
- **All photos per platform** — every uploaded photo is resized for every selected platform, numbered sequentially.
- **Originals folder** — un-cropped source photos included for custom designs, flyers, etc.
- **Single PDF** — one comprehensive `Campaign-Full.pdf` instead of 6 separate PDFs. Agents can use the share page or app tabs for individual sections. Fewer files = less decision paralysis.
- **Named with street address** — no "CampaignExport" prefix. The folder name is the address, which is what agents care about.

### Technical Approach

- **New API route:** `POST /api/export/bundle`
- **Accepts:** `{ campaignId: string }`
- **Auth:** Session OR valid share token (dual-auth)
- **Process:** Fetch campaign → process photos through sharp in batches (not all at once — see Infrastructure section) → generate PDF via @react-pdf/renderer → stream ZIP with `archiver`
- **Only includes platforms the user selected** (reads `selectedPlatforms` from CampaignKit, also checks DB `platform` column as fallback since both locations are used)
- **Why archiver:** Streams directly to the response. Better memory profile than jszip for large bundles.

### UI

- "Download All" button in the campaign header, alongside existing CSV/PDF buttons
- Progress indicator with file count: "Preparing 12 photos + 1 document..." (not a generic spinner)
- Downloads as `{address}.zip`

---

## 3. Shareable Preview Link

### What It Does

Agent clicks "Share" and gets a public URL. Recipients see a read-only view of the campaign with download capability.

### Database Changes

Two new columns on `campaigns` table:

| Column | Type | Notes |
|--------|------|-------|
| `share_token` | UUID | Nullable, unique index |
| `share_expires_at` | timestamptz | Set to NOW() + 7 days on creation (default) |

Migration file: `supabase/migrations/20260217_add_share_columns.sql` (follows existing `YYYYMMDD_` naming convention).

### How It Works

- **Generate:** `PUT /api/campaign/[id]/share` — creates token + expiry, returns the share URL. Accepts optional `{ expiry: '48h' | '7d' | '30d' }` parameter, defaults to `7d`.
- **View:** `/share/[token]` — public route, no auth required. Checks token exists AND `share_expires_at > NOW()`. Shows expired page if past due.
- **Expired page:** Clean message with "This link has expired. Please contact the sender for a new link." No other actions available.
- **Revoke:** `DELETE /api/campaign/[id]/share` — nulls out token and expiry
- **Regenerate:** Agent can generate a new link anytime (new token, fresh expiry window). **Shows confirmation dialog** before regenerating: "This will invalidate the previous link. Anyone with the old link will lose access."
- **No auth middleware conflict:** No `middleware.ts` exists in the project currently. If one is added later, `/share/*` must be excluded.

### Share Page Layout

- **Mobile-first responsive design** — clients will open these on their phones
- Property hero photo + address/price/beds/baths/sqft header
- Sections grouped by category: Social, Paid Ads, Listings, Print, Strategy
- **All tone variants visible** — Instagram and Facebook show professional/casual/luxury tabs within their sections
- Copy button on each text block
- **"Copy All" button per section** — grabs all text in that section at once (marketing teams want to grab everything, not click 6 times)
- "Download All" button at the top (triggers ZIP bundle via share token auth)
- Clean, minimal design — no app navigation, sidebar, or editing capability
- Thumb-friendly tap targets on mobile

### Campaign Shell UI

- New "Share" button next to existing export buttons
- Clicking opens a popover with:
  - The share link
  - Copy-to-clipboard button
  - Expiry selector (48 hours / 7 days / 30 days)
  - "Revoke Link" toggle
  - Expiry countdown ("Expires in 6 days")

---

## 4. Email to Client/Team

### What It Does

Agent sends a professional email containing the share link and campaign summary.

### Technical Approach

- **Email provider:** Resend (modern API, generous free tier at 100 emails/day)
- **New API route:** `POST /api/campaign/[id]/email`
- **Accepts:** `{ to: string[], message?: string }`
- **Validation:** RFC 5322 email format, max 10 recipients per send, 10 emails/user/day rate limit
- **Auto-generates share link** if one doesn't exist (or if expired, regenerates with 7-day expiry)
- **Emails sent individually** (not BCC) for proper delivery and privacy

### Email Contents

- Property hero photo (embedded)
- Address, price, beds/baths/sqft
- Agent's optional personal message
- "View Campaign" button → share link
- "Download All Assets" button → direct ZIP download URL
- List of platforms generated (so recipient knows what's included)
- Footer with expiry note ("This link expires in 7 days")

### Why No Attachments

Email attachment limits (25MB for Gmail, other providers) would fail with multiple high-res photos. The share link approach is more reliable and lets recipients browse before downloading.

### UI

- "Email" button next to Share button
- Opens a modal with:
  - **"Send to myself" quick button** — auto-fills with logged-in user's email (agents want to preview before sending to clients)
  - Email input (supports multiple addresses, comma-separated)
  - **Recent recipients** — shows last 5 email addresses used (stored in localStorage, no backend needed)
  - Optional message textarea
  - Send button
- Toast confirmation on success

---

## 5. Print-Ready PDF

### What It Does

Replaces the current text-only PDF with a professionally laid out document including property photos and all tone variants.

### Page Layout

| Section | Content |
|---------|---------|
| **Cover** | Hero photo (full width), address, price, beds/baths/sqft, agent name/brokerage if available |
| **Social Media** | Instagram (professional, casual, luxury), Facebook (professional, casual, luxury), Twitter, Hashtags |
| **Paid Ads** | Google Ads variations (headline + description table), Meta Ad fields (primary text, headline, description) |
| **Listings** | Zillow, Realtor.com, Homes/Trulia, MLS Description (using `listing.address.state` — NOT hardcoded) |
| **Print** | Postcard (professional/casual), Magazine Full (professional/luxury), Magazine Half (professional/luxury) |
| **Strategy** | Selling points, calls to action, targeting notes |

### Technical Approach

- Rewrites `pdf-document.tsx` with the new layout
- Still uses `@react-pdf/renderer` — no new dependency needed
- Property photos: `@react-pdf/renderer`'s `Image` component fetches URLs directly from Supabase storage (public URLs, no additional auth needed). Photos are fetched inside `generatePdfBuffer`, not passed from the route handler.
- Clean typography, consistent spacing, subtle section dividers
- All tone variants included (not just professional)
- MLS label reads from `campaign.listing.address.state`, falls back to `campaign.stateCode`, handles empty string as falsy
- Postcard content explicitly added (was missing from previous PDF despite existing in CampaignKit)

### This PDF Is Reused

- The "Export PDF" button in campaign-shell downloads this document
- The ZIP bundle includes it as `Campaign-Full.pdf`

---

## 6. MLS-Ready Paste & Character Count Warnings

### MLS-Ready Paste

**Fix hardcoded "Montana":**
Replace `"MLS Description (Montana)"` in pdf-document.tsx (line 151) with `campaign.listing.address.state`, falling back to `campaign.stateCode` if unavailable. Check for empty string, not just undefined/null.

**Sanitized copy for MLS systems:**
When copying MLS description text, run through a sanitize function:
- Smart quotes (`\u201c` `\u201d`) → straight quotes (`"`)
- Curly apostrophes (`\u2019`) → straight apostrophe (`'`)
- Em dash (`\u2014`) / en dash (`\u2013`) → hyphen (`-`)
- Strip zero-width characters, BOM markers
- Normalize whitespace (no double spaces, no trailing whitespace)
- **Strip emoji** — AI-generated text sometimes includes emoji that MLS systems reject

This only applies to the MLS card's copy button — other platforms handle Unicode and emoji fine.

### Character Count Warnings

**Limits by platform:**

| Platform | Element | Limit | Notes |
|----------|---------|-------|-------|
| Twitter/X | Full tweet | 280 | Hard limit |
| Google Ads | Headline | 30 | Hard limit |
| Google Ads | Description | 90 | Hard limit |
| Meta Ad | Primary text | 125 | Before "see more" truncation |
| Meta Ad | Headline | 40 | Hard limit |
| Meta Ad | Description | 30 | Hard limit |
| Instagram | Caption (visible) | 125 | Before "more" truncation |
| Instagram | Caption (total) | 2,200 | Hard limit |
| Facebook | Post (visible) | 477 | Before "see more" truncation |
| Zillow | Description | 4,500 | Approximate limit |
| Realtor.com | Description | 5,000 | Approximate limit |
| Homes.com/Trulia | Description | 4,000 | Approximate limit |
| MLS | Description | 2,000 | Safe default, varies by provider |

**Note:** The existing `zillow-card.tsx` hardcodes a 2000 char check — this should be corrected to 4500 during implementation.

**UI treatment:**
- `CharacterCount` component used inside `AdCardWrapper`, positioned in the controls/header area (not overlaid on the mockup)
- Small badge always visible: `142/280`
- Badge turns yellow within 10% of limit
- Badge turns red when over limit
- Inline message when over: "Exceeds Twitter's 280 character limit by 12 characters"
- For platforms with both visible and hard limits (Instagram, Facebook), show both: `125/125 visible | 892/2200 total`
- Purely informational — does not block any action

**Configuration:**
A `PLATFORM_CHAR_LIMITS` config object in `src/lib/export/platform-dimensions.ts` maps platform → element → limit. The `CharacterCount` component receives the platform ID and text, looks up the limit, and renders accordingly.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/export/photo/route.ts` | Platform-sized photo endpoint (dual-auth, SSRF-protected) |
| `src/app/api/export/bundle/route.ts` | ZIP bundle endpoint (dual-auth, batched processing) |
| `src/app/api/campaign/[id]/share/route.ts` | Share link CRUD (generate, revoke, regenerate) |
| `src/app/api/campaign/[id]/email/route.ts` | Email delivery endpoint (Resend, rate-limited) |
| `src/app/share/[token]/page.tsx` | Public share page (mobile-first, no auth) |
| `src/lib/export/photo-resize.ts` | Sharp-based photo processing with SSRF validation |
| `src/lib/export/bundle.ts` | ZIP assembly logic with batched photo processing |
| `src/lib/export/platform-dimensions.ts` | Platform size configs + character limit configs |
| `src/lib/export/sanitize-mls.ts` | MLS text sanitization (quotes, dashes, emoji, whitespace) |
| `src/components/campaign/character-count.tsx` | Character count badge component |
| `src/components/campaign/share-popover.tsx` | Share link popover UI with expiry selector |
| `src/components/campaign/email-modal.tsx` | Email campaign modal UI with recent recipients |
| `supabase/migrations/20260217_add_share_columns.sql` | share_token + share_expires_at columns |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/export/pdf-document.tsx` | Complete rewrite — new layout with photos, all tones, dynamic state label, postcard content |
| `src/lib/export/generate-pdf.tsx` | Update to support new PDF layout (photos fetched internally via Image component) |
| `src/app/api/export/route.ts` | Update PDF generation call, fix CSV to include all platforms (postcard, magazine, selling points, CTAs, targeting) |
| `src/components/campaign/campaign-shell.tsx` | Add Share, Email, Download All buttons |
| `src/components/campaign/ad-card-wrapper.tsx` | Replace disabled Export with "Download Photo" button, add CharacterCount component |
| `src/components/campaign/zillow-card.tsx` | Fix hardcoded 2000 char limit to 4500 |
| `next.config.ts` | Add `outputFileTracingIncludes` for sharp native modules |
| `package.json` | Add sharp, archiver, resend, @types/archiver; remove puppeteer |

---

## Deferred (Out of Scope)

- Manual crop/adjust tool for photos (auto-crop only for now)
- Direct platform API integration (Meta Business Suite, Google Ads API)
- DOCX export format
- PIN-protected share links
- Email tracking/analytics
- Custom email templates or branding
- Google Ads Display image dimensions (sized image alone isn't useful without ad campaign setup)
- Facebook Cover dimensions (agents rarely use listing photos as page covers)
- Separate grouped PDFs in ZIP (single comprehensive PDF is sufficient)
