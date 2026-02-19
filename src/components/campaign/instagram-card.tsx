'use client';

import { useState } from 'react';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { MockupImage } from './mockup-image';
import { PhoneFrame } from './phone-frame';
import { AdTone, PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import type { QualityIssue } from '@/lib/types/quality';
import { seededRandom } from '@/lib/utils/seeded-random';
import { CardLayoutWrapper } from './card-layout-wrapper';
import { CardEditPanel } from './card-edit-panel';
import { EditableText } from './editable-text';
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
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
}

export function InstagramCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  onEditText,
  listing,
}: InstagramCardProps) {
  const tones = Object.keys(content) as AdTone[];
  const [selectedTone, setSelectedTone] = useState<AdTone>(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const currentCaption = content[selectedTone] || '';
  // Stable engagement numbers derived from listing price
  const seed = listing?.price ?? 450000;
  const likeCount = seededRandom(seed, 150, 400);
  const commentCount = seededRandom(seed + 1, 5, 15);

  const username = listing?.listingAgent?.toLowerCase().replace(/\s+/g, '_') || 'montana_realestate';
  const location = listing ? `${listing.address.city}, ${listing.address.state}` : '';

  const truncateCaption = (text: string, limit: number) => {
    if (expanded || text.length <= limit) {
      return (
        <>
          {text}
          {expanded && text.length > limit && (
            <button
              onClick={() => setExpanded(false)}
              className="text-[#8e8e8e] bg-transparent border-none cursor-pointer p-0 ml-1"
            >
              less
            </button>
          )}
        </>
      );
    }
    return (
      <>
        {text.slice(0, limit)}
        <button
          onClick={() => setExpanded(true)}
          className="text-[#8e8e8e] bg-transparent border-none cursor-pointer p-0"
        >
          ... more
        </button>
      </>
    );
  };

  const platformIcon = (
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
  );

  const mockupContent = (
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
          <MoreHorizontal aria-label="More options" className="h-5 w-5 text-[#262626]" />
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
            <Heart aria-label="Like" className="h-6 w-6 text-[#262626]" />
            <MessageCircle aria-label="Comment" className="h-6 w-6 text-[#262626]" />
            <Send aria-label="Share" className="h-6 w-6 text-[#262626]" />
          </div>
          <Bookmark aria-label="Save" className="h-6 w-6 text-[#262626]" />
        </div>

        {/* Likes */}
        <div className="px-3 pt-1">
          <p className="text-sm">
            Liked by <span className="font-semibold">{username}</span> and{' '}
            <span className="font-semibold">{likeCount} others</span>
          </p>
        </div>

        {/* Caption — mobile: editable, desktop: read-only with truncation */}
        <div className="px-3 pt-1">
          <div className="lg:hidden">
            {onEditText ? (
              <div className="text-sm leading-[18px]">
                <span className="font-semibold">{username}</span>{' '}
                <EditableText
                  value={currentCaption}
                  onChange={() => {}}
                  onSave={(newValue) => onEditText('instagram', selectedTone, newValue)}
                  maxLength={2200}
                />
              </div>
            ) : (
              <p className="text-sm leading-[18px]">
                <span className="font-semibold">{username}</span>{' '}
                {truncateCaption(currentCaption, 125)}
              </p>
            )}
          </div>
          <div className="hidden lg:block">
            <p className="text-sm leading-[18px]">
              <span className="font-semibold">{username}</span>{' '}
              {truncateCaption(currentCaption, 125)}
            </p>
          </div>
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
  );

  const previewPanel = (
    <AdCardWrapper
      platform="Instagram Feed"
      platformIcon={platformIcon}
      dimensionLabel="1080 × 1080"
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      copyText={currentCaption}
      violations={complianceResult?.violations}
      onReplace={onReplace}
      onRevert={onRevert}
      platformId="instagram"
      charCountText={currentCaption}
      photoUrl={photos[0]}
      photoPlatform="instagram"
      toneSwitcher={
        <ToneSwitcher
          tones={tones}
          selected={selectedTone}
          onSelect={(t) => setSelectedTone(t as AdTone)}
        />
      }
    >
      {mockupContent}
    </AdCardWrapper>
  );

  const editPanel = (
    <CardEditPanel
      platform="Instagram Feed"
      platformIcon={platformIcon}
      content={currentCaption}
      onEditText={onEditText ? (_platform, _field, val) => {
        onEditText('instagram', selectedTone, val);
      } : undefined}
      platformId="instagram"
      fieldName={selectedTone}
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      maxLength={2200}
    >
      <ToneSwitcher
        tones={tones}
        selected={selectedTone}
        onSelect={(t) => setSelectedTone(t as AdTone)}
      />
    </CardEditPanel>
  );

  return (
    <CardLayoutWrapper editPanel={editPanel} previewPanel={previewPanel} />
  );
}
