'use client';

import { useState } from 'react';
import { AdCardWrapper } from './ad-card-wrapper';
import { MockupImage } from './mockup-image';
import { CardLayoutWrapper } from './card-layout-wrapper';
import { CardEditPanel } from './card-edit-panel';
import { PlatformComplianceResult } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import { EditableText } from './editable-text';

interface ListingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface ListingData {
  url?: string;
  address: ListingAddress;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  propertyType?: string;
  features?: string[];
  description?: string;
  photos?: string[];
  listingAgent?: string;
  broker?: string;
}

interface HomesTruliaCardProps {
  content: string;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
}

const HOMES_TEAL = '#00A98F';

const PlatformIcon = () => (
  <div
    className="w-5 h-5 rounded-full flex items-center justify-center"
    style={{ backgroundColor: HOMES_TEAL }}
  >
    <span className="text-white text-[10px] font-bold">H</span>
  </div>
);

export function HomesTruliaCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  onEditText,
  listing,
}: HomesTruliaCardProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const formattedPrice = listing?.price
    ? `$${listing.price.toLocaleString()}`
    : null;

  const address = listing?.address;
  const fullAddress = address
    ? `${address.street}, ${address.city}, ${address.state} ${address.zip}`
    : null;

  const violations = complianceResult?.violations ?? [];

  const platformIcon = <PlatformIcon />;

  const mockupContent = (
    <div className="rounded-lg overflow-hidden border border-border/60 text-sm">
      {/* Homes.com header bar */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: HOMES_TEAL }}
      >
        <PlatformIcon />
        <span className="text-white font-semibold text-sm tracking-wide" aria-hidden="true">
          homes
        </span>
        <span className="text-white/70 text-xs">.com</span>
      </div>

      {/* Property photo with price overlay */}
      <div className="relative">
        <MockupImage
          src={photos[selectedPhotoIndex] ?? ''}
          alt="Property photo"
          aspectRatio="aspect-[16/9]"
          sizes="(max-width: 448px) 100vw, 448px"
          photos={photos}
          selectedIndex={selectedPhotoIndex}
          onImageSelect={setSelectedPhotoIndex}
        />
        {formattedPrice && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 pointer-events-none">
            <span className="text-white font-bold text-lg">{formattedPrice}</span>
          </div>
        )}
      </div>

      {/* Address */}
      {fullAddress && (
        <div className="px-3 pt-2.5 pb-0">
          <p className="font-semibold text-foreground text-sm leading-snug">
            {address!.street}
          </p>
          <p className="text-muted-foreground text-xs">
            {address!.city}, {address!.state} {address!.zip}
          </p>
        </div>
      )}

      {/* Stats bar */}
      {listing && (
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-foreground">
          <span className="font-medium">{listing.beds} bd</span>
          <span className="text-border">|</span>
          <span className="font-medium">{listing.baths} ba</span>
          <span className="text-border">|</span>
          <span className="font-medium">{listing.sqft.toLocaleString()} sqft</span>
          {listing.propertyType && (
            <>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">{listing.propertyType}</span>
            </>
          )}
        </div>
      )}

      {/* Generated description */}
      <div className="px-3 pb-2.5">
        {/* Mobile: editable; Desktop: read-only */}
        <div className="lg:hidden">
          {onEditText ? (
            <EditableText
              value={content}
              onChange={() => {}}
              onSave={(val) => onEditText('homesComTrulia', 'description', val)}
              className="text-xs text-muted-foreground leading-relaxed"
            />
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
          )}
        </div>
        <div className="hidden lg:block">
          <p className={`text-xs text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
            {content}
          </p>
          {content.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium mt-1"
              style={{ color: HOMES_TEAL }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        <span className="mt-1.5 inline-block text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
          {content.length} chars
        </span>
      </div>

      {/* Agent footer */}
      {(listing?.listingAgent || listing?.broker) && (
        <div className="border-t border-border/50 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold"
            style={{ backgroundColor: HOMES_TEAL }}
          >
            {listing.listingAgent?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            {listing.listingAgent && (
              <p className="font-medium text-foreground truncate">
                {listing.listingAgent}
              </p>
            )}
            {listing.broker && (
              <p className="truncate">{listing.broker}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const previewPanel = (
    <AdCardWrapper
      platform="Homes.com"
      platformIcon={platformIcon}
      dimensionLabel="Listing Detail"
      complianceResult={complianceResult}
      qualityResult={qualityResult}
      copyText={content}
      violations={violations}
      onReplace={onReplace}
      platformId="homesComTrulia"
      charCountText={content}
    >
      {mockupContent}
    </AdCardWrapper>
  );

  const editPanel = (
    <CardEditPanel
      platform="Homes.com"
      platformIcon={platformIcon}
      content={content}
      onEditText={onEditText}
      platformId="homesComTrulia"
      fieldName="description"
      complianceResult={complianceResult}
      qualityResult={qualityResult}
    />
  );

  return (
    <CardLayoutWrapper editPanel={editPanel} previewPanel={previewPanel} />
  );
}
