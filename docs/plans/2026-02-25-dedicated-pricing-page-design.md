# Dedicated Pricing Page — Design Document

**Status:** Draft
**Date:** 2026-02-25
**Author:** Brainstormer Agent

---

## Problem Statement

The `/pricing` page exists with functional tier cards and Stripe checkout, but it is **undiscoverable and isolated**:

1. **No way in.** Zero navigation links point to `/pricing` from the landing page, header, mobile drawer, or footer. Users can only reach it via direct URL or internal upgrade prompts (which require being logged in and hitting a gated feature).
2. **No way out.** The pricing page renders no `AppHeader` or `Footer`. Visitors who land on `/pricing` (e.g., from a search engine or shared link) have no navigation back to the main site.
3. **Bare page structure.** The page has a title, a `PricingTable`, and a one-line FAQ link — no trust signals, no secondary conversion path for undecided visitors.

The pricing section was recently removed from the landing page (commit `3e9a0bf`) with the stated intent of moving it to a dedicated page, but the dedicated page was never wired into the site's navigation or fleshed out as a standalone conversion-focused page.

---

## Current State Audit

### What exists and works

| Component | Status | Notes |
|---|---|---|
| `src/app/pricing/page.tsx` | Functional | Server component, reads user tier + Stripe prices |
| `src/components/pricing/pricing-table.tsx` | Functional | Monthly/annual toggle, 3-column plan grid, Stripe checkout |
| `src/components/pricing/plan-card.tsx` | Functional | Individual tier card with features, CTA, gold-highlighted Pro |
| `/api/billing/create-checkout` | Functional | Creates Stripe Checkout sessions |
| `src/components/ui/upgrade-prompt.tsx` | Functional | Links to `/pricing` from gated features |

### What's missing

| Gap | Impact |
|---|---|
| No "Pricing" link in landing header | Users can't discover pricing from the homepage |
| No "Pricing" link in mobile drawer | Mobile users have no path to pricing |
| No "Pricing" link in footer | No persistent site-wide pricing link |
| No `AppHeader` on pricing page | No brand identity or navigation on the page |
| No `Footer` on pricing page | Dead-end page, no legal links, no brand reinforcement |
| No FAQ section on pricing page | Common questions unanswered (the link to `/faq` is a 404) |
| No bottom CTA for undecided visitors | Single conversion path only (plan cards) |
| No structured data (Product schema) | Missed SEO opportunity for pricing rich results |

---

## Approaches

### Approach A: Navigation Wiring Only (Minimal)

Add `AppHeader` and `Footer` to the pricing page. Add a "Pricing" link to the landing header, mobile drawer, and site footer. No content changes to the page itself.

**Pros:**
- Smallest change set (~5 files modified)
- Addresses the two core gaps: discoverability and navigation
- Fast to implement

**Cons:**
- Pricing page remains bare — title, cards, one-line footer
- The `/faq` link on the page is a 404 (no FAQ page exists)
- No secondary conversion path for undecided visitors
- Misses easy conversion wins (trust signals, FAQ, bottom CTA)

### Approach B: Enhanced Pricing Page + Navigation (Recommended)

Everything in Approach A, plus:
- Add a pricing-specific FAQ section below the pricing table
- Add a trust bar ("All plans include fair housing compliance", "No credit card for Free", "Cancel anytime")
- Add a bottom CTA section for visitors who scroll past pricing
- Fix the broken `/faq` link (point it to the on-page FAQ section via anchor)
- Add Product structured data for SEO

**Pros:**
- Addresses all acceptance criteria comprehensively
- Better conversion funnel with multiple touchpoints
- Reuses existing brand patterns (trust checkmarks from `CTAFooter`, droplet bullets)
- Broken link fixed
- Still focused — no unnecessary complexity

**Cons:**
- More files touched (~8-9 files modified, 1-2 new components)
- Slightly more implementation time

### Approach C: Full Feature Comparison Matrix Redesign

Everything in Approach B, plus:
- Replace plan cards with a full-width feature comparison table (rows = features, columns = tiers)
- Add enterprise contact/demo request form
- Add testimonials section

