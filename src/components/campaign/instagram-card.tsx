'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { MockupImage } from './mockup-image';
import { PhoneFrame } from './phone-frame';
import { AdTone, PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';

interface InstagramCardProps {
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

export function InstagramCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  listing,
}: InstagramCardProps) {
  const tones = Object.keys(content) as AdTone[];
  const [selectedTone, setSelectedTone] = useState<AdTone>(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const currentCaption = content[selectedTone] || '';
  const characterCount = currentCaption.length;
  const isOverLimit = characterCount > 2200;

  // Stable engagement numbers derived from listing price
  const seed = listing?.price ?? 450000;
  const likeCount = seededRandom(seed, 150, 400);
  const commentCount = seededRandom(seed + 1, 5, 15);

  const username = listing?.listingAgent?.toLowerCase().replace(/\s+/g, '_') || 'montana_realestate';
  const location = listing ? `${listing.address.city}, ${listing.address.state}` : '';

  const truncateCaption = (text: string, limit: number) => {
    if (text.length <= limit) return text;
    return (
      <>
        {text.slice(0, limit)}
        <span className="text-[#8e8e8e]">... more</span>
      </>
    );
  };

  const platformIcon = (
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <AdCardWrapper
        platform="Instagram Feed"
        platformIcon={platformIcon}
        dimensionLabel="1080 × 1080"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={currentCaption}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        toneSwitcher={
          <div className="space-y-2">
            <ToneSwitcher
              tones={tones}
              selected={selectedTone}
              onSelect={(t) => setSelectedTone(t as AdTone)}
            />
            <Badge variant={isOverLimit ? 'destructive' : 'secondary'} className="text-xs">
              {characterCount} / 2200 characters
            </Badge>
          </div>
        }
      >
        <PhoneFrame>
          {/* Instagram mockup interior */}
          <div className="bg-white text-[#262626]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
            {/* IG Header bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {/* Profile pic with gradient ring */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-slate-200" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm tracking-[-0.01em]">{username}</span>
                    <button className="text-xs font-semibold text-[#0095F6] hover:text-[#00376B]">Follow</button>
                  </div>
                  {location && (
                    <span className="text-xs text-[#262626]">{location}</span>
                  )}
                </div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-[#262626]" />
            </div>

            {/* Image area */}
            <MockupImage
              src={photos[selectedImageIndex] || ''}
              alt="Instagram post"
              aspectRatio="aspect-square"
              sizes="(max-width: 448px) 100vw, 448px"
              photos={photos}
              selectedIndex={selectedImageIndex}
              onImageSelect={setSelectedImageIndex}
            />

            {/* Carousel dots */}
            <div className="flex justify-center gap-1 py-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === 0 ? 'bg-[#0095F6]' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Action row */}
            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-4">
                <Heart className="h-6 w-6 text-[#262626]" />
                <MessageCircle className="h-6 w-6 text-[#262626]" />
                <Send className="h-6 w-6 text-[#262626]" />
              </div>
              <Bookmark className="h-6 w-6 text-[#262626]" />
            </div>

            {/* Likes */}
            <div className="px-3 pt-1">
              <p className="text-sm">
                Liked by <span className="font-semibold">{username}</span> and{' '}
                <span className="font-semibold">{likeCount} others</span>
              </p>
            </div>

            {/* Caption */}
            <div className="px-3 pt-1">
              <p className="text-sm leading-[18px]">
                <span className="font-semibold">{username}</span>{' '}
                {truncateCaption(currentCaption, 125)}
              </p>
            </div>

            {/* View comments */}
            <div className="px-3 pt-1">
              <p className="text-sm text-[#8e8e8e]">
                View all {commentCount} comments
              </p>
            </div>

            {/* Timestamp */}
            <div className="px-3 pt-1 pb-3">
              <p className="text-[10px] uppercase tracking-[0.2px] text-[#8e8e8e]">
                2 hours ago
              </p>
            </div>
          </div>
        </PhoneFrame>
      </AdCardWrapper>
    </div>
  );
}
