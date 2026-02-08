'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePicker } from '@/components/ui/image-picker';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { AdTone, PrintAd, PlatformComplianceResult } from '@/lib/types';
import { Copy, Check } from 'lucide-react';

interface PrintAdCardProps {
  title: string;
  content: Record<string, PrintAd>;
  photos: string[];
  subtitle?: string;
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function PrintAdCard({
  title,
  content,
  photos,
  subtitle,
  complianceResult,
  onReplace
}: PrintAdCardProps) {
  const tones = Object.keys(content);
  const [selectedTone, setSelectedTone] = useState(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const ad = content[selectedTone];
  if (!ad) return null;

  const fullText = `${ad.headline}\n\n${ad.body}\n\n${ad.cta}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-amber-400/50">
      {/* Header */}
      <div className="p-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {complianceResult && <ComplianceBadge result={complianceResult} />}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Magazine Mockup */}
      <div className="p-4">
        <div className="bg-white rounded overflow-hidden border shadow-md">
          {/* Hero Image Area */}
          <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[selectedImageIndex]}
                  alt="Print ad hero"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                  <h2 className="text-xl font-bold text-white drop-shadow-lg">
                    {ad.headline}
                  </h2>
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
              <div className="flex items-center justify-center h-full px-6">
                <h2 className="text-xl font-bold text-slate-700 text-center">
                  {ad.headline}
                </h2>
              </div>
            )}
          </div>

          {/* Body Area */}
          <div className="p-6">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ad.body}
            </p>
          </div>

          {/* CTA Bar */}
          <div className="px-6 pb-4">
            <p className="font-semibold text-slate-900 border-l-4 border-amber-400 pl-3">
              {ad.cta}
            </p>
          </div>
        </div>
      </div>

      {/* Controls & Details */}
      <CardContent className="p-4 space-y-3">
        {/* Tone Switcher */}
        {tones.length > 1 && (
          <div className="flex gap-1">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => setSelectedTone(tone)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTone === tone
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Ad Text
            </>
          )}
        </button>

        {/* Violation Details */}
        {complianceResult && complianceResult.violations.length > 0 && onReplace && (
          <ViolationDetails violations={complianceResult.violations} onReplace={onReplace} />
        )}
      </CardContent>
    </Card>
  );
}
