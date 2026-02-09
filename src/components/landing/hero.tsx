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
