'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePicker } from '@/components/ui/image-picker';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { MetaAd, PlatformComplianceResult } from '@/lib/types';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MetaAdCardProps {
  ad: MetaAd;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function MetaAdCard({ ad, photos, complianceResult, onReplace }: MetaAdCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const fullText = `Primary: ${ad.primaryText}\nHeadline: ${ad.headline}\nDescription: ${ad.description}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-blue-500/50">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Meta Ad</h3>
            {complianceResult && <ComplianceBadge result={complianceResult} />}
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4 overflow-visible">
        {/* Facebook Ad Mockup */}
        <div className="bg-white rounded border">
          {/* Sponsored Label */}
          <div className="px-4 pt-3">
            <p className="text-xs text-slate-400">Sponsored</p>
          </div>

          {/* Primary Text */}
          <div className="px-4 py-2">
            <p className="text-sm">{ad.primaryText}</p>
          </div>

          {/* Image Area */}
          <div className="relative aspect-[1.91/1] overflow-hidden bg-slate-100">
            {photos.length > 0 && (
              <img
                src={photos[selectedImageIndex]}
                alt="Ad creative"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-2 right-2">
              <ImagePicker
                images={photos}
                selectedIndex={selectedImageIndex}
                onSelect={setSelectedImageIndex}
              />
            </div>
          </div>

          {/* Below Image Bar */}
          <div className="bg-slate-50 px-4 py-3 flex justify-between items-center">
            <div className="flex-1">
              <p className="font-semibold text-sm">{ad.headline}</p>
              <p className="text-xs text-slate-500">{ad.description}</p>
            </div>
            <button className="text-blue-600 text-sm font-semibold border border-blue-600 rounded px-3 py-1 hover:bg-blue-50 transition-colors">
              Learn More
            </button>
          </div>
        </div>

        {/* Character Counts */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ad.headline.length > 40 ? 'destructive' : 'secondary'} className="text-xs">
            Headline: {ad.headline.length}/40
          </Badge>
          <Badge variant={ad.description.length > 30 ? 'destructive' : 'secondary'} className="text-xs">
            Description: {ad.description.length}/30
          </Badge>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors w-full justify-center"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Ad Text</span>
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
