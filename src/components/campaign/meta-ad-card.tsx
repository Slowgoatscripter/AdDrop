'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { MockupImage } from './mockup-image';
import { MetaAd, PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import { seededRandom } from '@/lib/utils/seeded-random';
import { Globe, MoreHorizontal } from 'lucide-react';

interface MetaAdCardProps {
  content: Record<string, MetaAd>;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  listing?: ListingData;
}

export function MetaAdCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  listing,
}: MetaAdCardProps) {
  const tones = Object.keys(content);
  const [selectedTone, setSelectedTone] = useState<string>(tones[0] || 'professional');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const ad = content[selectedTone] || content[tones[0]];
  if (!ad) return null;

  const fullText = `Primary: ${ad.primaryText}\nHeadline: ${ad.headline}\nDescription: ${ad.description}`;

  // Stable engagement
  const seed = listing?.price ?? 500000;
  const pageLikes = seededRandom(seed, 50, 200);

  const pageName = listing?.listingAgent || 'Your Page';

  const platformIcon = (
    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
      <span className="text-white font-bold text-[10px]">M</span>
    </div>
  );

  return (
    <div className="w-full max-w-lg mx-auto">
      <AdCardWrapper
        platform="Meta Ad"
        platformIcon={platformIcon}
        dimensionLabel="1200 × 628"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={fullText}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        toneSwitcher={
          <div className="space-y-2">
            {tones.length > 1 && (
              <ToneSwitcher
                tones={tones}
                selected={selectedTone}
                onSelect={setSelectedTone}
                label="Ad Variant"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ad.headline.length > 40 ? 'destructive' : 'secondary'} className="text-xs">
                Headline: {ad.headline.length}/40
              </Badge>
              <Badge variant={ad.description.length > 30 ? 'destructive' : 'secondary'} className="text-xs">
                Description: {ad.description.length}/30
              </Badge>
            </div>
          </div>
        }
      >
        {/* Meta Ad mockup — no PhoneFrame (Ads Manager preview) */}
        <div className="bg-white text-[#050505] rounded border border-slate-200 overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
          {/* Advertiser context */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">f</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] leading-tight">{pageName}</div>
              <div className="flex items-center gap-1 text-[12px] text-[#65676B]">
                <span>Sponsored</span>
                <span>·</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-[#65676B] flex-shrink-0" />
          </div>

          {/* Primary Text */}
          <div className="px-4 pb-3">
            <p className="text-[15px] leading-[20px]">{ad.primaryText}</p>
          </div>

          {/* Image Area */}
          <MockupImage
            src={photos[selectedImageIndex] || ''}
            alt="Ad creative"
            aspectRatio="aspect-[1.91/1]"
            sizes="(max-width: 512px) 100vw, 512px"
            photos={photos}
            selectedIndex={selectedImageIndex}
            onImageSelect={setSelectedImageIndex}
          />

          {/* Link Preview Bar */}
          <div className="bg-[#F2F3F5] px-4 py-3 flex justify-between items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#65676B] uppercase tracking-wide truncate">
                www.yoursite.com
              </p>
              <p className="font-semibold text-[16px] text-[#050505] truncate">{ad.headline}</p>
              <p className="text-[14px] text-[#65676B] truncate">{ad.description}</p>
            </div>
            <button className="flex-shrink-0 text-[14px] font-semibold text-[#050505] border border-[#BEC3C9] rounded px-4 py-2 hover:bg-white/50 transition-colors">
              Learn More
            </button>
          </div>

          {/* Social proof */}
          <div className="px-4 py-2 text-[15px] text-[#65676B]">
            Jane Doe and {pageLikes} others like this
          </div>
        </div>
      </AdCardWrapper>
    </div>
  );
}
