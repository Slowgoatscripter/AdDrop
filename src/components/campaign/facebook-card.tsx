'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePicker } from '@/components/ui/image-picker';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { PlatformComplianceResult } from '@/lib/types';
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Copy,
  Check,
  ImageIcon
} from 'lucide-react';

interface FacebookCardProps {
  content: Record<string, string>;
  photos: string[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

const tones = ['professional', 'friendly', 'luxury', 'urgent'] as const;
const toneLabels: Record<string, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  luxury: 'Luxury',
  urgent: 'Urgent',
};

export function FacebookCard({
  content,
  photos,
  complianceResult,
  onReplace
}: FacebookCardProps) {
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentContent = content[selectedTone] || '';
  const currentImage = photos[selectedImageIndex];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-blue-400/50">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Facebook</h3>
          {complianceResult && (
            <ComplianceBadge result={complianceResult} />
          )}
        </div>

        {/* Facebook Mockup */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
          {/* FB Post Header */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">f</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Your Brand</div>
              <div className="text-xs text-slate-400">Just now · 🌐</div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
          </div>

          {/* Post Text */}
          <div className="px-4 pb-3">
            <p className="text-sm whitespace-pre-wrap">{currentContent}</p>
          </div>

          {/* Image Area */}
          <div className="relative aspect-[1.91/1] overflow-hidden bg-slate-100">
            {currentImage ? (
              <img
                src={currentImage}
                alt="Post image"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <ImageIcon className="w-16 h-16" />
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

          {/* Engagement Row */}
          <div className="px-4 py-1.5 flex justify-between text-xs text-slate-500 border-b border-slate-200">
            <span>👍😍 24</span>
            <span>5 Comments · 2 Shares</span>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-1 flex justify-around border-b border-slate-200">
            <button className="flex items-center gap-1.5 text-sm text-slate-500 py-1.5 hover:bg-slate-50 px-3 rounded">
              <ThumbsUp className="w-4 h-4" />
              <span>Like</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-slate-500 py-1.5 hover:bg-slate-50 px-3 rounded">
              <MessageCircle className="w-4 h-4" />
              <span>Comment</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-slate-500 py-1.5 hover:bg-slate-50 px-3 rounded">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Tone Switcher */}
        <div className="flex flex-wrap gap-2 mb-3">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => setSelectedTone(tone)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedTone === tone
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {toneLabels[tone]}
            </button>
          ))}
        </div>

        {/* Character Count & Copy */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentContent.length} characters
          </Badge>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Violation Details */}
        {complianceResult && complianceResult.violations.length > 0 && onReplace && (
          <div className="mt-4">
            <ViolationDetails
              violations={complianceResult.violations}
              onReplace={onReplace}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
