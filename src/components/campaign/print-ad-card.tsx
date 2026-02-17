'use client';

import { useState } from 'react';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { MockupImage } from './mockup-image';
import { PrintAd, PlatformComplianceResult } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import { ListingData } from '@/lib/types/listing';
import { Newspaper } from 'lucide-react';

interface PrintAdCardProps {
  title: string;
  content: Record<string, PrintAd>;
  photos: string[];
  subtitle?: string;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  listing?: ListingData;
  variant?: 'full-page' | 'half-page';
}

function PrintIcon() {
  return (
    <div className="w-6 h-6 rounded bg-amber-600 flex items-center justify-center">
      <Newspaper className="h-3.5 w-3.5 text-white" />
    </div>
  );
}

export function PrintAdCard({
  title,
  content,
  photos,
  subtitle,
  complianceResult,
  qualityResult,
  onReplace,
  listing,
  variant = 'full-page',
}: PrintAdCardProps) {
  const tones = Object.keys(content);
  const [selectedTone, setSelectedTone] = useState(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const ad = content[selectedTone];
  if (!ad) return null;

  const fullText = `${ad.headline}\n\n${ad.body}\n\n${ad.cta}`;

  const agentName = listing?.listingAgent || 'Jane Smith';
  const broker = listing?.broker || 'Montana Realty Group';
  const agentFooter = `${agentName}  |  ${broker}  |  (406) 555-0123  |  License #RRE-2024001`;

  const dimensionLabel = variant === 'full-page'
    ? 'Full Page · 8.5 × 11"'
    : 'Half Page · 8.5 × 5.5"';

  const isFullPage = variant === 'full-page';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AdCardWrapper
        platform={title}
        platformIcon={<PrintIcon />}
        dimensionLabel={dimensionLabel}
        complianceResult={complianceResult}
        qualityResult={qualityResult}
        copyText={fullText}
        toneSwitcher={
          tones.length > 1 ? (
            <ToneSwitcher
              tones={tones}
              selected={selectedTone}
              onSelect={setSelectedTone}
            />
          ) : undefined
        }
        violations={complianceResult?.violations}
        onReplace={onReplace}
      >
        {/* Physical paper effect: rotation + layered shadow */}
        <div
          className="bg-white overflow-hidden relative"
          style={{
            boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {/* Paper edge highlight */}
          <div className="absolute top-0 left-0 w-12 h-12 bg-gradient-to-br from-white/40 to-transparent pointer-events-none z-10" />

          {isFullPage ? (
            /* Full-page layout: large hero image with overlay headline */
            <>
              <div className="relative">
                {photos.length > 0 ? (
                  <MockupImage
                    src={photos[selectedImageIndex]}
                    alt="Print ad hero"
                    aspectRatio="aspect-[4/3]"
                    sizes="(max-width: 672px) 100vw, 672px"
                    photos={photos}
                    selectedIndex={selectedImageIndex}
                    onImageSelect={setSelectedImageIndex}
                  />
                ) : (
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    <Newspaper className="h-16 w-16 text-slate-300" />
                  </div>
                )}
                {/* Gradient overlay with headline */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                  <h2
                    className="font-playfair text-[28px] md:text-[32px] font-bold text-white drop-shadow-lg leading-tight"
                  >
                    {ad.headline}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p
                  className="text-sm text-[#333333] leading-[1.65] whitespace-pre-wrap"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                >
                  {ad.body}
                </p>
              </div>

              {/* CTA */}
              <div className="px-6 pb-4">
                <p className="text-sm font-semibold text-[#1a1a1a] uppercase tracking-[0.08em]">
                  {ad.cta}
                </p>
              </div>
            </>
          ) : (
            /* Half-page layout: side-by-side image + text */
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 relative">
                {photos.length > 0 ? (
                  <MockupImage
                    src={photos[selectedImageIndex]}
                    alt="Print ad hero"
                    aspectRatio="aspect-[4/3] md:aspect-auto md:h-full"
                    sizes="(max-width: 672px) 100vw, 336px"
                    photos={photos}
                    selectedIndex={selectedImageIndex}
                    onImageSelect={setSelectedImageIndex}
                  />
                ) : (
                  <div className="aspect-[4/3] md:h-full bg-slate-100 flex items-center justify-center">
                    <Newspaper className="h-12 w-12 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="md:w-1/2 p-5 flex flex-col justify-center">
                <h2 className="font-playfair text-[22px] md:text-[26px] font-bold text-[#1a1a1a] leading-tight mb-3">
                  {ad.headline}
                </h2>
                <p
                  className="text-sm text-[#333333] leading-[1.65] whitespace-pre-wrap mb-4"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                >
                  {ad.body}
                </p>
                <p className="text-sm font-semibold text-[#1a1a1a] uppercase tracking-[0.08em]">
                  {ad.cta}
                </p>
              </div>
            </div>
          )}

          {/* Agent footer bar */}
          <div className="border-t border-slate-200 px-6 py-3 bg-slate-50">
            <p className="text-[11px] font-medium text-[#666666] text-center tracking-wide">
              {agentFooter}
            </p>
          </div>
        </div>
      </AdCardWrapper>
    </div>
  );
}
