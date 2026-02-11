'use client';

import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface Benefit {
  value: string;
  suffix: string;
  label: string;
  sublabel: string;
}

const benefits: Benefit[] = [
  {
    value: '60',
    suffix: 's',
    label: 'Average Generation Time',
    sublabel: 'Faster than writing one ad manually',
  },
  {
    value: '12',
    suffix: '+',
    label: 'Platforms Covered',
    sublabel: 'Every channel your listings need',
  },
  {
    value: '100',
    suffix: '%',
    label: 'Compliance Built In',
    sublabel: 'Fair housing standards, always',
  },
];

function CountUpNumber({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        // Easing out
        const progress = current / target;
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <div ref={ref} className="font-serif text-5xl md:text-6xl font-bold bg-gradient-to-br from-gold via-gold-bright to-gold-light bg-clip-text text-transparent">
      {count}
      {suffix}
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="py-24 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl text-center text-cream mb-4">
          Why Agents Choose AdDrop
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          One listing in. A complete marketing suite out.
        </p>

        <div className="grid md:grid-cols-3 gap-0">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.label}
              className={`text-center p-8 md:p-12 ${
                index < benefits.length - 1 ? 'md:border-r border-gold/10' : ''
              }`}
            >
              <CountUpNumber
                target={parseInt(benefit.value)}
                suffix={benefit.suffix}
              />
              <p className="text-lg font-semibold text-cream mt-4 mb-2">
                {benefit.label}
              </p>
              <p className="text-sm text-muted-foreground">{benefit.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
