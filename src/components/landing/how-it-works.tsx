'use client';

import { Download, Search, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Enter Property Details',
    description:
      'Add your property address, photos, and key details. It only takes a minute to get started.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI builds your campaign',
    description:
      'Our AI generates platform-optimized ad copy in multiple tones — professional, casual, luxury — each tailored to your listing.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download & publish',
    description:
      'Export all your ad copy as a PDF — ready to copy, paste, and publish across platforms.',
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  });

  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="py-24 px-6" ref={containerRef}>
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-4 text-cream">
          How It Works
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Three steps. That&apos;s it.
        </p>

        <div className="relative">
          {/* Vertical gold line (desktop only) */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <motion.div
              className="w-full bg-gold origin-top"
              style={{ scaleY: lineScaleY, height: '100%' }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={step.number}
                  className={`relative flex ${
                    isEven ? 'md:justify-end' : 'md:justify-start'
                  }`}
                >
                  {/* Gold dot at junction (desktop only) */}
                  <div className="hidden md:block absolute left-1/2 top-8 -translate-x-1/2 w-3 h-3 rounded-full bg-gold z-10" />

                  {/* Card */}
                  <div
                    className={`w-full md:w-[45%] ${
                      isEven ? '' : 'md:mr-[52%]'
                    } ${!isEven ? '' : 'md:ml-[52%]'}`}
                  >
                    <div className="relative bg-surface border-t-2 border-t-gold/20 p-6 rounded-lg">
                      {/* Watermark step number */}
                      <span className="font-serif text-6xl text-gold/10 absolute top-4 right-4 select-none">
                        {step.number}
                      </span>

                      {/* Icon */}
                      <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4 relative z-10">
                        <step.icon className="w-6 h-6 text-gold" />
                      </div>

                      {/* Content */}
                      <h3 className="font-serif text-xl text-cream mb-2 relative z-10">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground relative z-10">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
