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
