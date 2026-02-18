'use client';

import { useState } from 'react';
import { AdCardWrapper } from './ad-card-wrapper';
import { BrowserFrame } from './browser-frame';
import { ViolationDetails } from './violation-details';
import { GoogleAd, PlatformComplianceResult } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import type { QualityIssue } from '@/lib/types/quality';
import { ListingData } from '@/lib/types/listing';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EditableText } from './editable-text';

interface GoogleAdsCardProps {
  ads: GoogleAd[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  listing?: ListingData;
}

/** Google Ads icon (simplified "Ad" badge) */
function GoogleAdsIcon() {
  return (
    <div className="w-6 h-6 rounded bg-[#4285F4] flex items-center justify-center">
      <span className="text-white text-[10px] font-bold">Ad</span>
    </div>
  );
}

export function GoogleAdsCard({
  ads,
  complianceResult,
  qualityResult,
  onReplace,
  onRevert,
  onEditText,
  listing,
}: GoogleAdsCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeAd = ads[activeIndex];
  if (!activeAd) return null;

  const city = listing?.address?.city || 'Montana';
  const state = listing?.address?.state || 'MT';
  const propertyType = listing?.propertyType || 'homes';

  const searchQuery = `${propertyType} for sale ${city} ${state}`;
  const displayUrl = `www.yoursite.com \u203A ${city.toLowerCase().replace(/\s+/g, '-')}-listings`;

  const copyText = `${activeAd.headline}\n${activeAd.description}`;

  const prev = () => setActiveIndex((i) => (i > 0 ? i - 1 : ads.length - 1));
  const next = () => setActiveIndex((i) => (i < ads.length - 1 ? i + 1 : 0));

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AdCardWrapper
        platform="Google Ads"
        platformIcon={<GoogleAdsIcon />}
        dimensionLabel="Responsive Search Ad"
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={copyText}
        violations={complianceResult?.violations}
        onReplace={onReplace}
        onRevert={onRevert}
        platformId="googleAds"
        charCountText={activeAd.headline}
        charCountElement="headline"
      >
        <BrowserFrame searchQuery={searchQuery}>
          <div className="px-4 md:px-6 py-4 bg-white">
            {/* SERP result */}
            <div className="space-y-1">
              {/* Sponsored label + display URL */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#202124]">Sponsored</span>
                <span className="text-xs text-[#202124]">&middot;</span>
              </div>
              <div className="flex items-center gap-0.5 text-sm text-[#202124]">
                {/* Favicon placeholder */}
                <div className="w-4 h-4 rounded-full bg-slate-200 mr-1.5 flex-shrink-0" />
                <span className="truncate">
                  <span className="font-medium">{displayUrl.split(' ')[0]}</span>
                  <span className="text-[#5F6368]">
                    {' '}{displayUrl.slice(displayUrl.indexOf('\u203A'))}
                  </span>
                </span>
              </div>

              {/* Headline — Google blue */}
              {onEditText ? (
                <EditableText
                  value={activeAd.headline}
                  onChange={() => {}}
                  onSave={(val) => onEditText(`googleAds[${activeIndex}]`, 'headline', val)}
                  multiline={false}
                  className="text-xl leading-[26px] text-[#1a0dab]"
                />
              ) : (
                <h3
                  className="text-xl leading-[26px] text-[#1a0dab] hover:underline cursor-pointer"
                  style={{ fontFamily: 'arial, sans-serif' }}
                >
                  {activeAd.headline}
                </h3>
              )}

              {/* Description */}
              {onEditText ? (
                <EditableText
                  value={activeAd.description}
                  onChange={() => {}}
                  onSave={(val) => onEditText(`googleAds[${activeIndex}]`, 'description', val)}
                  className="text-sm leading-[22px] text-[#4D5156]"
                />
              ) : (
                <p
                  className="text-sm leading-[22px] text-[#4D5156]"
                  style={{ fontFamily: 'arial, sans-serif' }}
                >
                  {activeAd.description}
                </p>
              )}
            </div>

            {/* Variation navigator */}
            {ads.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={prev}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                  aria-label="Previous variation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {ads.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === activeIndex
                          ? 'bg-[#1a0dab]'
                          : 'bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`Variation ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={next}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                  aria-label="Next variation"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-400 ml-1">
                  {activeIndex + 1} / {ads.length}
                </span>
              </div>
            )}
          </div>
        </BrowserFrame>
      </AdCardWrapper>
    </div>
  );
}
