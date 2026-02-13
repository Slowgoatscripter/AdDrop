'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Generic scroll reveal wrapper component.
 * Note: Most landing page sections now use targeted Framer Motion animations
 * instead of this wrapper. This component is preserved for section headings
 * and non-landing components that need subtle scroll reveals.
 */

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

const directionOffset = {
  up: { y: 15 },
  down: { y: -15 },
  left: { x: 15 },
  right: { x: -15 },
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.3,
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
