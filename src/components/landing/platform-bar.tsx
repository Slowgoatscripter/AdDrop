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
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const platforms = [
  { name: 'Instagram', icon: Instagram, hoverColor: 'hover:text-pink-500' },
  { name: 'Facebook', icon: Facebook, hoverColor: 'hover:text-blue-500' },
  { name: 'Google Ads', icon: Search, hoverColor: 'hover:text-green-500' },
  { name: 'Twitter/X', icon: Twitter, hoverColor: 'hover:text-sky-500' },
  { name: 'Zillow', icon: Home, hoverColor: 'hover:text-blue-400' },
  { name: 'Realtor.com', icon: LayoutGrid, hoverColor: 'hover:text-red-500' },
  { name: 'Print', icon: Newspaper, hoverColor: 'hover:text-amber-500' },
  { name: 'Direct Mail', icon: Mail, hoverColor: 'hover:text-emerald-500' },
];

export function PlatformBar() {
  return (
    <section className="py-12 border-y border-border/50">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-xs text-muted-foreground/50 uppercase tracking-widest text-center mb-8">
          Generate ads for
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {platforms.map((platform, index) => (
            <ScrollReveal key={platform.name} delay={index * 0.06} direction="up">
              <div
                className={`flex flex-col items-center gap-2 text-muted-foreground/50 ${platform.hoverColor} hover:scale-110 transition-all duration-200 cursor-default`}
              >
                <platform.icon className="w-6 h-6" />
                <span className="text-xs">{platform.name}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
