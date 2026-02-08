'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImagePicker } from '@/components/ui/image-picker';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { AdTone, PlatformComplianceResult } from '@/lib/types';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Copy,
  Check,
  ImageIcon,
} from 'lucide-react';

interface InstagramCardProps {
  content: Record<string, string>;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function InstagramCard({
  content,
  photos,
  complianceResult,
  onReplace,
}: InstagramCardProps) {
  const tones = Object.keys(content) as AdTone[];
  const [selectedTone, setSelectedTone] = useState<AdTone>(tones[0]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentCaption = content[selectedTone] || '';
  const characterCount = currentCaption.length;
  const isOverLimit = characterCount > 2200;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateCaption = (text: string, limit: number) => {
    if (text.length <= limit) return text;
    return (
      <>
        {text.slice(0, limit)}
        <span className="text-slate-400">... more</span>
      </>
    );
  };

  return (
    <Card className="border-l-4 border-pink-400/50">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Instagram</h3>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
          </div>
          {complianceResult && (
            <ComplianceBadge result={complianceResult} />
          )}
        </div>

        {/* Phone mockup */}
        <div className="mx-4 mb-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* IG Header bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="font-semibold text-sm">yourbrand</span>
            </div>
            <MoreHorizontal className="h-5 w-5 text-slate-400" />
          </div>

          {/* Image area */}
          <div className="relative aspect-square overflow-hidden bg-slate-100">
            {photos.length > 0 ? (
              <img
                src={photos[selectedImageIndex]}
                alt="Instagram post"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <ImageIcon className="h-16 w-16 text-slate-300" />
              </div>
            )}
            {photos.length > 0 && (
              <div className="absolute bottom-2 right-2">
                <ImagePicker
                  images={photos}
                  selectedIndex={selectedImageIndex}
                  onSelect={setSelectedImageIndex}
                />
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-slate-700" />
              <MessageCircle className="h-6 w-6 text-slate-700" />
              <Send className="h-6 w-6 text-slate-700" />
            </div>
            <Bookmark className="h-6 w-6 text-slate-700" />
          </div>

          {/* Likes */}
          <div className="px-3">
            <p className="text-sm font-semibold">142 likes</p>
          </div>

          {/* Caption */}
          <div className="px-3 pb-3 pt-1">
            <p className="text-sm">
              <span className="font-semibold">yourbrand</span>{' '}
              <span className="text-slate-700">
                {truncateCaption(currentCaption, 125)}
              </span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 pt-0 space-y-3">
          {/* Tone switcher */}
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <Button
                key={tone}
                size="sm"
                variant="ghost"
                onClick={() => setSelectedTone(tone)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTone === tone
                    ? 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </Button>
            ))}
          </div>

          {/* Character count and copy */}
          <div className="flex items-center justify-between gap-2">
            <Badge variant={isOverLimit ? 'destructive' : 'secondary'}>
              {characterCount} / 2200 characters
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Violation details */}
          {complianceResult && complianceResult.violations.length > 0 && onReplace && (
              <ViolationDetails
                violations={complianceResult.violations}
                onReplace={onReplace}
              />
            )}
        </div>
      </CardContent>
    </Card>
  );
}
