'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { AdCardMockup } from './ad-card-mockup';
import type { LandingStat } from '@/lib/types/settings';

interface HeroProps {
  titlePrefix?: string;
  titleAccent?: string;
  tagline?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  stats?: LandingStat[];
}

const defaultStats: LandingStat[] = [
  { value: '12+', label: 'Platforms' },
  { value: '<60s', label: 'Generation' },
  { value: '100%', label: 'Compliant' },
  { value: '5', label: 'Tone Options' },
];

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function Hero({
  titlePrefix = 'Ad',
  titleAccent = 'Drop',
  tagline = 'Your Listing. 12 Platforms. Zero Effort.',
  description = 'Enter your property details and get a complete ad campaign — Instagram, Facebook, Google, print, direct mail — in under 60 seconds.',
  ctaText = 'Start Creating Ads',
  ctaHref = '/create',
  stats,
}: HeroProps) {
  const prefersReduced = useReducedMotion();
  const a = !prefersReduced; // shorthand: should animate?
  const [mounted, setMounted] = useState(false);
  const displayStats = stats && stats.length > 0 ? stats : defaultStats;

  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/hero-bg.jpg"
        fill
        priority
        alt=""
        className="object-cover"
        sizes="100vw"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />

      {/* Animated glow — 0ms */}
      <motion.div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/8 rounded-full blur-[120px] pointer-events-none"
        initial={a ? { opacity: 0 } : undefined}
        animate={a ? { opacity: 1 } : undefined}
        transition={a ? { duration: 1.2, ease: 'easeOut' } : undefined}
      />

      {/* Content grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] items-center gap-12 lg:gap-8">
          {/* ── Left column ── */}
          <div className="text-center lg:text-left">
            {/* Title — 300ms clip reveal */}
            <h1 className="mb-6 text-[clamp(4rem,10vw,8rem)] leading-[0.9] tracking-tight">
              <motion.span
                className="inline-block font-sans font-bold text-cream"
                initial={a ? { clipPath: 'inset(0 100% 0 0)' } : undefined}
                animate={a ? { clipPath: 'inset(0 0% 0 0)' } : undefined}
                transition={a ? { delay: 0.3, duration: 0.6, ease } : undefined}
              >
                {titlePrefix}
              </motion.span>
              <motion.span
                className="inline-block font-serif font-[900] italic bg-gradient-to-r from-[#E6A817] via-[#F0C040] to-[#D4941A] bg-clip-text text-transparent"
                initial={a ? { clipPath: 'inset(0 0 0 100%)' } : undefined}
                animate={a ? { clipPath: 'inset(0 0 0 0%)' } : undefined}
                transition={a ? { delay: 0.3, duration: 0.6, ease } : undefined}
              >
                {titleAccent}
              </motion.span>
            </h1>

            {/* Tagline — 800ms */}
            <motion.p
              className="text-xl md:text-2xl text-cream/80 mb-4 font-sans"
              initial={a ? { opacity: 0, y: 20 } : undefined}
              animate={a ? { opacity: 1, y: 0 } : undefined}
              transition={a ? { delay: 0.8, duration: 0.5, ease } : undefined}
            >
              {tagline}
            </motion.p>

            {/* Description — 950ms */}
            <motion.p
              className="text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10"
              initial={a ? { opacity: 0, y: 20 } : undefined}
              animate={a ? { opacity: 1, y: 0 } : undefined}
              transition={a ? { delay: 0.95, duration: 0.5, ease } : undefined}
            >
              {description}
            </motion.p>

            {/* CTA — 1200ms spring bounce */}
            <motion.div
              initial={a ? { opacity: 0, scale: 0.8 } : undefined}
              animate={a ? { opacity: 1, scale: 1 } : undefined}
              transition={a ? { delay: 1.2, type: 'spring', stiffness: 300, damping: 20 } : undefined}
            >
              <Link
                href={ctaHref}
                className="inline-block border-2 border-gold bg-transparent text-gold uppercase tracking-wider text-sm font-bold px-10 py-4 transition-all duration-300 hover:bg-gold hover:text-background"
              >
                {ctaText}
              </Link>
            </motion.div>

            {/* Stats bar — 1400ms staggered */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 mt-12">
              {displayStats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={a ? { opacity: 0, y: 15 } : undefined}
                  animate={a ? { opacity: 1, y: 0 } : undefined}
                  transition={a ? { delay: 1.4 + i * 0.1, duration: 0.4, ease } : undefined}
                >
                  <p className="font-serif text-2xl md:text-3xl font-bold text-gold">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Right column — Ad card ── */}
          {/* Desktop: drop from above — 1500ms spring, lands at -3deg */}
          <motion.div
            className="hidden lg:flex justify-center"
            initial={a && mounted ? { opacity: 0, y: -120, rotate: 6 } : undefined}
            animate={a && mounted ? { opacity: 1, y: 0, rotate: -3 } : undefined}
            transition={a && mounted ? { delay: 1.5, type: 'spring', damping: 15, stiffness: 200 } : undefined}
          >
            <AdCardMockup animate={a} />
          </motion.div>

          {/* Mobile: fade-in (no drop) — 1500ms */}
          <motion.div
            className="flex lg:hidden justify-center"
            initial={a && mounted ? { opacity: 0, y: 30 } : undefined}
            animate={a && mounted ? { opacity: 1, y: 0 } : undefined}
            transition={a && mounted ? { delay: 1.5, duration: 0.6, ease } : undefined}
          >
            <AdCardMockup animate={a} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
