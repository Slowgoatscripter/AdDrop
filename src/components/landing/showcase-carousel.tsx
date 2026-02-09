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
