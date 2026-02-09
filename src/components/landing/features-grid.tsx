import {
  LayoutGrid,
  Sparkles,
  ShieldCheck,
  Download,
  Palette,
  Monitor,
} from 'lucide-react';

const features = [
  {
    icon: LayoutGrid,
    title: '12+ Ad Platforms',
    description: 'One listing, every channel covered — social, search, print, and direct mail.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Copy',
    description: 'Intelligent ad copy tailored to each platform\'s format and audience.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Built-In',
    description: 'Montana MLS compliant out of the box. Fair housing violations auto-detected.',
  },
  {
    icon: Download,
    title: 'One-Click Export',
    description: 'Download your entire campaign as PDF or CSV — ready for your team.',
  },
  {
    icon: Palette,
    title: 'Multiple Tones',
    description: 'Professional, luxury, casual, urgent — get the right voice for every listing.',
  },
  {
    icon: Monitor,
    title: 'Platform Mockups',
    description: 'See exactly how your ads look on Instagram, Facebook, and more before publishing.',
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Everything You Need
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
          Built for real estate agents who want to market smarter, not harder.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
