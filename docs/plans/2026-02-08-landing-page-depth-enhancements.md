# AdDrop Landing Page Depth Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the AdDrop landing page from a functional static site into a premium, animated, conversion-optimized marketing experience with social proof, diverse content, and rich interactions.

**Architecture:** Phased enhancement of 6 existing components + 4 new components + 1 new dependency (Framer Motion). Server components stay server where possible; only add `'use client'` when interaction requires it. All animations respect `prefers-reduced-motion`.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 3.4, Framer Motion 11, Lucide React, shadcn/ui patterns

---

## Phase 1: Foundation — Install Framer Motion + Scroll Animation Wrapper

### Task 1: Install Framer Motion

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `npm install framer-motion`
Expected: framer-motion added to package.json dependencies

**Step 2: Verify installation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install framer-motion for scroll animations"
```

---

### Task 2: Create Reusable ScrollReveal Wrapper Component

**Files:**
- Create: `src/components/ui/scroll-reveal.tsx`

**Step 1: Create the ScrollReveal component**

This is a reusable wrapper that fades + slides children into view on scroll. Used by every section.

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

const directionOffset = {
  up: { y: 30 },
  down: { y: -30 },
  left: { x: 30 },
  right: { x: -30 },
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.6,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration, ease: [0.25, 0.46, 0.45, 0.94] }}
      viewport={{ once: true, margin: '-50px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/scroll-reveal.tsx
git commit -m "feat: add ScrollReveal wrapper component for scroll animations"
```

---

## Phase 2: Hero Section Overhaul

### Task 3: Enhanced Hero — Animated Glows + Gradient Text + Shimmer Button

**Files:**
- Modify: `src/components/landing/hero.tsx` (convert to client component)
- Modify: `src/app/globals.css` (add shimmer keyframe)

**Step 1: Add shimmer keyframe to globals.css**

Add to the end of `src/app/globals.css`:

```css
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```

**Step 2: Rewrite hero.tsx with animations**

