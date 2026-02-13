import Image from 'next/image';
import { Check } from 'lucide-react';

const valuePoints = [
  'Free beta account',
  '2 campaigns per week',
  'No credit card required',
  'Compliance-checked',
];

interface CTAFooterProps {
  headline?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  // Legacy prop for backwards compatibility
  betaNotice?: string;
}

export function CTAFooter({
  headline = 'Your Next Listing Deserves Better Marketing',
  description: descriptionProp,
  betaNotice,
  ctaText = 'Create Your First Campaign — Free',
  ctaHref = '/create',
}: CTAFooterProps) {
  // Support both description (new) and betaNotice (legacy) props
  const description =
    descriptionProp ||
    betaNotice ||
    'In the time it takes to write one ad, AdDrop builds your entire campaign.';
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background image */}
      <Image
        src="https://images.unsplash.com/photo-1613082973415-b9079d072ae3?w=1920&q=80"
        fill
        className="object-cover"
        sizes="100vw"
        loading="lazy"
        alt=""
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/85" />

      {/* Gold gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-gold/[0.04] via-transparent to-gold/[0.06]" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        <h2 className="font-serif text-5xl md:text-7xl italic text-cream mb-6">
          {headline}
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto">
          {description}
        </p>

        {/* Value points with gold checkmarks */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {valuePoints.map((point) => (
            <div key={point} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-gold/40 flex items-center justify-center">
                <Check className="w-3 h-3 text-gold" />
              </div>
              <span className="text-cream/80 text-sm">{point}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <a
          href={ctaHref}
          className="inline-block border-2 border-gold bg-transparent text-gold hover:bg-gold hover:text-background px-14 py-6 text-xl uppercase tracking-wider font-bold transition-all duration-300"
        >
          {ctaText}
        </a>
      </div>
    </section>
  );
}
