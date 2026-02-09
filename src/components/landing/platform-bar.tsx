import {
  Instagram,
  Facebook,
  Search,
  Twitter,
  Home,
  Newspaper,
  Mail,
  LayoutGrid,
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
  return (
    <section className="py-12 border-y border-border/50">
      <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-widest">
        Generate ads for
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 px-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <platform.icon className="w-6 h-6" />
            <span className="text-xs">{platform.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
