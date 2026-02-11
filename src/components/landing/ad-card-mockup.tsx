'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AdCardMockupProps {
  className?: string;
  animate?: boolean;
  handle?: string;
  copyText?: string;
  hashtags?: string;
}

const defaultCopy =
  'NEW LISTING | Stunning 4BR craftsman in Pacific Heights. Soaring ceilings, chef\'s kitchen, private garden. This is the one you\'ve been waiting for.';

const defaultHashtags =
  '#SanFranciscoRealEstate #PacificHeights #JustListed #LuxuryHome #AdDrop';

/* ── Typewriter hook ── */
function useTypewriter(text: string, enabled: boolean, startDelay: number) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);

    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 28);
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [text, enabled, startDelay]);

  return { displayed, done };
}

/* ── Simple SVG icons ── */
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/* ── Main component ── */
export function AdCardMockup({
  className = '',
  animate = true,
  handle = '@luxuryrealty_sf',
  copyText = defaultCopy,
  hashtags = defaultHashtags,
}: AdCardMockupProps) {
  const prefersReduced = useReducedMotion();
  const shouldAnimate = animate && !prefersReduced;
  const [animationStarted, setAnimationStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Delay typewriter start so it aligns with the hero choreography (~2000ms)
  const { displayed: displayedCopy, done: copyDone } = useTypewriter(
    copyText,
    shouldAnimate && animationStarted,
    0,
  );
  const { displayed: displayedTags } = useTypewriter(
    hashtags,
    shouldAnimate && animationStarted && copyDone,
    200,
  );

  // Trigger animation start (called by parent or after mount)
  useEffect(() => {
    if (!shouldAnimate) {
      setAnimationStarted(true);
      return;
    }
    // Start typewriter after card "lands" (~2000ms from page load)
    const timer = setTimeout(() => setAnimationStarted(true), 2000);
    return () => clearTimeout(timer);
  }, [shouldAnimate]);

  const floatAnimation = shouldAnimate
    ? { y: [0, -8, 0] }
    : {};
  const floatTransition = shouldAnimate
    ? { duration: 3, repeat: Infinity, ease: 'easeInOut' as const, delay: 3.5 }
    : {};

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      animate={floatAnimation}
      transition={floatTransition}
    >
      {/* Phone frame */}
      <div className="relative w-[280px] sm:w-[300px] mx-auto">
        {/* Phone bezel */}
        <div className="rounded-[2rem] border-2 border-white/10 bg-black/80 p-3 shadow-2xl shadow-black/50">
          {/* Notch */}
          <div className="mx-auto w-24 h-5 bg-black rounded-b-xl mb-2" />

          {/* Screen */}
          <div className="rounded-2xl overflow-hidden bg-surface">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center text-[10px] font-bold text-background shrink-0">
                LR
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-cream truncate">
                  {handle}
                </p>
                <p className="text-[10px] text-muted-foreground">Sponsored</p>
              </div>
              <div className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              </div>
            </div>

            {/* Property image placeholder */}
            <div className="aspect-[4/3] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-muted/30 via-surface-hover to-gold/10" />
              {/* Faux property silhouette */}
              <div className="absolute bottom-0 left-0 right-0 h-2/3">
                <div className="absolute bottom-0 left-[10%] w-[35%] h-[80%] bg-white/5 rounded-t-sm" />
                <div className="absolute bottom-0 left-[50%] w-[40%] h-[60%] bg-white/[0.03] rounded-t-sm" />
                <div className="absolute bottom-0 left-[15%] w-[25%] h-[50%] bg-white/[0.04] rounded-t-sm" />
              </div>
              {/* Price tag */}
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1">
                <span className="text-xs font-bold text-gold">$2,850,000</span>
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3 px-3 py-2 text-cream/70">
              <HeartIcon />
              <CommentIcon />
              <ShareIcon />
            </div>

            {/* Ad copy */}
            <div className="px-3 pb-3">
              <p className="text-[11px] leading-relaxed text-cream/90">
                <span className="font-semibold text-cream">{handle}</span>{' '}
                {shouldAnimate ? displayedCopy : copyText}
                {shouldAnimate && !copyDone && (
                  <span className="inline-block w-[2px] h-3 bg-gold ml-0.5 animate-pulse" />
                )}
              </p>
              <p className="text-[10px] text-gold-muted mt-1.5 leading-relaxed">
                {shouldAnimate ? displayedTags : hashtags}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