Replace the full content of `src/components/landing/hero.tsx` with:

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Primary gold glow — larger, animated pulse */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/8 rounded-full blur-[120px] pointer-events-none"
        animate={prefersReduced ? {} : {
          scale: [1, 1.1, 1],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Secondary warm glow — offset, slower */}
      <motion.div
        className="absolute top-[40%] left-[55%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"
        animate={prefersReduced ? {} : {
          scale: [1, 1.15, 1],
          opacity: [0.05, 0.09, 0.05],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content with staggered entrance */}
      <motion.div
        className="relative z-10 max-w-3xl"
        initial={prefersReduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.h1
          className="text-6xl md:text-8xl font-bold tracking-tight mb-6"
          initial={prefersReduced ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          Ad
          <span className="bg-gradient-to-r from-gold to-amber-400 bg-clip-text text-transparent">
            Drop
          </span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground mb-4"
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          Your Listing. 12 Platforms. Zero Effort.
        </motion.p>

        <motion.p
          className="text-base text-muted-foreground/70 max-w-xl mx-auto mb-10"
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          Paste your MLS number and get a complete ad campaign — Instagram, Facebook, Google, print, direct mail — in under 60 seconds.
        </motion.p>

        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Link
            href="/create"
            className="group inline-flex items-center gap-2 bg-gold text-background font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gold-muted hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/20 transition-all duration-300"
            style={{
              backgroundImage: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
              animation: prefersReduced ? 'none' : 'shimmer 3s ease-in-out infinite',
            }}
          >
            Start Creating Ads
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/landing/hero.tsx src/app/globals.css
git commit -m "feat: enhance hero with animated glows, gradient text, shimmer CTA, and new messaging"
```

---

## Phase 3: Platform Bar — Color-Reveal Hover

### Task 4: Platform Bar with Brand Color Hover States

**Files:**
- Modify: `src/components/landing/platform-bar.tsx`

**Step 1: Update platform data with brand colors and add hover states**

Replace the full content of `src/components/landing/platform-bar.tsx` with:

```tsx
import {
  Facebook,
  Home,
  Instagram,
  LayoutGrid,
  Mail,
  Newspaper,
  Search,
  Twitter,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const platforms = [
  { name: 'Instagram', icon: Instagram, hoverColor: 'hover:text-pink-500' },
  { name: 'Facebook', icon: Facebook, hoverColor: 'hover:text-blue-500' },
  { name: 'Google Ads', icon: Search, hoverColor: 'hover:text-green-500' },
  { name: 'Twitter/X', icon: Twitter, hoverColor: 'hover:text-sky-500' },
  { name: 'Zillow', icon: Home, hoverColor: 'hover:text-blue-400' },
  { name: 'Realtor.com', icon: LayoutGrid, hoverColor: 'hover:text-red-500' },
  { name: 'Print', icon: Newspaper, hoverColor: 'hover:text-amber-500' },
  { name: 'Direct Mail', icon: Mail, hoverColor: 'hover:text-emerald-500' },
];

export function PlatformBar() {
  return (
    <section className="py-12 border-y border-border/50">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-xs text-muted-foreground/50 uppercase tracking-widest text-center mb-8">
          Generate ads for
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {platforms.map((platform, index) => (
            <ScrollReveal key={platform.name} delay={index * 0.06} direction="up">
              <div
                className={`flex flex-col items-center gap-2 text-muted-foreground/50 ${platform.hoverColor} hover:scale-110 transition-all duration-200 cursor-default`}
              >
                <platform.icon className="w-6 h-6" />
                <span className="text-xs">{platform.name}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Note: PlatformBar stays a server component but uses the ScrollReveal client component for animations.

**Step 3: Commit**

```bash
git add src/components/landing/platform-bar.tsx
git commit -m "feat: add brand color hover states and staggered entrance to platform bar"
```

---

## Phase 4: How It Works — Connected Flow

### Task 5: How It Works with Connector Lines and Staggered Entrance

**Files:**
- Modify: `src/components/landing/how-it-works.tsx`

**Step 1: Rewrite with connector lines and scroll animations**

Replace the full content of `src/components/landing/how-it-works.tsx` with:

```tsx
import { Download, Search, Sparkles } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Enter your MLS#',
    description:
      'Paste any MLS number or enter property details manually. We pull everything we need automatically.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI builds your campaign',
    description:
      'Our AI generates platform-optimized ad copy in multiple tones — professional, friendly, luxury, and more.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download & publish',
    description:
      'Export ready-to-post ads for Instagram, Facebook, Google, print, direct mail, and more. One click.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Three steps. That&apos;s it.
          </p>
        </ScrollReveal>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-gold/0 via-gold/20 to-gold/0" />

          {steps.map((step, index) => (
            <ScrollReveal key={step.number} delay={index * 0.2}>
              <div className="relative p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                <span className="text-5xl font-bold text-gold/15 absolute top-4 right-4 select-none">
                  {step.number}
                </span>
                <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/landing/how-it-works.tsx
git commit -m "feat: add connector line and staggered scroll animations to How It Works"
```

---

## Phase 5: Showcase Carousel — Diversified Content + Platform Tabs + Auto-Play

### Task 6: Rewrite Showcase Carousel with Diverse Properties, Platform Tabs, and Auto-Play

**Files:**
- Modify: `src/components/landing/showcase-carousel.tsx`

**Step 1: Full rewrite of showcase carousel**

Replace the full content of `src/components/landing/showcase-carousel.tsx` with:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Mail,
  Newspaper,
  Search,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

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
    headline: '@metroluxrealty',
    body: `NEW LISTING | Downtown Chicago penthouse living at its finest.\n\nFloor-to-ceiling windows. Private terrace. 40th-floor skyline views.\n\n📍 401 N Wabash Ave, Unit PH-4\n💰 $2,150,000\n🏙️ 3 bed · 3.5 bath · 2,800 sq ft\n\nThis is the one you've been scrolling for.\n\n#ChicagoRealEstate #PenthouseLiving #JustListed #LuxuryRealEstate`,
    meta: '2,100 characters · Luxury tone',
  },
  {
    platform: 'Facebook',
    icon: Facebook,
    accentColor: 'from-blue-500 to-blue-600',
    headline: 'Sunrise Realty Group',
    body: `🏡 FIRST-TIME BUYERS — This one's for you!\n\nCharming 3-bedroom ranch in a quiet cul-de-sac. Updated kitchen, fenced backyard, and just minutes from top-rated schools.\n\nMove-in ready at $285,000. Yes, really.\n\n👉 DM us or comment 'INFO' for details!`,
    meta: 'Friendly tone · Engagement-optimized',
  },
  {
    platform: 'Google Ads',
    icon: Search,
    accentColor: 'from-green-500 to-emerald-500',
    headline: 'Waterfront Home — Lake Tahoe | $1.4M',
    body: 'Private dock, 5 bed/4 bath, 180° lake views. Open house this Saturday. Sierra Lakeshore Properties — Trusted Since 1998.',
    meta: 'Headline: 29/30 chars · Description: 89/90 chars',
  },
  {
    platform: 'Postcard',
    icon: Mail,
    accentColor: 'from-emerald-500 to-teal-500',
    headline: '40 Acres of Montana Freedom',
    body: 'Year-round creek, mature timber, and mountain views in every direction. 20 minutes to Kalispell, fully off-grid ready. Build your legacy at $425,000.',
    meta: 'Front + Back · Aspirational tone',
  },
  {
    platform: 'Magazine Ad',
    icon: Newspaper,
    accentColor: 'from-amber-500 to-orange-500',
    headline: 'Prime Retail Space — Downtown Bozeman',
    body: '4,200 sq ft corner unit on Main Street. High foot traffic, modern build-out, anchor tenants on either side. NNN lease available. Ideal for restaurant, boutique, or professional office.',
    meta: 'Half page · Professional tone',
  },
];

export function ShowcaseCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReduced = useReducedMotion();

  const goNext = useCallback(
    () => setCurrent((prev) => (prev + 1) % slides.length),
    []
  );
  const goPrev = useCallback(
    () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length),
    []
  );

  // Auto-play
  useEffect(() => {
    if (isPaused || prefersReduced) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [isPaused, prefersReduced, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  const slide = slides[current];

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            See What AdDrop Creates
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Real examples. Different properties. Every platform.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          {/* Platform tab selector */}
          <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto pb-2">
            {slides.map((s, index) => (
              <button
                key={s.platform}
                onClick={() => { setCurrent(index); setIsPaused(true); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  index === current
                    ? 'bg-card border border-gold/30 text-foreground shadow-sm shadow-gold/10'
                    : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-card/50'
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.platform}</span>
              </button>
            ))}
          </div>

          {/* Carousel card */}
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            role="region"
            aria-label="Ad showcase carousel"
          >
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              {/* Platform header */}
              <div
                className={`px-6 py-4 bg-gradient-to-r ${slide.accentColor} flex items-center gap-3`}
              >
                <slide.icon className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{slide.platform}</span>
              </div>

              {/* Slide content with AnimatePresence */}
              <div className="p-8 min-h-[280px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <h3 className="text-lg font-semibold mb-4">{slide.headline}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                      {slide.body}
                    </p>
                    {slide.meta && (
                      <p className="mt-6 text-xs text-muted-foreground/50">
                        {slide.meta}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={() => { goPrev(); setIsPaused(true); }}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-gold/30 hover:scale-110 transition-all duration-200"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => { goNext(); setIsPaused(true); }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-gold/30 hover:scale-110 transition-all duration-200"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/landing/showcase-carousel.tsx
git commit -m "feat: diversify carousel with 5 unique properties, add platform tabs and auto-play"
```

---

## Phase 6: Features Grid — Hero Cards + Hover Polish

### Task 7: Enhanced Features Grid with Spotlight Cards and Hover Effects

**Files:**
- Modify: `src/components/landing/features-grid.tsx`

**Step 1: Rewrite features grid**

Replace the full content of `src/components/landing/features-grid.tsx` with:

```tsx
import {
  Download,
  LayoutGrid,
  Monitor,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const features = [
  {
    icon: LayoutGrid,
    title: '12+ Ad Platforms',
    description:
      'Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print, direct mail — all from one listing.',
    spotlight: true,
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Built-In',
    description:
      'Automatic fair housing compliance checking. Montana MLS rules enforced. More states coming soon.',
    spotlight: true,
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Copy',
    description:
      'Professional ad copy that sounds human. Trained specifically for real estate marketing.',
    spotlight: false,
  },
  {
    icon: Download,
    title: 'One-Click Export',
    description:
      'Download your entire campaign as ready-to-post assets. No reformatting needed.',
    spotlight: false,
  },
  {
    icon: Palette,
    title: 'Multiple Tones',
    description:
      'Professional, friendly, luxury, urgent — match the tone to your listing and audience.',
    spotlight: false,
  },
  {
    icon: Monitor,
    title: 'Platform Mockups',
    description:
      'See exactly how your ads will look on each platform before you publish.',
    spotlight: false,
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-muted-foreground text-center mb-16">
            Built for agents who&apos;d rather sell homes than write ads.
          </p>
        </ScrollReveal>

        {/* Spotlight row — top 2 features */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {features
            .filter((f) => f.spotlight)
            .map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 0.15}>
                <div className="group p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-gold group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
        </div>

        {/* Standard grid — remaining 4 features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features
            .filter((f) => !f.spotlight)
            .map((feature, index) => (
              <ScrollReveal key={feature.title} delay={0.3 + index * 0.1}>
                <div className="group p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-gold group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/landing/features-grid.tsx
git commit -m "feat: add spotlight treatment to top features and hover lift effects"
```

---

## Phase 7: New Section — Social Proof / Value Showcase

### Task 8: Create Social Proof Section

**Files:**
- Create: `src/components/landing/social-proof.tsx`
- Modify: `src/app/page.tsx` (add import + render)

**Step 1: Create the social proof component**

Since there are no real users yet, this section focuses on **what you get** (value proof) rather than fake testimonials. Honest and effective for a beta product.

Create `src/components/landing/social-proof.tsx`:

```tsx
import { FileText, Globe, ShieldCheck, Zap } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const stats = [
  { icon: Globe, value: '12+', label: 'Ad Platforms' },
  { icon: FileText, value: '5', label: 'Tone Options' },
  { icon: ShieldCheck, value: '100%', label: 'Compliance Checked' },
  { icon: Zap, value: '<60s', label: 'Generation Time' },
];

export function SocialProof() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            What You Get With Every Campaign
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            One MLS number in. A complete marketing suite out.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <div className="text-center p-6 rounded-xl border border-border/50 bg-card/30">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-5 h-5 text-gold" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-gold mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

In `src/app/page.tsx`, add the import and render it after ShowcaseCarousel:

```tsx
import { SocialProof } from '@/components/landing/social-proof';
```

Render order becomes: Hero → PlatformBar → HowItWorks → ShowcaseCarousel → **SocialProof** → FeaturesGrid → CTAFooter

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/landing/social-proof.tsx src/app/page.tsx
git commit -m "feat: add value showcase section with key metrics"
```

---

## Phase 8: New Section — Who It's For

### Task 9: Create Who It's For Section

**Files:**
- Create: `src/components/landing/who-its-for.tsx`
- Modify: `src/app/page.tsx` (add import + render)

**Step 1: Create the component**

Create `src/components/landing/who-its-for.tsx`:

```tsx
import { Building, User, Users } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const personas = [
  {
    icon: User,
    title: 'Solo Agents',
    description:
      'You handle everything — listings, showings, negotiations, AND marketing. AdDrop gives you a marketing department in 30 seconds.',
  },
  {
    icon: Users,
    title: 'Team Leaders',
    description:
      'Your agents need consistent, branded ad campaigns fast. AdDrop ensures every listing gets the same professional treatment.',
  },
  {
    icon: Building,
    title: 'Brokerages',
    description:
      'Dozens of listings, multiple agents, compliance requirements. AdDrop standardizes your marketing while saving your team hundreds of hours.',
  },
];

export function WhoItsFor() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Made for Every Agent
          </h2>
          <p className="text-muted-foreground text-center mb-16">
            Whether you&apos;re solo or running a team, AdDrop scales with you.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          {personas.map((persona, index) => (
            <ScrollReveal key={persona.title} delay={index * 0.15}>
              <div className="group p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 text-center">
                <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <persona.icon className="w-6 h-6 text-gold group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{persona.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {persona.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

Import and render after FeaturesGrid, before CTAFooter.

**Step 3: Verify build and commit**

```bash
git add src/components/landing/who-its-for.tsx src/app/page.tsx
git commit -m "feat: add Who It's For section with agent personas"
```

---

## Phase 9: New Section — FAQ

### Task 10: Create FAQ Section

**Files:**
- Create: `src/components/landing/faq.tsx`
- Modify: `src/app/page.tsx` (add import + render)

**Step 1: Create the FAQ component**

Create `src/components/landing/faq.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const faqs = [
  {
    question: 'Is AdDrop really free?',
    answer:
      'Yes — AdDrop is completely free during our beta period. No account, no credit card, no catch. We want you to try it and tell us what you think.',
  },
  {
    question: 'What information do I need to get started?',
    answer:
      'Just your MLS number. AdDrop pulls the property details automatically. You can also enter property details manually if you prefer.',
  },
  {
    question: 'How does the AI know what to write?',
    answer:
      'AdDrop\'s AI is trained specifically for real estate marketing. It understands platform best practices, character limits, tone variations, and fair housing compliance. It writes ads that sound like they came from a professional copywriter.',
  },
  {
    question: 'Is the ad copy compliant with fair housing laws?',
    answer:
      'AdDrop includes built-in compliance checking that automatically flags and corrects problematic language. Currently optimized for Montana MLS requirements, with more states coming soon.',
  },
  {
    question: 'Can I edit the generated ads?',
    answer:
      'Absolutely. Every ad is fully editable. Use the AI output as a starting point and customize it to match your voice and brand.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      'Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print ads, direct mail postcards, magazine ads, and more. We\'re adding new platforms regularly.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left group"
      >
        <span className="text-base font-medium group-hover:text-gold transition-colors duration-200">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 ml-4 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-40 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Questions? We&apos;ve Got Answers.
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Everything you need to know about AdDrop.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="border-t border-border/50">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

Import and render after WhoItsFor, before CTAFooter.

**Step 3: Verify build and commit**

```bash
git add src/components/landing/faq.tsx src/app/page.tsx
git commit -m "feat: add FAQ section with accordion"
```

---

## Phase 10: CTA Footer Redesign

### Task 11: Redesigned CTA Footer with Value Stack

**Files:**
- Modify: `src/components/landing/cta-footer.tsx`

**Step 1: Rewrite with value stack and differentiated styling**

Replace the full content of `src/components/landing/cta-footer.tsx` with:

```tsx
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const valuePoints = [
  '12+ platform ads',
  'Compliance checked',
  'Multiple tones',
  'Ready in seconds',
];

export function CTAFooter() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[300px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Gold gradient divider */}
        <ScrollReveal>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto mb-12" />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Next Listing Deserves Better Marketing
          </h2>
          <p className="text-muted-foreground mb-8">
            In the time it took to read this page, AdDrop could have built your
            entire campaign.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10">
            {valuePoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="w-4 h-4 text-gold" />
                {point}
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <Link
            href="/create"
            className="group inline-flex items-center gap-2 bg-gold text-background font-semibold px-10 py-5 rounded-lg text-lg hover:bg-gold-muted hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/20 transition-all duration-300"
          >
            Create Your First Campaign
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
          <p className="mt-6 text-sm text-muted-foreground/50">
            Free during beta. No account needed. Seriously.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
```

**Step 2: Verify build and commit**

```bash
git add src/components/landing/cta-footer.tsx
git commit -m "feat: redesign CTA footer with value stack, glow, and beta messaging"
```

---

## Phase 11: Mobile Sticky CTA

### Task 12: Mobile Bottom Sticky CTA Bar

**Files:**
- Create: `src/components/landing/mobile-cta-bar.tsx`
- Modify: `src/app/page.tsx` (add import + render)

**Step 1: Create the mobile CTA bar**

Create `src/components/landing/mobile-cta-bar.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function MobileCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 600px (past hero)
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3">
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 w-full bg-gold text-background font-semibold py-3 rounded-lg text-base hover:bg-gold-muted transition-colors"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: Add to page.tsx**

Import and render at the end of `<main>`, after CTAFooter.

**Step 3: Verify build and commit**

```bash
git add src/components/landing/mobile-cta-bar.tsx src/app/page.tsx
git commit -m "feat: add mobile bottom sticky CTA bar"
```

---

## Phase 12: Final Assembly + Build Verification

### Task 13: Final Page Assembly and Build Check

**Files:**
- Modify: `src/app/page.tsx` (final section order)

**Step 1: Verify final page.tsx section order**

The final `src/app/page.tsx` should render in this order:

```tsx
import { Hero } from '@/components/landing/hero';
import { PlatformBar } from '@/components/landing/platform-bar';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel';
import { SocialProof } from '@/components/landing/social-proof';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { WhoItsFor } from '@/components/landing/who-its-for';
import { FAQ } from '@/components/landing/faq';
import { CTAFooter } from '@/components/landing/cta-footer';
import { MobileCTABar } from '@/components/landing/mobile-cta-bar';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <PlatformBar />
      <HowItWorks />
      <ShowcaseCarousel />
      <SocialProof />
      <FeaturesGrid />
      <WhoItsFor />
      <FAQ />
      <CTAFooter />
      <MobileCTABar />
    </main>
  );
}
```

**Step 2: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Clear build cache and rebuild**

Run: `rm -rf .next && npm run build`
Expected: Clean build succeeds

**Step 4: Final commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble all landing page enhancements with new section order"
```

---

## Summary

| Phase | Task | Files | What It Does |
|-------|------|-------|-------------|
| 1 | Install Framer Motion | package.json | Add animation dependency |
| 1 | ScrollReveal component | new: scroll-reveal.tsx | Reusable scroll animation wrapper |
| 2 | Hero overhaul | hero.tsx, globals.css | Animated glows, gradient text, shimmer CTA, new messaging |
| 3 | Platform Bar polish | platform-bar.tsx | Brand color hovers, staggered entrance |
| 4 | How It Works flow | how-it-works.tsx | Connector line, staggered cards |
| 5 | Carousel rewrite | showcase-carousel.tsx | 5 diverse properties, platform tabs, auto-play |
| 6 | Features Grid spotlight | features-grid.tsx | Hero cards for top 2 features, hover lift |
| 7 | Social Proof | new: social-proof.tsx, page.tsx | Value metrics section |
| 8 | Who It's For | new: who-its-for.tsx, page.tsx | Agent persona cards |
| 9 | FAQ | new: faq.tsx, page.tsx | Accordion FAQ section |
| 10 | CTA Footer redesign | cta-footer.tsx | Value stack, glow, beta copy |
| 11 | Mobile sticky CTA | new: mobile-cta-bar.tsx, page.tsx | Persistent mobile conversion bar |
| 12 | Final assembly | page.tsx | Final section order + clean build |

**Total: 13 tasks, 4 new files, 7 modified files, 1 new dependency**
