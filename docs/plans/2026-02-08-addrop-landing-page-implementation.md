# AdDrop Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the landing page as a dark, premium marketing site for "AdDrop" with hero, platform bar, how-it-works, showcase carousel, features grid, and CTA footer. Move the MLS input form to its own `/create` route.

**Architecture:** The landing page (`src/app/page.tsx`) becomes a pure marketing page with no app functionality. The existing MLS input form moves to a new `/create` route. Design system shifts to dark mode with gold/amber accents. All new landing page sections are built as components under `src/components/landing/`.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Lucide icons, existing shadcn/ui components (Button, Card, Badge). No new dependencies.

---

### Task 1: Update design system — dark theme + gold accents

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

**Step 1: Update CSS variables for dark landing page**

In `src/app/globals.css`, update the `:root` variables to a dark-first palette. Add a new `--gold` accent variable:

```css
:root {
    --background: 222 47% 6%;
    --foreground: 210 40% 98%;
    --card: 222 47% 8%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 8%;
    --popover-foreground: 210 40% 98%;
    --primary: 43 96% 56%;
    --primary-foreground: 222 47% 6%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 55%;
    --accent: 43 96% 56%;
    --accent-foreground: 222 47% 6%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 43 96% 56%;
    --gold: 43 96% 56%;
    --gold-muted: 43 96% 40%;
    --chart-1: 43 96% 56%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
}
```

