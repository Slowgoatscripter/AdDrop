'use client';

import { useState } from 'react';
import { AdCardWrapper } from './ad-card-wrapper';
import { ToneSwitcher } from './tone-switcher';
import { MockupImage } from './mockup-image';
import { PrintAd, PlatformComplianceResult } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import { ListingData } from '@/lib/types/listing';
import { Mail, User } from 'lucide-react';

interface PostcardCardProps {
  content: Record<string, { front: PrintAd; back: string }>;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  listing?: ListingData;
}

function PostcardIcon() {
  return (
    <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center">
      <Mail className="h-3.5 w-3.5 text-white" />
    </div>
  );
}

export function PostcardCard({
  content,
  photos,
  complianceResult,
  qualityResult,
  onReplace,
  listing,
}: PostcardCardProps) {
  const tones = Object.keys(content);
  const [selectedTone, setSelectedTone] = useState(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const postcard = content[selectedTone];
  if (!postcard) return null;

  const fullText = `FRONT:\n${postcard.front.headline}\n${postcard.front.body}\n${postcard.front.cta}\n\nBACK:\n${postcard.back}`;

  const agentName = listing?.listingAgent || 'Jane Smith';
  const broker = listing?.broker || 'Montana Realty Group';
  const agentInfo = `${agentName}  |  ${broker}  |  (406) 555-0123  |  License #RRE-2024001`;

  const price = listing?.price
    ? `$${listing.price.toLocaleString()}`
    : '';

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AdCardWrapper
        platform="Postcard"
        platformIcon={<PostcardIcon />}
        dimensionLabel="6 × 4 Direct Mail"
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
        {/* Side-by-side proof layout with stack effect */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* FRONT */}
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Front</p>
            {/* Stack effect wrapper */}
            <div className="relative">
              {/* Pseudo-stack layers */}
              <div
                className="absolute inset-0 bg-white rounded-lg border border-slate-200"
                style={{
                  transform: 'rotate(-1deg) translate(-2px, 3px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
              <div
                className="absolute inset-0 bg-white rounded-lg border border-slate-200"
                style={{
                  transform: 'rotate(0.5deg) translate(1px, 2px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              />
              {/* Actual front card */}
              <div
                className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[3/2] bg-slate-100"
                style={{
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                {photos.length > 0 ? (
                  <>
                    <MockupImage
                      src={photos[selectedImageIndex]}
                      alt="Postcard front"
                      aspectRatio="aspect-[3/2]"
                      sizes="(max-width: 768px) 100vw, 384px"
                      photos={photos}
                      selectedIndex={selectedImageIndex}
                      onImageSelect={setSelectedImageIndex}
                    />
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                    {/* JUST LISTED banner */}
                    <div className="absolute top-3 left-0">
                      <div className="bg-red-700 px-4 py-1">
                        <span className="text-white text-sm font-black uppercase tracking-[0.12em]">
                          Just Listed
                        </span>
                      </div>
                    </div>

                    {/* Front text content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 space-y-1.5">
                      <h2 className="text-2xl font-extrabold text-white drop-shadow-lg uppercase tracking-[0.04em] leading-tight">
                        {postcard.front.headline}
                      </h2>
                      {price && (
                        <p className="text-[28px] font-bold text-white drop-shadow-lg">
                          {price}
                        </p>
                      )}
                      <p className="text-sm text-white/90 drop-shadow-md font-medium">
                        {postcard.front.cta}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full p-6 text-center">
                    <div className="space-y-2">
                      <div className="bg-red-700 px-3 py-1 inline-block mb-2">
                        <span className="text-white text-xs font-black uppercase tracking-[0.12em]">
                          Just Listed
                        </span>
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-700 uppercase">
                        {postcard.front.headline}
                      </h2>
                      <p className="text-sm font-semibold text-slate-800">
                        {postcard.front.cta}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BACK */}
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Back</p>
            <div
              className="rounded-lg border border-slate-200 bg-white text-slate-900 aspect-auto md:aspect-[3/2] flex flex-col"
              style={{
                boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex flex-1 p-4 gap-3">
                {/* Left: Back text content */}
                <div className="flex-1 flex flex-col">
                  <p className="text-[13px] text-[#333333] whitespace-pre-wrap leading-[1.6] flex-1">
                    {postcard.back}
                  </p>

                  {/* Agent info bar */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                    <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[11px] font-medium text-[#555555]">
                      {agentInfo}
                    </p>
                  </div>
                </div>

                {/* Right: Stamp + address lines */}
                <div className="w-24 flex-shrink-0 flex flex-col items-end">
                  {/* Stamp area */}
                  <div className="border-2 border-dashed border-slate-300 rounded h-14 w-14 flex items-center justify-center">
                    <p className="text-[7px] text-slate-400 uppercase text-center leading-tight px-0.5">
                      PLACE<br />STAMP<br />HERE
                    </p>
                  </div>
                  {/* Address lines */}
                  <div className="mt-auto w-full space-y-1.5 pt-4">
                    <div className="border-t border-slate-300" />
                    <div className="border-t border-slate-300" />
                    <div className="border-t border-slate-300" />
                  </div>
                </div>
              </div>

              {/* Postal indicia */}
              <div className="border-t border-slate-100 py-2 px-4">
                <p className="text-[8px] text-[#999999] uppercase text-center font-mono tracking-wide">
                  PRSRT STD &nbsp;&middot;&nbsp; U.S. POSTAGE PAID &nbsp;&middot;&nbsp; PERMIT NO. 123
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdCardWrapper>
    </div>
  );
}
