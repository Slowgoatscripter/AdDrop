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
    headline: '@flatheadluxury',
    body: `NEW LISTING | Flathead Lake living at its finest.\n\nPrivate dock, panoramic lake views, and 200 ft of pristine shoreline.\n\n📍 1847 East Shore Route, Bigfork, MT\n💰 $2,350,000\n🏔️ 4 bed · 3.5 bath · 3,200 sq ft\n\nThis is the one you've been scrolling for.\n\n#MontanaRealEstate #FlatheadLake #JustListed #LuxuryLakefront #BigforkMT`,
    meta: '2,100 characters · Luxury tone',
    propertyImage: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80',
    propertyAddress: '1847 East Shore Route, Bigfork',
    propertyPrice: '$2,350,000',
  },
  {
    platform: 'Facebook',
    icon: Facebook,
    accentColor: 'from-blue-500 to-blue-600',
    headline: 'Big Sky Country Realty',
    body: `🏡 FIRST-TIME BUYERS — This one's for you!\n\nCharming 3-bedroom craftsman in the heart of Whitefish. Updated kitchen, fenced yard, and just minutes from the ski resort and Glacier National Park.\n\nMove-in ready at $385,000. Yes, really.\n\n👉 DM us or comment 'INFO' for details!`,
    meta: 'Friendly tone · Engagement-optimized',
    propertyImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    propertyAddress: '214 Lupine Lane, Whitefish',
    propertyPrice: '$385,000',
  },
  {
    platform: 'Google Ads',
    icon: Search,
    accentColor: 'from-green-500 to-emerald-500',
    headline: 'Lakefront Home — Flathead Lake | $1.8M',
    body: 'Private dock, 5 bed/4 bath, 180° lake & mountain views. Open house this Saturday. Glacier Realty Group — Montana\'s Trusted Name Since 1992.',
    meta: 'Headline: 30/30 chars · Description: 89/90 chars',
    propertyImage: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80',
    propertyAddress: '320 Lakeside Blvd, Polson',
    propertyPrice: '$1,800,000',
  },
  {
    platform: 'Direct Mail',
    icon: Mail,
    accentColor: 'from-emerald-500 to-teal-500',
    headline: '40 Acres of Montana Freedom',
    body: 'Year-round creek, mature timber, and mountain views in every direction. 20 minutes to Kalispell, fully off-grid ready. Build your legacy at $425,000.',
    meta: 'Front + Back · Aspirational tone',
    propertyImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    propertyAddress: 'Whitefish Mountain Ranch',
    propertyPrice: '$425,000',
  },
  {
    platform: 'Magazine',
    icon: Newspaper,
    accentColor: 'from-amber-500 to-orange-500',
    headline: 'Historic Downtown Bozeman Storefront',
    body: '3,800 sq ft corner unit on Main Street. Original brick, high ceilings, modern systems. Anchor tenants on either side, high foot traffic. NNN lease available. Ideal for restaurant, boutique, or gallery.',
    meta: 'Half page · Professional tone',
    propertyImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
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
        <div className="relative bg-[#1a1a1a] rounded-[2rem] overflow-hidden">
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
    <div className="w-full border border-gray-700 rounded-md overflow-hidden bg-surface">
      {/* Minimal browser bar */}
      <div className="h-6 bg-gray-800 border-b border-gray-700 flex items-center px-2">
        <div className="text-xs text-gray-400">Ad</div>
      </div>
      {/* Content */}
      <div className="bg-surface p-4">
        {children}
      </div>
    </div>
  );
}

function DirectMailFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Postcard with stamp */}
      <div className="relative bg-surface border-2 border-gray-700 rounded-sm shadow-lg">
        {/* Stamp corner */}
        <div className="absolute top-3 right-3 w-12 h-14 border border-gray-600 bg-gray-800/80 flex flex-col items-center justify-center rotate-2 shadow-sm">
          <div className="border border-dashed border-gold/30 w-10 h-12 flex flex-col items-center justify-center gap-0.5">
            <span className="text-[6px] font-serif tracking-widest text-gold/60 uppercase">USA</span>
            <span className="text-[8px] font-bold font-serif text-gold/80">FIRST</span>
            <span className="text-[8px] font-bold font-serif text-gold/80">CLASS</span>
            <span className="text-[5px] text-gold/40 tracking-wider">POSTAGE</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function MagazineFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[450px] mx-auto border-4 border-gray-700 bg-surface shadow-2xl">
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
          Sample outputs across platforms.
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
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
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
