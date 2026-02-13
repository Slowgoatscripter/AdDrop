import {
  Facebook,
  Home,
  Instagram,
  LayoutGrid,
  Mail,
  Newspaper,
  Search,
  Twitter,
} from 'lucide-react';

const platforms = [
  { name: 'Instagram', icon: Instagram },
  { name: 'Facebook', icon: Facebook },
  { name: 'Google Ads', icon: Search },
  { name: 'Twitter/X', icon: Twitter },
  { name: 'Zillow', icon: Home },
  { name: 'Realtor.com', icon: LayoutGrid },
  { name: 'Print', icon: Newspaper },
  { name: 'Direct Mail', icon: Mail },
];

export function PlatformBar() {
  // Duplicate platforms for seamless loop
  const duplicatedPlatforms = [...platforms, ...platforms];

  return (
    <section className="relative py-16 border-y border-border/50 overflow-hidden bg-gradient-to-r from-transparent via-surface/50 to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <p className="font-serif tracking-[0.25em] text-gold-light/60 text-xs uppercase text-center mb-12">
          Generate ads for
        </p>

        {/* Fade edges */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* Marquee container */}
          <div className="flex overflow-hidden">
            <div className="flex gap-12 animate-marquee hover:[animation-play-state:paused]">
              {duplicatedPlatforms.map((platform, index) => (
                <div
                  key={`${platform.name}-${index}`}
                  className="flex flex-col items-center gap-3 flex-shrink-0 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full border border-border/30 hover:border-gold flex items-center justify-center text-muted-foreground hover:text-gold transition-colors duration-300">
                    <platform.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