**Cons (disqualifying):**
- Over-engineering: Enterprise features are still "coming soon", no testimonials exist
- The existing `PlanCard` component is well-designed and brand-consistent — replacing it adds risk
- Feature comparison tables perform worse on mobile than card layouts
- Unnecessary complexity for a 3-tier system where differences are clear

---

## Recommended Design: Approach B

### Architecture

The pricing page becomes a full standalone page with the same navigation shell as the landing page. No new routes — we enhance the existing `/pricing` route and wire it into navigation.

```
┌─────────────────────────────────────────────────┐
│  AppHeader (variant="landing")                  │
│  [Logo]              [Pricing] [Log In] [Sign Up]│
├─────────────────────────────────────────────────┤
│                                                  │
│  Page Header                                     │
│  "Simple, Transparent Pricing"                   │
│  "Start free. Upgrade when you need more..."     │
│                                                  │
│  Trust Bar                                       │
│  ✓ Fair housing compliance  ✓ Cancel anytime     │
│  ✓ No credit card for Free                       │
│                                                  │
│  [Monthly] [Annual ← Save 2 months]             │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Free   │  │   Pro    │  │Enterprise│       │
│  │  $0/mo   │  │  $9/mo   │  │ $29/mo   │      │
│  │ features │  │ features │  │ features │       │
│  │  [CTA]   │  │  [CTA]   │  │  [CTA]   │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  FAQ Section (pricing-specific)                  │
│  "Can I switch plans?"                           │
│  "What happens when I hit my campaign limit?"    │
│  "How does billing work?"                        │
│                                                  │
│  Bottom CTA                                      │
│  "Ready to upgrade your marketing?"              │
│  [Get Started Free]                              │
│                                                  │
├─────────────────────────────────────────────────┤
│  Footer                                          │
│  [Terms] [Privacy] [Cookies] [Disclaimer]        │
│  [Pricing]                                       │
└─────────────────────────────────────────────────┘
```

### Component Changes

#### 1. Pricing Page (`src/app/pricing/page.tsx`)

**Current:** Bare `<main>` with header text and `<PricingTable>`.

**New:** Full page with `<AppHeader>`, trust bar, `<PricingTable>`, FAQ accordion, bottom CTA, and `<Footer>`. The trust bar and FAQ section are inline in this page — no separate components needed (YAGNI). The bottom CTA reuses the existing `CTAFooter` component with pricing-specific copy.

The page remains a **Server Component** — it already fetches the user's tier server-side. The `AppHeader` handles its own client-side auth check for the landing variant, so no changes to data flow are needed.

**SEO:** Add `Product` structured data (JSON-LD) for the three tiers, enabling pricing rich results in search.

#### 2. Navigation Links (`src/components/nav/nav-links.ts`)

Add a new exported array for **landing-specific links** (currently the landing header has no configurable nav links — it hardcodes Log In / Sign Up). This keeps the existing `appLinks` and `adminLinks` untouched.

Alternatively, since the landing header has special rendering logic (no nav link array is used), the "Pricing" link is added directly to the `AppHeader` landing variant JSX. This is simpler and avoids introducing a new nav array for a single link.

**Decision: Add "Pricing" directly to AppHeader landing variant.** A single link doesn't justify a new nav array abstraction.

#### 3. App Header (`src/components/nav/app-header.tsx`)

**Landing variant, desktop (anonymous):** Add a "Pricing" text link before "Log In".

```
[Logo]                    [Pricing]  [Log In]  [Sign Up]
```

**Landing variant, desktop (authenticated):** Add a "Pricing" text link before the Dashboard/Admin button.

```
[Logo]                    [Pricing]  [Dashboard]
```

#### 4. Mobile Drawer (`src/components/nav/mobile-drawer.tsx`)

**Landing variant (anonymous):** Add a "Pricing" link in the auth links section (after "Start Creating Ads", before "Log In").

**Landing variant (authenticated):** Add a "Pricing" link below the Dashboard CTA.

#### 5. Footer (`src/components/nav/footer.tsx`)

Add a "Pricing" link to the footer nav alongside the legal links. Place it first (before Terms) since it's a product link, not a legal link.

#### 6. FAQ Content

