'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePicker } from '@/components/ui/image-picker';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { PrintAd, PlatformComplianceResult } from '@/lib/types';
import { Copy, Check, Mail } from 'lucide-react';

interface PostcardCardProps {
  content: Record<string, { front: PrintAd; back: string }>;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function PostcardCard({ content, photos, complianceResult, onReplace }: PostcardCardProps) {
  const tones = Object.keys(content);
  const [selectedTone, setSelectedTone] = useState(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const postcard = content[selectedTone];

  if (!postcard) return null;

  const fullText = `FRONT:\n${postcard.front.headline}\n${postcard.front.body}\n${postcard.front.cta}\n\nBACK:\n${postcard.back}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-emerald-400/50">
      {/* Header */}
      <CardContent className="p-4 overflow-visible">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold">Postcard</h3>
            {complianceResult && <ComplianceBadge result={complianceResult} />}
          </div>
        </div>

        {/* Front Mockup */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Front</p>
          <div className="relative rounded-lg overflow-hidden border shadow-sm aspect-[3/2] bg-slate-100">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[selectedImageIndex]}
                  alt="Postcard front"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
                  <h2 className="text-lg font-bold text-white drop-shadow-md">
                    {postcard.front.headline}
                  </h2>
                  <p className="text-sm text-white/90 drop-shadow-md">
                    {postcard.front.cta}
                  </p>
                </div>
                <div className="absolute top-3 right-3">
                  <ImagePicker
                    images={photos}
                    selectedIndex={selectedImageIndex}
                    onSelect={setSelectedImageIndex}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full p-6 text-center">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-slate-700">
                    {postcard.front.headline}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {postcard.front.body}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {postcard.front.cta}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="my-4" />

        {/* Back Mockup */}
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Back</p>
          <div className="rounded-lg border p-4 bg-white shadow-sm">
            <div className="flex gap-4">
              {/* Left: Back text content */}
              <div className="flex-1">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {postcard.back}
                </p>
              </div>

              {/* Right: Stamp area */}
              <div className="w-24 flex-shrink-0">
                <div className="border-2 border-dashed border-slate-300 rounded h-16 w-16 ml-auto flex items-center justify-center">
                  <p className="text-[8px] text-slate-300 uppercase text-center leading-tight px-1">
                    PLACE<br />STAMP<br />HERE
                  </p>
                </div>
                <div className="border-t border-slate-200 mt-3" />
                <div className="border-t border-slate-200 mt-2" />
                <div className="border-t border-slate-200 mt-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Tone Switcher and Copy Button */}
        <div className="mt-4 flex items-center justify-between">
          {tones.length > 1 && (
            <div className="flex gap-1">
              {tones.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTone === tone
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Violation Details */}
        {complianceResult && complianceResult.violations.length > 0 && onReplace && (
          <div className="mt-4">
            <ViolationDetails violations={complianceResult.violations} onReplace={onReplace} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
