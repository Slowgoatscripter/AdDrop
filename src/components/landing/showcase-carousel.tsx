'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Instagram, Facebook, Search, Mail, Newspaper } from 'lucide-react';

interface ShowcaseSlide {
  platform: string;
  icon: React.ElementType;
  accentColor: string;
  headline: string;
  body: string;
  meta?: string;
}

const slides: ShowcaseSlide[] = [
  {
    platform: 'Instagram',
    icon: Instagram,
    accentColor: 'from-purple-500 to-pink-500',
    headline: '@premierhomes',
    body: '✨ Just Listed — 4 bed, 3 bath stunner in Whitefish, MT. Vaulted ceilings, chef\'s kitchen, and mountain views from every window. This one won\'t last.\n\n📍 123 Glacier View Dr\n💰 $875,000\n🏡 2,450 sq ft on 0.5 acres\n\n#MontanaRealEstate #WhitefishMT #JustListed #LuxuryLiving #MountainViews',
    meta: '2,200 characters · Professional tone',
  },
  {
    platform: 'Facebook',
    icon: Facebook,
    accentColor: 'from-blue-500 to-blue-600',
    headline: 'Premier Homes Montana',
    body: '🏠 NEW LISTING ALERT!\n\nNestled in the heart of Whitefish, this beautifully updated 4-bedroom home offers the perfect blend of mountain charm and modern comfort. Open-concept living, a gourmet kitchen, and a wraparound deck with panoramic views.\n\nSchedule your private showing today!',
    meta: 'Friendly tone · Ready to post',
  },
  {
    platform: 'Google Ads',
    icon: Search,
    accentColor: 'from-green-500 to-emerald-500',
    headline: 'Whitefish MT Home — 4 Bed $875K',
    body: 'Mountain views, chef\'s kitchen, 2,450 sqft. Schedule your showing today. Premier Homes Montana — Your Trusted Local Agent.',
    meta: 'Headline: 28/30 chars · Description: 87/90 chars',
  },
  {
    platform: 'Postcard',
    icon: Mail,
    accentColor: 'from-emerald-500 to-teal-500',
    headline: 'Your Dream Home Awaits',
    body: 'Stunning 4-bedroom home in Whitefish with mountain views, gourmet kitchen, and luxury finishes throughout. 2,450 sq ft of refined living on half an acre.',
    meta: 'Front + Back · Professional tone',
  },
  {
    platform: 'Magazine Ad',
    icon: Newspaper,
    accentColor: 'from-amber-500 to-orange-500',
    headline: 'Where Elegance Meets the Mountains',
    body: 'An exceptional 4-bedroom residence offering panoramic mountain views, artisan finishes, and unparalleled Whitefish living. This is Montana luxury, redefined.',
    meta: 'Full page · Luxury tone',
  },
];

export function ShowcaseCarousel() {
  const [current, setCurrent] = useState(0);

  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          See What AdDrop Creates
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
          Real examples from a single property listing.
        </p>

        <div className="relative">
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className={`px-6 py-4 bg-gradient-to-r ${slide.accentColor} flex items-center gap-3`}>
              <Icon className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">{slide.platform}</span>
            </div>

            <div className="p-8">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                {slide.headline}
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
                {slide.body}
              </p>
              {slide.meta && (
                <p className="text-xs text-muted-foreground/60 border-t border-border/50 pt-4">
                  {slide.meta}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full transition-all ${
                index === current ? 'w-8 bg-gold' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
