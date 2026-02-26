'use client';

/* V1 Launch — remove after launch period */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { X } from 'lucide-react';

const STORAGE_KEY = 'addrop-v1-banner-dismissed';

export function LaunchBanner() {
  const prefersReduced = useReducedMotion();
  const a = !prefersReduced;

  // Start with null (SSR-safe) — avoids hydration mismatch with localStorage
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setVisible(!dismissed);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  // SSR: render nothing. Hydration-safe.
  if (visible === null) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          className="relative z-40 bg-gold/5 border-b border-gold/20"
          initial={a ? { opacity: 0, y: -10 } : undefined}
          animate={a ? { opacity: 1, y: 0 } : undefined}
          exit={a ? { opacity: 0, y: -10 } : undefined}
          transition={a ? { duration: 0.2, ease: 'easeOut' } : undefined}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5 sm:px-6 min-h-[40px] sm:min-h-[44px]">
            <p className="text-sm text-cream/90 flex-1 text-center sm:text-left">
              <span className="text-gold mr-1.5">✦</span>
              AdDrop v1 is live — stable, fast, and ready.{' '}
              <Link
                href="/pricing"
                className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors"
              >
                See pricing →
              </Link>
            </p>
            <button
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="ml-4 p-1 text-cream/50 hover:text-cream transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
