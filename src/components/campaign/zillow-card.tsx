'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AdCardWrapper } from './ad-card-wrapper';
import { MockupImage } from './mockup-image';
import { PlatformComplianceResult, ListingData } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import type { QualityIssue } from '@/lib/types/quality';

interface ZillowCardProps {
  content: string;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  listing?: ListingData;
}

const ZILLOW_BLUE = '#006AFF';

export function ZillowCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  listing,
}: ZillowCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const platformIcon = (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: ZILLOW_BLUE }}
    >
      <span className="text-white text-[10px] font-bold">Z</span>
    </div>
  );

  const characterCount = content.length;
  const isOverLimit = characterCount > 2000;

  const formattedPrice = listing?.price
    ? `$${listing.price.toLocaleString()}`
    : null;

  const formattedSqft = listing?.sqft
    ? listing.sqft.toLocaleString()
    : null;

  const agentName = listing?.listingAgent ?? null;
  const brokerName = listing?.broker ?? null;
  const address = listing?.address
    ? `${listing.address.street}, ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`
    : null;

  return (
    <div className="w-full max-w-md mx-auto">
      <AdCardWrapper
        platform="Zillow"
        platformIcon={platformIcon}
        dimensionLabel="Listing Detail"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={content}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        onRevert={onRevert}
        toneSwitcher={
          <Badge
            variant={isOverLimit ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {characterCount} characters
          </Badge>
        }
      >
        {/* Zillow card mockup — card-style, no phone frame */}
        <div
          className="rounded-lg overflow-hidden border border-slate-200 bg-white text-[#1a1a1a]"
          style={{ fontFamily: "ProximaNova, Arial, sans-serif" }}
        >
          {/* Header bar */}
          <div
            className="flex items-center px-3 py-2"
            style={{ backgroundColor: ZILLOW_BLUE }}
          >
            <span className="text-white font-bold text-base tracking-tight">Zillow</span>
          </div>

          {/* Property photo with price overlay */}
          <div className="relative">
            <MockupImage
              src={photos[selectedImageIndex] || ''}
              alt="Property photo"
              aspectRatio="aspect-video"
              sizes="(max-width: 448px) 100vw, 448px"
              photos={photos}
              selectedIndex={selectedImageIndex}
              onImageSelect={setSelectedImageIndex}
            />

            {/* Price overlay */}
            {formattedPrice && (
              <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-white font-bold text-xl drop-shadow">
                  {formattedPrice}
                </span>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100">
            {listing?.beds != null && (
              <span className="text-sm font-semibold text-[#1a1a1a]">
                {listing.beds} bd
              </span>
            )}
            {listing?.baths != null && (
              <span className="text-sm text-slate-400">|</span>
            )}
            {listing?.baths != null && (
              <span className="text-sm font-semibold text-[#1a1a1a]">
                {listing.baths} ba
              </span>
            )}
            {formattedSqft && (
              <>
                <span className="text-sm text-slate-400">|</span>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {formattedSqft} sqft
                </span>
              </>
            )}

            {/* Zestimate badge */}
            <div className="ml-auto">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: '#EBF3FF', color: ZILLOW_BLUE }}
              >
                Zestimate&#174;
              </span>
            </div>
          </div>

          {/* Address */}
          {address && (
            <div className="px-3 pt-2">
              <p className="text-xs text-slate-500 leading-tight">{address}</p>
            </div>
          )}

          {/* Description / generated content */}
          <div className="px-3 py-2">
            <p className="text-sm text-[#444] leading-relaxed line-clamp-5">
              {content}
            </p>
          </div>

          {/* Agent info footer */}
          {(agentName || brokerName) && (
            <div className="px-3 pt-2 pb-3 border-t border-slate-100 flex items-center gap-2">
              {/* Agent avatar placeholder */}
              <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500">
                  {agentName ? agentName.charAt(0) : 'A'}
                </span>
              </div>
              <div className="flex flex-col">
                {agentName && (
                  <span className="text-xs font-semibold text-[#1a1a1a]">
                    {agentName}
                  </span>
                )}
                {brokerName && (
                  <span className="text-[10px] text-slate-500">{brokerName}</span>
                )}
              </div>
              <div className="ml-auto">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ backgroundColor: ZILLOW_BLUE, color: '#fff' }}
                >
                  Contact
                </span>
              </div>
            </div>
          )}
        </div>
      </AdCardWrapper>
    </div>
  );
}
