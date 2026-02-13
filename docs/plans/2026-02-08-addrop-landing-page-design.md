# AdDrop Landing Page Design

## Overview

Redesign the landing page for "AdDrop" (formerly "RealEstate Ad Gen") — a real estate AI marketing tool that turns MLS listings into full ad campaigns across 12+ platforms.

## Key Decisions

- **Name:** AdDrop
- **Aesthetic:** Dark & premium — dark backgrounds, subtle gradients, gold/amber accents, luxury real estate feel
- **Goal:** Explain the service first, then convert (the MLS input form lives on its own separate page, NOT on the landing page)
- **Showcase:** Interactive carousel with hardcoded example outputs for now (later populated via scraper + admin panel)

## Page Flow & Sections

### 1. Hero Section

- Large "AdDrop" branding/logotype
- Tagline: something punchy about turning listings into campaigns instantly
- Brief 1-liner subtitle explaining the value
- Primary CTA button: "Get Started" → links to `/campaign` or a dedicated input page
- Dark background with subtle gradient or ambient glow effect
- Gold/amber accent on the CTA button

### 2. Platform Logo Bar

- Horizontal row of supported platform icons/logos
- Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, MLS, Print/Magazine
- Subtle styling — muted/grayscale icons that feel premium, not cluttered
- Could include a label like "Generate ads for" or "Works with"

### 3. How It Works

- 3-step visual flow:
  1. Enter your MLS# (icon: search/input)
  2. AI generates your campaign (icon: sparkle/magic)
  3. Download & publish (icon: download/share)
- Each step gets a short title + 1-line description
- Numbered or connected with a visual line/flow
- Dark cards or glass-morphism style containers

### 4. Showcase Carousel

- Interactive swipeable/scrollable carousel
- Shows example ad outputs across different platforms:
  - Instagram post mockup
  - Facebook ad mockup
  - Google Ads text ad
  - Postcard/direct mail mockup
  - Print magazine ad mockup
- Each slide is a polished, realistic-looking mockup
- Navigation dots or arrows for browsing
- Hardcoded example data for now (future: populated from scraper via admin panel)

### 5. Features/Benefits Grid

- 2x3 or 3x2 grid of feature cards
- Key selling points:
  - "12+ Ad Platforms" — One listing, every channel covered
  - "AI-Powered" — Intelligent copy tailored per platform
  - "Compliance Built-In" — Montana MLS compliant out of the box
  - "One-Click Export" — PDF & CSV ready to go
  - "Multiple Tones" — Professional, luxury, casual, urgent
  - "Platform Mockups" — See exactly how ads look before publishing
- Each card: icon + title + short description
- Dark card style with subtle borders or glow

### 6. CTA Footer

- Final conversion push
- Repeated tagline or alternate hook
- CTA button: "Start Creating Ads" or "Try AdDrop Free"
- Minimal, clean, dark background

## Design System Updates

- **Background:** Dark slate/near-black (`slate-950` or custom dark)
- **Text:** White primary, `slate-400` secondary
- **Accent:** Gold/amber (`amber-400` / `amber-500`) for CTAs, highlights, accents
- **Cards:** Dark with subtle borders (`slate-800` border, `slate-900` bg), optional glassmorphism
- **Typography:** Keep Inter, but make headings bolder with more size contrast
- **Animations:** Subtle fade-ins on scroll, smooth carousel transitions

## Technical Notes

- The landing page is `src/app/page.tsx` — this gets redesigned
- The MLS input form moves to its own route (e.g., `/create` or `/generate`)
- The existing campaign results page at `/campaign/[id]` stays as-is
- Showcase carousel uses hardcoded example data (static JSON or inline)
- Platform logos can use Lucide icons or simple SVGs
- No new dependencies needed — Tailwind + existing UI components should suffice

## Out of Scope (for now)

- Testimonials section
- Pricing section
- Admin panel for showcase management
- Authentication / user accounts
- Real data in the showcase (hardcoded for now)
