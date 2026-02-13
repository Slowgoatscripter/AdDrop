'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { MockupImage } from './mockup-image';
import { PhoneFrame } from './phone-frame';
import { PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
} from 'lucide-react';

interface FacebookCardProps {
  content: Record<string, string>;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  listing?: ListingData;
}

/** Derive a stable pseudo-random number from a seed within [min, max] */
function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const t = x - Math.floor(x);
  return Math.floor(t * (max - min + 1)) + min;
}

export function FacebookCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  listing,
}: FacebookCardProps) {
  const tones = Object.keys(content);
  const [selectedTone, setSelectedTone] = useState<string>(tones[0] || 'professional');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const currentContent = content[selectedTone] || '';

  // Stable engagement numbers derived from listing price
  const seed = listing?.price ?? 350000;
  const reactionCount = seededRandom(seed, 15, 50);
  const fbCommentCount = seededRandom(seed + 1, 5, 15);
  const shareCount = seededRandom(seed + 2, 3, 10);

  const pageName = listing?.listingAgent || 'Your Brand';

  /** Truncate post text at ~3 lines (~180 chars) with "See More" */
  const truncatePost = (text: string) => {
    const limit = 180;
    if (text.length <= limit) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, limit)}...{' '}
        <span className="text-[#385898] cursor-pointer">See More</span>
      </>
    );
  };

  const platformIcon = (
    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
      <span className="text-white font-bold text-[10px]">f</span>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <AdCardWrapper
        platform="Facebook"
        platformIcon={platformIcon}
        dimensionLabel="1200 × 628"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={currentContent}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        toneSwitcher={
          <div className="space-y-2">
            <ToneSwitcher
              tones={tones}
              selected={selectedTone}
              onSelect={setSelectedTone}
            />
            <Badge variant="outline" className="text-xs">
              {currentContent.length} characters
            </Badge>
          </div>
        }
      >
        <PhoneFrame>
          {/* Facebook mockup interior */}
          <div className="bg-white text-[#050505]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
            {/* FB Post Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">f</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] leading-tight">{pageName}</div>
                <div className="text-[13px] text-[#65676B]">Just now · 🌐</div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-[#65676B] flex-shrink-0" />
            </div>

            {/* Post Text */}
            <div className="px-4 pb-3">
              <p className="text-[15px] leading-[20px] whitespace-pre-wrap">
                {truncatePost(currentContent)}
              </p>
            </div>

            {/* Image Area */}
            <MockupImage
              src={photos[selectedImageIndex] || ''}
              alt="Facebook post image"
              aspectRatio="aspect-[1.91/1]"
              sizes="(max-width: 448px) 100vw, 448px"
              photos={photos}
              selectedIndex={selectedImageIndex}
              onImageSelect={setSelectedImageIndex}
            />

            {/* Engagement Row */}
            <div className="px-4 py-2 flex justify-between items-center text-[15px] text-[#65676B] border-b border-slate-200">
              <div className="flex items-center gap-1">
                <span className="flex -space-x-1">
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] relative z-30">👍</span>
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] relative z-20">❤️</span>
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-yellow-400 text-white text-[10px] relative z-10">😮</span>
                </span>
                <span className="ml-1">{reactionCount}</span>
              </div>
              <span>{fbCommentCount} Comments · {shareCount} Shares</span>
            </div>

            {/* Action Buttons */}
            <div className="px-2 py-1 flex justify-around">
              <button className="flex items-center gap-1.5 text-[15px] font-semibold text-[#65676B] py-2 px-4 hover:bg-slate-50 rounded-md flex-1 justify-center">
                <ThumbsUp className="w-5 h-5" />
                <span>Like</span>
              </button>
              <button className="flex items-center gap-1.5 text-[15px] font-semibold text-[#65676B] py-2 px-4 hover:bg-slate-50 rounded-md flex-1 justify-center">
                <MessageCircle className="w-5 h-5" />
                <span>Comment</span>
              </button>
              <button className="flex items-center gap-1.5 text-[15px] font-semibold text-[#65676B] py-2 px-4 hover:bg-slate-50 rounded-md flex-1 justify-center">
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </PhoneFrame>
      </AdCardWrapper>
    </div>
  );
}
