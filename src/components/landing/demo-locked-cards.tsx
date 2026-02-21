'use client';

import Link from 'next/link';
import {
  Camera,
  ThumbsUp,
  Target,
  Twitter,
  Megaphone,
  BookOpen,
  Mail,
  Home,
  Building,
  MapPin,
  FileText,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_PLATFORMS, type PlatformId } from '@/lib/types/campaign';

interface DemoLockedCardsProps {
  unlockedPlatforms: string[];
}

const PLATFORM_INFO: Record<string, { label: string; icon: LucideIcon }> = {
  instagram: { label: 'Instagram', icon: Camera },
  facebook: { label: 'Facebook', icon: ThumbsUp },
  googleAds: { label: 'Google Ads', icon: Target },
  twitter: { label: 'Twitter / X', icon: Twitter },
  metaAd: { label: 'Meta Ad', icon: Megaphone },
  magazineFullPage: { label: 'Magazine (Full)', icon: BookOpen },
  magazineHalfPage: { label: 'Magazine (Half)', icon: BookOpen },
  postcard: { label: 'Direct Mail', icon: Mail },
  zillow: { label: 'Zillow', icon: Home },
  realtorCom: { label: 'Realtor.com', icon: Building },
  homesComTrulia: { label: 'Homes.com / Trulia', icon: MapPin },
  mlsDescription: { label: 'MLS Description', icon: FileText },
};

export function DemoLockedCards({ unlockedPlatforms }: DemoLockedCardsProps) {
  const lockedPlatforms = ALL_PLATFORMS.filter(
    (p: PlatformId) => !unlockedPlatforms.includes(p),
  );

  if (lockedPlatforms.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {lockedPlatforms.map((platformId) => {
          const info = PLATFORM_INFO[platformId];
          if (!info) return null;
          const Icon = info.icon;

          return (
            <Link key={platformId} href="/signup">
              <div
                className={cn(
                  'relative bg-surface/30 border border-gold/5 rounded-lg p-4 text-center group',
                  'transition-colors hover:bg-gold/5 cursor-pointer select-none',
                )}
              >
                {/* Platform content (blurred under overlay) */}
                <div className="flex flex-col items-center gap-2">
                  <Icon className="w-5 h-5 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground/50">{info.label}</span>
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 backdrop-blur-[2px] bg-background/40 rounded-lg flex items-center justify-center transition-opacity group-hover:bg-background/30">
                  <Lock className="w-4 h-4 text-muted-foreground/60 group-hover:text-gold/60 transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-muted-foreground text-sm text-center mt-4">
        Sign up free to unlock all 12+ platforms
      </p>
    </div>
  );
}
