'use client';

import { AdCardWrapper } from './ad-card-wrapper';
import { MockupImage } from './mockup-image';
import { PlatformComplianceResult, ListingData } from '@/lib/types';
import type { PlatformQualityResult, QualityIssue } from '@/lib/types/quality';
import { useState } from 'react';
import { EditableText } from './editable-text';

interface MlsCardProps {
  description: string;
  listing?: ListingData;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
}

function MlsIcon() {
  return (
    <div
      className="w-6 h-6 rounded flex items-center justify-center"
      style={{ backgroundColor: '#374151' }}
    >
      <span className="text-white text-[9px] font-bold tracking-tight leading-none">MLS</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-24 flex-shrink-0">
        {label}
      </span>
      <span className="text-[12px] text-slate-800 flex-1">{value}</span>
    </div>
  );
}

export function MlsCard({
  description,
  listing,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  onEditText,
}: MlsCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const mlsNumber = listing?.mlsNumber || 'MLS-PENDING';
  const price = listing?.price ? `$${listing.price.toLocaleString()}` : 'N/A';
  const address = listing?.address
    ? `${listing.address.street}, ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`
    : 'N/A';
  const propertyType = listing?.propertyType || 'N/A';
  const beds = listing?.beds != null ? `${listing.beds}` : 'N/A';
  const baths = listing?.baths != null ? `${listing.baths}` : 'N/A';
  const sqft = listing?.sqft != null ? listing.sqft.toLocaleString() : 'N/A';
  const lotSize = listing?.lotSize || 'N/A';
  const yearBuilt = listing?.yearBuilt != null ? `${listing.yearBuilt}` : 'N/A';
  const agentName = listing?.listingAgent || 'N/A';
  const broker = listing?.broker || 'N/A';
  const photos = listing?.photos || [];

  const charCount = description.length;
  const charColor =
    charCount < 1000
      ? 'text-amber-600'
      : charCount > 4000
      ? 'text-red-600'
      : 'text-green-600';

  return (
    <div className="w-full max-w-md mx-auto">
      <AdCardWrapper
        platform="MLS Listing"
        platformIcon={<MlsIcon />}
        dimensionLabel="MLS System"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={description}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        onRevert={onRevert}
      >
        {/* MLS Header bar */}
        <div
          className="rounded-t-lg px-3 py-2 flex items-center justify-between mb-3"
          style={{ backgroundColor: '#374151' }}
        >
          <span className="text-white text-xs font-semibold tracking-wide">
            MLS Listing Detail
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ backgroundColor: '#1f2937', color: '#d1d5db' }}
          >
            {mlsNumber}
          </span>
        </div>

        {/* Photo section */}
        {photos.length > 0 && (
          <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
            <MockupImage
              src={photos[selectedImageIndex]}
              alt="Property photo"
              aspectRatio="aspect-[4/3]"
              sizes="(max-width: 768px) 100vw, 448px"
              photos={photos}
              selectedIndex={selectedImageIndex}
              onImageSelect={setSelectedImageIndex}
            />
          </div>
        )}

        {/* Structured data grid */}
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3">
          <FieldRow
            label="Status"
            value={
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-700">
                Active
              </span>
            }
          />
          <FieldRow label="List Price" value={price} />
          <FieldRow label="Address" value={address} />
          <FieldRow label="Type" value={propertyType} />
          <FieldRow
            label="Beds/Baths"
            value={`${beds} bd / ${baths} ba`}
          />
          <FieldRow label="Sq Ft" value={sqft} />
          <FieldRow label="Lot Size" value={lotSize} />
          <FieldRow label="Year Built" value={yearBuilt} />
        </div>

        {/* Public Remarks section */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
            Public Remarks
          </p>
          {onEditText ? (
            <EditableText
              value={description}
              onChange={() => {}}
              onSave={(val) => onEditText('mlsDescription', 'description', val)}
              className="font-mono text-sm text-slate-800"
            />
          ) : (
            <p className="font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Character count badge + range note */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-xs font-semibold tabular-nums ${charColor}`}
          >
            {charCount} chars
          </span>
          <span className="text-[10px] text-slate-400">(Recommended: 1,000–4,000)</span>
        </div>

        {/* Agent/broker attribution */}
        <div className="border-t border-slate-100 pt-2">
          <p className="text-[11px] text-slate-500">
            <span className="font-medium">Agent:</span> {agentName}
            {broker !== 'N/A' && (
              <>
                {' '}
                &middot; <span className="font-medium">Broker:</span> {broker}
              </>
            )}
          </p>
        </div>
      </AdCardWrapper>
    </div>
  );
}