Hardcoded pricing FAQ items (not from the admin settings system — those are landing-page FAQs). Content:

1. **"Can I change plans anytime?"** — Yes. Upgrade instantly, downgrade at period end. Manage everything from Settings > Billing.
2. **"What happens when I hit my campaign limit?"** — You'll see a notice. Campaigns reset on the 1st of each month, or upgrade for more.
3. **"Do I need a credit card to start?"** — No. The Free tier requires no payment information.
4. **"Is my payment information secure?"** — All payments are processed by Stripe. We never see or store your card details.
5. **"What's included in fair housing compliance?"** — Every plan includes automated compliance scanning that checks your ad copy against federal Fair Housing Act guidelines.

These are rendered as a simple accordion/disclosure pattern using `<details>`/`<summary>` elements (no external dependency needed). Styled to match the brand.

### Data Flow

No changes to data flow. The existing pattern works:

1. Server component fetches user tier (optional, catches errors for anonymous users)
2. Server reads Stripe price IDs from env vars
3. Both are passed to `<PricingTable>` as props
4. `PricingTable` handles client-side billing cycle toggle and checkout redirect

### Mobile Responsiveness

The existing `PricingTable` already uses `grid-cols-1 md:grid-cols-3`, which stacks cards on mobile. The new sections (trust bar, FAQ, bottom CTA) follow the same responsive pattern:

- **Trust bar:** `flex flex-wrap justify-center` — wraps naturally on mobile
- **FAQ:** Full-width accordion, no grid needed
- **Bottom CTA:** Centered text block, already responsive (reuses `CTAFooter`)

### Styling Consistency

All new elements use the existing design tokens:
- **Colors:** `text-cream`, `text-muted-foreground`, `text-gold`, `bg-background`, `bg-surface`, `border-border`
- **Typography:** `font-serif` for headings, `font-sans` (Space Grotesk) for body
- **Spacing:** `py-20`, `px-6`, `max-w-7xl mx-auto` (matches landing page sections)
- **Brand elements:** Droplet-shaped bullets (`droplet-shape`), gold accent checks, pill-shaped CTA buttons

---

## Files Modified

| File | Action | Description |
|---|---|---|
| `src/app/pricing/page.tsx` | Modify | Add AppHeader, trust bar, FAQ section, CTAFooter, Footer, structured data |
| `src/components/nav/app-header.tsx` | Modify | Add "Pricing" link to landing variant (desktop) |
| `src/components/nav/mobile-drawer.tsx` | Modify | Add "Pricing" link to landing variant (both auth states) |
| `src/components/nav/footer.tsx` | Modify | Add "Pricing" link to footer nav |

**No new component files.** The trust bar and FAQ are inline in the pricing page. The bottom CTA reuses `CTAFooter`.

---

## What We're NOT Building

- **Feature comparison table** — The 3-tier card layout is clear enough. Tables are worse on mobile.
- **Enterprise contact form** — Enterprise features (team seats, custom branding) are "coming soon". A contact form for vaporware hurts credibility.
- **Testimonials section** — No testimonials exist yet. Don't add an empty or fake section.
- **Animated page transitions** — The landing page uses Framer Motion entrance animations, but the pricing page is a utility page. Keep it fast and scannable.
- **Admin-configurable FAQ** — The landing page FAQs are admin-configurable. Pricing FAQs are static product facts that change with code, not CMS content.
- **A/B testing infrastructure** — Premature. Get the page live first, optimize later.

---

## Open Questions

None. The existing pricing infrastructure (Stripe integration, tier system, plan cards, checkout flow) is fully built. This design only addresses page presentation and navigation — no backend changes needed.

---

## Success Criteria Mapping

| Acceptance Criterion | How It's Met |
|---|---|
| Clean, focused pricing page with clear tiers | Existing PricingTable + trust bar + FAQ section |
| Easy navigation back to main site | AppHeader (variant="landing") with logo link + nav links |
| Clear CTAs for each pricing tier | Existing PlanCard CTAs (Get Started / Upgrade / Current Plan) |
| Mobile responsive design | Existing responsive grid + new sections use flex-wrap |
| Consistent with main site styling | Same AppHeader, Footer, design tokens, brand elements |
