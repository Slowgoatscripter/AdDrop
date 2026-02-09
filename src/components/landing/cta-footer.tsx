import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const valuePoints = [
  '12+ platform ads',
  'Compliance checked',
  'Multiple tones',
  'Ready in seconds',
];

export function CTAFooter() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[300px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Gold gradient divider */}
        <ScrollReveal>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto mb-12" />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Next Listing Deserves Better Marketing
          </h2>
          <p className="text-muted-foreground mb-8">
            In the time it took to read this page, AdDrop could have built your
            entire campaign.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10">
            {valuePoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="w-4 h-4 text-gold" />
                {point}
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <Link
            href="/create"
            className="group inline-flex items-center gap-2 bg-gold text-background font-semibold px-10 py-5 rounded-lg text-lg hover:bg-gold-muted hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/20 transition-all duration-300"
          >
            Create Your First Campaign
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
          <p className="mt-6 text-sm text-muted-foreground/50">
            Free during beta. No account needed. Seriously.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
