'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Mail,
  Newspaper,
  Search,
} from 'lucide-react';

interface ShowcaseSlide {
  platform: string;
  icon: React.ElementType;
  accentColor: string;
  headline: string;
  body: string;
  meta?: string;
  propertyImage: string;
  propertyAddress: string;
  propertyPrice: string;
}

const slides: ShowcaseSlide[] = [
  {
    platform: 'Instagram',
    icon: Instagram,
    accentColor: 'from-purple-500 to-pink-500',
    headline: '@metroluxrealty',
    body: `NEW LISTING | Downtown Chicago penthouse living at its finest.\n\nFloor-to-ceiling windows. Private terrace. 40th-floor skyline views.\n\n📍 401 N Wabash Ave, Unit PH-4\n💰 $2,150,000\n🏙️ 3 bed · 3.5 bath · 2,800 sq ft\n\nThis is the one you've been scrolling for.\n\n#ChicagoRealEstate #PenthouseLiving #JustListed #LuxuryRealEstate`,
    meta: '2,100 characters · Luxury tone',
    propertyImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    propertyAddress: '401 N Wabash Ave, Unit PH-4',
    propertyPrice: '$2,150,000',
  },
  {
    platform: 'Facebook',
    icon: Facebook,
    accentColor: 'from-blue-500 to-blue-600',
    headline: 'Sunrise Realty Group',
    body: `🏡 FIRST-TIME BUYERS — This one's for you!\n\nCharming 3-bedroom ranch in a quiet cul-de-sac. Updated kitchen, fenced backyard, and just minutes from top-rated schools.\n\nMove-in ready at $285,000. Yes, really.\n\n👉 DM us or comment 'INFO' for details!`,
    meta: 'Friendly tone · Engagement-optimized',
    propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    propertyAddress: '742 Maple Grove Lane',
    propertyPrice: '$285,000',
  },
  {
    platform: 'Google Ads',
    icon: Search,
    accentColor: 'from-green-500 to-emerald-500',
    headline: 'Waterfront Home — Lake Tahoe | $1.4M',
    body: 'Private dock, 5 bed/4 bath, 180° lake views. Open house this Saturday. Sierra Lakeshore Properties — Trusted Since 1998.',
    meta: 'Headline: 29/30 chars · Description: 89/90 chars',
    propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    propertyAddress: '88 Lakeshore Drive, South Lake Tahoe',
    propertyPrice: '$1,400,000',
  },
  {
    platform: 'Direct Mail',
    icon: Mail,
    accentColor: 'from-emerald-500 to-teal-500',
    headline: '40 Acres of Montana Freedom',
    body: 'Year-round creek, mature timber, and mountain views in every direction. 20 minutes to Kalispell, fully off-grid ready. Build your legacy at $425,000.',
    meta: 'Front + Back · Aspirational tone',
    propertyImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    propertyAddress: 'Whitefish Mountain Ranch',
    propertyPrice: '$425,000',
  },
  {
    platform: 'Magazine',
    icon: Newspaper,
    accentColor: 'from-amber-500 to-orange-500',
    headline: 'Prime Retail Space — Downtown Bozeman',
    body: '4,200 sq ft corner unit on Main Street. High foot traffic, modern build-out, anchor tenants on either side. NNN lease available. Ideal for restaurant, boutique, or professional office.',
    meta: 'Half page · Professional tone',
    propertyImage: 'https://images.unsplash.com/photo-1600566753376-12c8ab7a5a0c?w=800&q=80',
    propertyAddress: '125 E Main Street, Bozeman',
    propertyPrice: '$1,250,000',
  },
];

// Device frame components
function InstagramFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      {/* iPhone outline */}
      <div className="relative bg-black rounded-[2.5rem] p-3 border border-gray-800">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
        {/* Screen */}
        <div className="relative bg-white rounded-[2rem] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function FacebookFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full border border-gray-700 rounded-lg overflow-hidden bg-surface">
      {/* Browser chrome */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
      </div>
      {/* URL bar */}
      <div className="h-8 bg-gray-700 border-b border-gray-600 flex items-center px-3">
        <div className="text-xs text-gray-400">facebook.com</div>
      </div>
      {/* Content */}
      <div className="bg-surface">
        {children}
      </div>
    </div>
  );
}

function GoogleAdsFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full border border-gray-700 rounded-md overflow-hidden bg-white">
      {/* Minimal browser bar */}
      <div className="h-6 bg-gray-100 border-b border-gray-300 flex items-center px-2">
        <div className="text-xs text-gray-500">Ad</div>
      </div>
      {/* Content */}
      <div className="bg-white text-gray-900 p-4">
        {children}
      </div>
    </div>
  );
}

function DirectMailFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Postcard with stamp */}
      <div className="relative bg-white border-2 border-gray-300 rounded-sm shadow-lg">
        {/* Stamp corner */}
        <div className="absolute top-3 right-3 w-10 h-10 border-2 border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-500">
          STAMP
        </div>
        {children}
      </div>
    </div>
  );
}

function MagazineFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[450px] mx-auto border-4 border-gray-800 bg-white shadow-2xl">
      {children}
    </div>
  );
}

export function ShowcaseCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReduced = useReducedMotion();

  const goNext = useCallback(
    () => setCurrent((prev) => (prev + 1) % slides.length),
    []
  );
  const goPrev = useCallback(
    () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length),
    []
  );

  // Auto-play
  useEffect(() => {
    if (isPaused || prefersReduced) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [isPaused, prefersReduced, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  const slide = slides[current];

  // Render device frame based on platform
  const renderDeviceFrame = (content: React.ReactNode) => {
    switch (slide.platform) {
      case 'Instagram':
        return <InstagramFrame>{content}</InstagramFrame>;
      case 'Facebook':
        return <FacebookFrame>{content}</FacebookFrame>;
      case 'Google Ads':
        return <GoogleAdsFrame>{content}</GoogleAdsFrame>;
      case 'Direct Mail':
        return <DirectMailFrame>{content}</DirectMailFrame>;
      case 'Magazine':
        return <MagazineFrame>{content}</MagazineFrame>;
      default:
        return <div className="border border-border rounded-lg overflow-hidden">{content}</div>;
    }
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl text-center mb-4 text-cream">
          See What AdDrop Creates
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          Real examples. Different properties. Every platform.
        </p>

        {/* Platform tab selector */}
        <div className="flex items-center justify-center gap-6 mb-12 overflow-x-auto pb-2">
          {slides.map((s, index) => (
            <button
              key={s.platform}
              onClick={() => {
                setCurrent(index);
                setIsPaused(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                index === current
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-muted-foreground hover:text-cream'
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.platform}</span>
            </button>
          ))}
        </div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          role="region"
          aria-label="Ad showcase carousel"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={prefersReduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="grid md:grid-cols-[45%_55%] gap-8"
            >
              {/* Left: Property Photo */}
              <div className="relative h-[400px] md:h-[600px] rounded-lg overflow-hidden">
                <Image
                  src={slide.propertyImage}
                  fill
                  className="object-cover"
                  sizes="45vw"
                  alt={slide.propertyAddress}
                />
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-cream font-serif text-lg mb-1">
                    {slide.propertyAddress}
                  </p>
                  <p className="text-gold font-bold text-2xl">{slide.propertyPrice}</p>
                </div>
              </div>

              {/* Right: Generated Ad in Device Frame */}
              <div className="flex items-center justify-center">
                {renderDeviceFrame(
                  <div className="p-6 min-h-[280px]">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">
                      {slide.headline}
                    </h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                      {slide.body}
                    </p>
                    {slide.meta && (
                      <p className="mt-6 text-xs text-muted-foreground/60">{slide.meta}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={() => {
              goPrev();
              setIsPaused(true);
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-surface border border-gold/30 flex items-center justify-center hover:bg-gold/10 hover:scale-110 transition-all duration-200 text-gold"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              goNext();
              setIsPaused(true);
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-surface border border-gold/30 flex items-center justify-center hover:bg-gold/10 hover:scale-110 transition-all duration-200 text-gold"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
