import Image from 'next/image';
import {
  Download,
  LayoutGrid,
  Monitor,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: LayoutGrid,
    title: '12+ Ad Platforms',
    description:
      'Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print, direct mail — all from one listing.',
    spotlight: true,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Built-In',
    description:
      'Automatic fair housing compliance checking. Montana MLS rules enforced. More states coming soon.',
    spotlight: true,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
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
  const spotlightFeatures = features.filter((f) => f.spotlight);
  const standardFeatures = features.filter((f) => !f.spotlight);

  // Destructure spotlight features for easier access in JSX
  const [spotlight1, spotlight2] = spotlightFeatures;
  const [standard1, standard2, standard3, standard4] = standardFeatures;

  const Spotlight1Icon = spotlight1.icon;
  const Spotlight2Icon = spotlight2.icon;
  const Standard1Icon = standard1.icon;
  const Standard2Icon = standard2.icon;
  const Standard3Icon = standard3.icon;
  const Standard4Icon = standard4.icon;

  // Extract image URLs with non-null assertion (we know spotlights have images)
  const spotlight1Image = spotlight1.image!;
  const spotlight2Image = spotlight2.image!;

  return (
    <section
      className="relative py-24 px-6 border-t border-border/50 overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle, hsl(38 40% 30% / 0.07) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-12">
          Everything You Need
        </h2>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Spotlight 1: Small spotlight with background image */}
          <div className="relative md:col-span-1 md:row-span-1 rounded-xl overflow-hidden min-h-[280px] group">
            <Image
              src={spotlight1Image}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              alt=""
            />
            <div className="absolute inset-0 bg-background/75" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center mb-4">
                <Spotlight1Icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-semibold text-cream mb-2">
                {spotlight1.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {spotlight1.description}
              </p>
            </div>
          </div>

          {/* Spotlight 2: Wide spotlight with background image */}
          <div className="relative md:col-span-2 md:row-span-1 rounded-xl overflow-hidden min-h-[280px] group">
            <Image
              src={spotlight2Image}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
              alt=""
            />
            <div className="absolute inset-0 bg-background/75" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center mb-4">
                <Spotlight2Icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-semibold text-cream mb-2">
                {spotlight2.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {spotlight2.description}
              </p>
            </div>
          </div>

          {/* Tall Card 1 */}
          <div className="md:col-span-1 md:row-span-2 bg-surface rounded-xl p-6 border-l-2 border-l-gold/20 hover:bg-surface-hover transition-colors duration-300">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <Standard1Icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">
              {standard1.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {standard1.description}
            </p>
          </div>

          {/* Card 2 */}
          <div className="md:col-span-1 md:row-span-1 bg-surface rounded-xl p-6 border-l-2 border-l-gold/20 hover:bg-surface-hover transition-colors duration-300">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <Standard2Icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">
              {standard2.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {standard2.description}
            </p>
          </div>

          {/* Card 3 */}
          <div className="md:col-span-1 md:row-span-1 bg-surface rounded-xl p-6 border-l-2 border-l-gold/20 hover:bg-surface-hover transition-colors duration-300">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <Standard3Icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">
              {standard3.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {standard3.description}
            </p>
          </div>

          {/* Wide Card 4 */}
          <div className="md:col-span-2 md:row-span-1 bg-surface rounded-xl p-6 border-l-2 border-l-gold/20 hover:bg-surface-hover transition-colors duration-300">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <Standard4Icon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">
              {standard4.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {standard4.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
