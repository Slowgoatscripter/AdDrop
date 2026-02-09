import { FileText, Globe, ShieldCheck, Zap } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const stats = [
  { icon: Globe, value: '12+', label: 'Ad Platforms' },
  { icon: FileText, value: '5', label: 'Tone Options' },
  { icon: ShieldCheck, value: '100%', label: 'Compliance Checked' },
  { icon: Zap, value: '<60s', label: 'Generation Time' },
];

export function SocialProof() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            What You Get With Every Campaign
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            One MLS number in. A complete marketing suite out.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <div className="text-center p-6 rounded-xl border border-border/50 bg-card/30">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-5 h-5 text-gold" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-gold mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
