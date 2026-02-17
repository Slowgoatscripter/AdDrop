'use client';

import React, { useState } from 'react';
import { AdCardWrapper } from './ad-card-wrapper';
import { MockupImage } from './mockup-image';
import { PlatformComplianceResult } from '@/lib/types';
import type { PlatformQualityResult, QualityIssue } from '@/lib/types/quality';
import type { ListingData } from '@/lib/types/listing';

interface RealtorCardProps {
  content: string;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  listing?: ListingData;
}

function RealtorPlatformIcon() {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: '#D92228' }}
    >
      <span className="text-white text-[10px] font-bold">r</span>
    </div>
  );
}

export function RealtorCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  listing,
}: RealtorCardProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const photo = photos[selectedPhotoIndex] ?? photos[0] ?? '';

  const formattedPrice = listing
    ? `$${listing.price.toLocaleString()}`
    : null;

  const violations = complianceResult?.violations ?? [];

  return (
    <AdCardWrapper
      platform="Realtor.com"
      platformIcon={<RealtorPlatformIcon />}
      dimensionLabel="Listing Detail"
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      copyText={content}
      violations={violations}
      onReplace={onReplace}
      onRevert={onRevert}
    >
      <div className="w-full max-w-md mx-auto">
        {/* Property photo with price overlay */}
        <div className="relative">
          <MockupImage
            src={photo}
            alt={listing ? `${listing.address.street}` : 'Property photo'}
            aspectRatio="aspect-[16/9]"
            sizes="(max-width: 448px) 100vw, 448px"
            photos={photos}
            selectedIndex={selectedPhotoIndex}
            onImageSelect={setSelectedPhotoIndex}
          />
          {formattedPrice && (
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white font-bold text-xl">{formattedPrice}</p>
              {listing && (
                <p className="text-white/90 text-xs">
                  {listing.address.street}, {listing.address.city},{' '}
                  {listing.address.state} {listing.address.zip}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats bar: beds, baths, sqft */}
        {listing && (
          <div className="flex items-center gap-4 px-3 py-2 border-b border-gray-200 bg-white text-sm text-gray-700">
            <span className="font-medium">{listing.beds} bd</span>
            <span className="text-gray-300">|</span>
            <span className="font-medium">{listing.baths} ba</span>
            <span className="text-gray-300">|</span>
            <span className="font-medium">{listing.sqft.toLocaleString()} sqft</span>
          </div>
        )}

        {/* Generated description */}
        <div className="px-3 py-3 bg-white">
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{content}</p>
          <p className="text-xs text-muted-foreground mt-2">{content.length} characters</p>
        </div>

        {/* Agent footer */}
        {listing && (listing.listingAgent || listing.broker) && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 space-y-0.5">
            {listing.listingAgent && (
              <p>Listed by: <span className="font-medium text-gray-700">{listing.listingAgent}</span></p>
            )}
            {listing.broker && (
              <p>Brokerage: <span className="font-medium text-gray-700">{listing.broker}</span></p>
            )}
          </div>
        )}
      </div>
    </AdCardWrapper>
  );
}