Keep the `.dark` block as-is (it's already dark). The light theme IS the dark theme now.

**Step 2: Add gold color to Tailwind config**

In `tailwind.config.ts`, add inside `theme.extend.colors`:

```typescript
gold: {
  DEFAULT: 'hsl(var(--gold))',
  muted: 'hsl(var(--gold-muted))',
},
```

**Step 3: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat: update design system to dark theme with gold accents"
```

---

### Task 2: Update root layout metadata for AdDrop

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update metadata and add dark body class**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AdDrop — AI-Powered Real Estate Marketing',
  description: 'Turn any property listing into a complete ad campaign across 12+ platforms in seconds. Instagram, Facebook, Google, print, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>{children}</body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update metadata and branding to AdDrop"
```

---

### Task 3: Create the `/create` route for the MLS input form

**Files:**
- Create: `src/app/create/page.tsx`

**Step 1: Create the new page**

Create `src/app/create/page.tsx`:

```typescript
import { MlsInputForm } from '@/components/mls-input-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreatePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Create Your Campaign
          </h1>
          <p className="text-muted-foreground">
            Enter your property details and we'll generate ads for every platform.
          </p>
        </div>

        <MlsInputForm />
      </div>
    </main>
  );
}
```

**Step 2: Verify the route works**

Run: `npx next dev` and navigate to `http://localhost:3000/create`
Expected: The property form renders with a back link to home.

**Step 3: Commit**

```bash
git add src/app/create/page.tsx
git commit -m "feat: add /create route for MLS input form"
```

---

### Task 4: Build the Hero section component

**Files:**
- Create: `src/components/landing/hero.tsx`

**Step 1: Create the Hero component**

Create `src/components/landing/hero.tsx`:

```typescript
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Logo/Brand */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
          Ad<span className="text-gold">Drop</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
          One listing. Every ad. Instantly.
        </p>

        {/* Subtitle */}
        <p className="text-base text-muted-foreground/70 mb-10 max-w-xl mx-auto">
          Turn any property listing into a complete marketing campaign across 12+ platforms — powered by AI.
        </p>

        {/* CTA */}
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-gold text-background font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gold-muted transition-colors"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/landing/hero.tsx
git commit -m "feat: add Hero section component"
```

---

### Task 5: Build the Platform Logo Bar component

**Files:**
- Create: `src/components/landing/platform-bar.tsx`

**Step 1: Create the PlatformBar component**

Create `src/components/landing/platform-bar.tsx`:

```typescript
import {
  Instagram,
  Facebook,
  Search,
  Twitter,
  Home,
  Newspaper,
  Mail,
  LayoutGrid,
} from 'lucide-react';

const platforms = [
  { name: 'Instagram', icon: Instagram },
  { name: 'Facebook', icon: Facebook },
  { name: 'Google Ads', icon: Search },
  { name: 'Twitter/X', icon: Twitter },
  { name: 'Zillow', icon: Home },
  { name: 'Realtor.com', icon: LayoutGrid },
  { name: 'Print', icon: Newspaper },
  { name: 'Direct Mail', icon: Mail },
];

export function PlatformBar() {
  return (
    <section className="py-12 border-y border-border/50">
      <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-widest">
        Generate ads for
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 px-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <platform.icon className="w-6 h-6" />
            <span className="text-xs">{platform.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/landing/platform-bar.tsx
git commit -m "feat: add PlatformBar section component"
```

---

### Task 6: Build the How It Works section component

**Files:**
- Create: `src/components/landing/how-it-works.tsx`

**Step 1: Create the HowItWorks component**

Create `src/components/landing/how-it-works.tsx`:

```typescript
import { Search, Sparkles, Download } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Enter your MLS#',
    description: 'Drop in your listing number and we pull the property details automatically.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI builds your campaign',
    description: 'In seconds, get professional ad copy tailored for every platform and tone.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download & publish',
    description: 'Copy, export, or download — your ads are ready to go live immediately.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
          Three steps. That's it.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
            >
              {/* Step number */}
              <span className="text-5xl font-bold text-gold/10 absolute top-4 right-4">
                {step.number}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-gold" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/landing/how-it-works.tsx
git commit -m "feat: add HowItWorks section component"
```

---

### Task 7: Build the Showcase Carousel component

**Files:**
- Create: `src/components/landing/showcase-carousel.tsx`

**Step 1: Create the ShowcaseCarousel component**

This is an interactive carousel showing example ad outputs. Uses hardcoded sample data. The carousel is client-side with useState for slide navigation.

Create `src/components/landing/showcase-carousel.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Instagram, Facebook, Search, Mail, Newspaper } from 'lucide-react';

interface ShowcaseSlide {
  platform: string;
  icon: React.ElementType;
  accentColor: string;
  headline: string;
  body: string;
  meta?: string;
}

const slides: ShowcaseSlide[] = [
  {
    platform: 'Instagram',
    icon: Instagram,
    accentColor: 'from-purple-500 to-pink-500',
    headline: '@premierhomes',
    body: '✨ Just Listed — 4 bed, 3 bath stunner in Whitefish, MT. Vaulted ceilings, chef\'s kitchen, and mountain views from every window. This one won\'t last.\n\n📍 123 Glacier View Dr\n💰 $875,000\n🏡 2,450 sq ft on 0.5 acres\n\n#MontanaRealEstate #WhitefishMT #JustListed #LuxuryLiving #MountainViews',
    meta: '2,200 characters · Professional tone',
  },
  {
    platform: 'Facebook',
    icon: Facebook,
    accentColor: 'from-blue-500 to-blue-600',
    headline: 'Premier Homes Montana',
    body: '🏠 NEW LISTING ALERT!\n\nNestled in the heart of Whitefish, this beautifully updated 4-bedroom home offers the perfect blend of mountain charm and modern comfort. Open-concept living, a gourmet kitchen, and a wraparound deck with panoramic views.\n\nSchedule your private showing today!',
    meta: 'Friendly tone · Ready to post',
  },
  {
    platform: 'Google Ads',
    icon: Search,
    accentColor: 'from-green-500 to-emerald-500',
    headline: 'Whitefish MT Home — 4 Bed $875K',
    body: 'Mountain views, chef\'s kitchen, 2,450 sqft. Schedule your showing today. Premier Homes Montana — Your Trusted Local Agent.',
    meta: 'Headline: 28/30 chars · Description: 87/90 chars',
  },
  {
    platform: 'Postcard',
    icon: Mail,
    accentColor: 'from-emerald-500 to-teal-500',
    headline: 'Your Dream Home Awaits',
    body: 'Stunning 4-bedroom home in Whitefish with mountain views, gourmet kitchen, and luxury finishes throughout. 2,450 sq ft of refined living on half an acre.',
    meta: 'Front + Back · Professional tone',
  },
  {
    platform: 'Magazine Ad',
    icon: Newspaper,
    accentColor: 'from-amber-500 to-orange-500',
    headline: 'Where Elegance Meets the Mountains',
    body: 'An exceptional 4-bedroom residence offering panoramic mountain views, artisan finishes, and unparalleled Whitefish living. This is Montana luxury, redefined.',
    meta: 'Full page · Luxury tone',
  },
];

export function ShowcaseCarousel() {
  const [current, setCurrent] = useState(0);

  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          See What AdDrop Creates
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
          Real examples from a single property listing.
        </p>

        {/* Carousel container */}
        <div className="relative">
          {/* Card */}
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Platform header */}
            <div className={`px-6 py-4 bg-gradient-to-r ${slide.accentColor} flex items-center gap-3`}>
              <Icon className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">{slide.platform}</span>
            </div>

            {/* Content */}
            <div className="p-8">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                {slide.headline}
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
                {slide.body}
              </p>
              {slide.meta && (
                <p className="text-xs text-muted-foreground/60 border-t border-border/50 pt-4">
                  {slide.meta}
                </p>
              )}
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full transition-all ${
                index === current ? 'w-8 bg-gold' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/landing/showcase-carousel.tsx
git commit -m "feat: add ShowcaseCarousel section component"
```

---

### Task 8: Build the Features Grid component

**Files:**
- Create: `src/components/landing/features-grid.tsx`

**Step 1: Create the FeaturesGrid component**

Create `src/components/landing/features-grid.tsx`:

```typescript
import {
  LayoutGrid,
  Sparkles,
  ShieldCheck,
  Download,
  Palette,
  Monitor,
} from 'lucide-react';

const features = [
  {
    icon: LayoutGrid,
    title: '12+ Ad Platforms',
    description: 'One listing, every channel covered — social, search, print, and direct mail.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Copy',
    description: 'Intelligent ad copy tailored to each platform\'s format and audience.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Built-In',
    description: 'Montana MLS compliant out of the box. Fair housing violations auto-detected.',
  },
  {
    icon: Download,
    title: 'One-Click Export',
    description: 'Download your entire campaign as PDF or CSV — ready for your team.',
  },
  {
    icon: Palette,
    title: 'Multiple Tones',
    description: 'Professional, luxury, casual, urgent — get the right voice for every listing.',
  },
  {
    icon: Monitor,
    title: 'Platform Mockups',
    description: 'See exactly how your ads look on Instagram, Facebook, and more before publishing.',
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Everything You Need
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
          Built for real estate agents who want to market smarter, not harder.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/landing/features-grid.tsx
git commit -m "feat: add FeaturesGrid section component"
```

---

### Task 9: Build the CTA Footer component

**Files:**
- Create: `src/components/landing/cta-footer.tsx`

**Step 1: Create the CTAFooter component**

Create `src/components/landing/cta-footer.tsx`:

```typescript
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTAFooter() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to drop your next campaign?
        </h2>
        <p className="text-muted-foreground mb-10">
          Stop spending hours writing ad copy. Let AdDrop handle it in seconds.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-gold text-background font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gold-muted transition-colors"
        >
          Start Creating Ads
          <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-6 text-xs text-muted-foreground/50">
          No account required. Free to try.
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/landing/cta-footer.tsx
git commit -m "feat: add CTAFooter section component"
```

---

### Task 10: Assemble the landing page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace the landing page with assembled sections**

Replace the entire contents of `src/app/page.tsx`:

```typescript
import { Hero } from '@/components/landing/hero';
import { PlatformBar } from '@/components/landing/platform-bar';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { CTAFooter } from '@/components/landing/cta-footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <PlatformBar />
      <HowItWorks />
      <ShowcaseCarousel />
      <FeaturesGrid />
      <CTAFooter />
    </main>
  );
}
```

**Step 2: Run the dev server and verify**

Run: `npx next dev`
Expected: Landing page renders with all 6 sections in order, dark theme, gold accents.

**Step 3: Verify the /create route still works**

Navigate to `http://localhost:3000/create`
Expected: The property form renders correctly with the dark theme.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble AdDrop landing page with all sections"
```

---

### Task 11: Fix campaign page for dark theme compatibility

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx` (if needed)

**Step 1: Check that the campaign results page still looks correct**

Navigate to a campaign page and verify:
- Cards render with readable text on dark background
- Mockup sections (Instagram, Facebook) still use their internal white backgrounds
- Buttons, badges, and compliance indicators are visible

The ad card components (instagram-card, facebook-card, etc.) use hardcoded white backgrounds for their mockups internally, so those should be fine. The outer card shells use theme variables — check these render correctly.

**Step 2: If any adjustments are needed, fix the specific components**

Most likely candidates for fixes:
- `bg-slate-50` backgrounds in Google Ads card → may need `bg-secondary` instead
- `text-slate-700` text colors → may need `text-foreground` or `text-muted-foreground`
- Any hardcoded light colors outside of platform mockups

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: ensure campaign cards render correctly with dark theme"
```

---

### Task 12: Final visual QA and polish

**Step 1: Run the dev server and review the full flow**

Run: `npx next dev`

Check:
1. Landing page: All sections visible, dark theme, gold accents, no broken layouts
2. Hero CTA button → navigates to `/create`
3. `/create` page: Form renders, back link works
4. Submit a test campaign → campaign results page works
5. Mobile responsiveness: Check at 375px width
6. Carousel navigation: Previous/next arrows and dots work

**Step 2: Fix any visual issues found**

Address spacing, alignment, color, or responsive issues.

**Step 3: Final commit**

```bash
git add -A
git commit -m "polish: final visual QA fixes for AdDrop landing page"
```
