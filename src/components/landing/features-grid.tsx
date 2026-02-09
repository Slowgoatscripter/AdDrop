import {
  Download,
  LayoutGrid,
  Monitor,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const features = [
  {
    icon: LayoutGrid,
    title: '12+ Ad Platforms',
    description:
      'Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print, direct mail — all from one listing.',
    spotlight: true,
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Built-In',
    description:
      'Automatic fair housing compliance checking. Montana MLS rules enforced. More states coming soon.',
    spotlight: true,
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Copy',
    description:
      'Professional ad copy that sounds human. Trained specifically for real estate marketing.',
    spotlight: false,
  },
  {
    icon: Download,
    title: 'One-Click Export',
    description:
      'Download your entire campaign as ready-to-post assets. No reformatting needed.',
    spotlight: false,
  },
  {
    icon: Palette,
    title: 'Multiple Tones',
    description:
      'Professional, friendly, luxury, urgent — match the tone to your listing and audience.',
    spotlight: false,
  },
  {
    icon: Monitor,
    title: 'Platform Mockups',
    description:
      'See exactly how your ads will look on each platform before you publish.',
    spotlight: false,
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-muted-foreground text-center mb-16">
            Built for agents who&apos;d rather sell homes than write ads.
          </p>
        </ScrollReveal>

        {/* Spotlight row — top 2 features */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {features
            .filter((f) => f.spotlight)
            .map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 0.15}>
                <div className="group p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-gold group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
        </div>

        {/* Standard grid — remaining 4 features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features
            .filter((f) => !f.spotlight)
            .map((feature, index) => (
              <ScrollReveal key={feature.title} delay={0.3 + index * 0.1}>
                <div className="group p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-gold group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
        </div>
      </div>
    </section>
  );
}
