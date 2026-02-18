'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AdCardWrapper } from './ad-card-wrapper';
import { MockupImage } from './mockup-image';
import { PhoneFrame } from './phone-frame';
import { CardLayoutWrapper } from './card-layout-wrapper';
import { CardEditPanel } from './card-edit-panel';
import { PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import type { QualityIssue } from '@/lib/types/quality';
import { seededRandom } from '@/lib/utils/seeded-random';
import {
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  MoreHorizontal,
} from 'lucide-react';
import { EditableText } from './editable-text';

interface TwitterCardProps {
  content: string; // Single string, not tone-keyed
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
}

export function TwitterCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  onEditText,
  listing,
}: TwitterCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const characterCount = content.length;
  const isOverLimit = characterCount > 280;

  const seed = listing?.price ?? 450000;
  const replyCount = seededRandom(seed, 2, 12);
  const repostCount = seededRandom(seed + 1, 5, 30);
  const likeCount = seededRandom(seed + 2, 20, 150);

  const displayName = listing?.listingAgent || 'Real Estate';
  const handle = '@' + (listing?.listingAgent?.toLowerCase().replace(/\s+/g, '') || 'realestate');

  const platformIcon = (
    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
      <span className="text-white text-[10px] font-bold">𝕏</span>
    </div>
  );

  const mockupContent = (
    <PhoneFrame>
      {/* Twitter/X post mockup */}
      <div
        className="bg-white text-[#0f1419]"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
      >
        {/* X header bar */}
        <div className="flex items-center justify-center px-4 py-3 border-b border-slate-100">
          <div className="w-6 h-6 flex items-center justify-center">
            <span className="text-black text-lg font-bold">𝕏</span>
          </div>
        </div>

        {/* Post */}
        <div className="px-4 py-3">
          {/* Profile row */}
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              {/* Name / handle / timestamp */}
              <div className="flex items-center gap-1 text-[15px]">
                <span className="font-bold truncate">{displayName}</span>
                <span className="text-[#536471] truncate">{handle}</span>
                <span className="text-[#536471]">·</span>
                <span className="text-[#536471]">2h</span>
                <MoreHorizontal aria-label="More options" className="h-4 w-4 text-[#536471] ml-auto flex-shrink-0" />
              </div>

              {/* Post text */}
              {/* Mobile: editable; Desktop: read-only */}
              <div className="lg:hidden">
                {onEditText ? (
                  <EditableText
                    value={content}
                    onChange={() => {}}
                    onSave={(val) => onEditText('twitter', 'text', val)}
                    className="text-[15px] leading-5 mt-0.5"
                  />
                ) : (
                  <p className="text-[15px] leading-5 mt-0.5 whitespace-pre-wrap">
                    {content}
                  </p>
                )}
              </div>
              <div className="hidden lg:block">
                <p className="text-[15px] leading-5 mt-0.5 whitespace-pre-wrap">
                  {content}
                </p>
              </div>

              {/* Image */}
              {photos.length > 0 && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200">
                  <MockupImage
                    src={photos[selectedImageIndex] || ''}
                    alt="Property photo"
                    aspectRatio="aspect-video"
                    sizes="(max-width: 448px) 100vw, 448px"
                    photos={photos}
                    selectedIndex={selectedImageIndex}
                    onImageSelect={setSelectedImageIndex}
                  />
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between mt-3 max-w-[425px] text-[#536471]">
                <div className="flex items-center gap-1 group cursor-pointer">
                  <MessageCircle aria-label="Comment" className="h-[18px] w-[18px]" />
                  <span className="text-[13px]">{replyCount}</span>
                </div>
                <div className="flex items-center gap-1 group cursor-pointer">
                  <Repeat2 aria-label="Repost" className="h-[18px] w-[18px]" />
                  <span className="text-[13px]">{repostCount}</span>
                </div>
                <div className="flex items-center gap-1 group cursor-pointer">
                  <Heart aria-label="Like" className="h-[18px] w-[18px]" />
                  <span className="text-[13px]">{likeCount}</span>
                </div>
                <div className="flex items-center gap-1 group cursor-pointer">
                  <Bookmark aria-label="Save" className="h-[18px] w-[18px]" />
                </div>
                <div className="flex items-center gap-1 group cursor-pointer">
                  <Share aria-label="Share" className="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  const previewPanel = (
    <AdCardWrapper
      platform="Twitter / X"
      platformIcon={platformIcon}
      dimensionLabel="Post"
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      copyText={content}
      violations={complianceResult?.violations}
      onReplace={onReplace}
      onRevert={onRevert}
      platformId="twitter"
      charCountText={content}
      toneSwitcher={
        <Badge variant={isOverLimit ? 'destructive' : 'secondary'} className="text-xs">
          {characterCount} / 280 characters
        </Badge>
      }
    >
      {mockupContent}
    </AdCardWrapper>
  );

  const editPanel = (
    <CardEditPanel
      platform="Twitter / X"
      platformIcon={platformIcon}
      content={content}
      onEditText={onEditText}
      platformId="twitter"
      fieldName="text"
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      maxLength={280}
    />
  );

  return (
    <CardLayoutWrapper editPanel={editPanel} previewPanel={previewPanel} />
  );
}
