'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import Link from 'next/link';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    icon: Zap,
    campaignLimit: '2 campaigns/week',
    platformCount: '12+ platforms',
    features: ['AI-powered ad copy', 'Fair housing compliance', 'PDF export'],
    cta: 'Get Started Free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    icon: Crown,
    campaignLimit: 'Unlimited campaigns',
    platformCount: '12+ platforms',
    features: ['Everything in Free', 'Multiple tones per listing', 'Priority generation'],
    cta: 'Go Pro',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$79',
    period: '/mo',
    icon: Building2,
    campaignLimit: 'Unlimited campaigns',
    platformCount: '12+ platforms',
    features: ['Everything in Pro', 'Up to 10 team members', 'Team analytics'],
    cta: 'Start Team Trial',
    href: '/signup',
    highlight: false,
  },
];

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 px-6 border-t border-border/50" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-4 text-cream">
          Simple, Transparent Pricing
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Start free. Upgrade when you&apos;re ready.
        </p>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          }}
        >
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  tier.highlight
                    ? 'bg-surface border-2 border-gold/40 shadow-lg shadow-gold/5'
                    : 'bg-surface border border-border/50'
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-background text-xs font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tier.highlight ? 'bg-gold/20' : 'bg-gold/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-serif text-xl text-cream">{tier.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-cream">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>

                {/* Limits */}
                <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                  <p className="text-sm text-cream/80">{tier.campaignLimit}</p>
                  <p className="text-sm text-muted-foreground">{tier.platformCount}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="w-2 h-2.5 droplet-shape bg-gold inline-block mr-2 shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className={`block text-center py-3 px-6 text-sm font-semibold uppercase tracking-wider transition-all duration-300 rounded-lg ${
                    tier.highlight
                      ? 'bg-gold text-background hover:bg-gold/90'
                      : 'border border-gold/40 text-gold hover:bg-gold/10'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Link to full pricing page */}
        <p className="text-center mt-10 text-muted-foreground text-sm">
          <Link href="/pricing" className="text-gold hover:underline">
            Compare all features &rarr;
          </Link>
        </p>
      </div>
    </section>
  );
}
