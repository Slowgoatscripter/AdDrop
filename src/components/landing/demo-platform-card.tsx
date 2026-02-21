'use client';

import { motion } from 'framer-motion';
import { Camera, ThumbsUp, Target, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoPlatformCardProps {
  platform: 'instagram' | 'facebook' | 'googleAds';
  content: string;
  hashtags?: string[];
  compliance: { passed: boolean; fixCount: number };
  qualityScore?: number;
  index?: number;
}

const PLATFORM_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  instagram: { label: 'Instagram', icon: Camera, color: 'text-pink-400' },
  facebook: { label: 'Facebook', icon: ThumbsUp, color: 'text-blue-400' },
  googleAds: { label: 'Google Ads', icon: Target, color: 'text-yellow-400' },
};

function parseGoogleAdsContent(content: string): { headline: string; description: string } | null {
  // Try to parse "Headline: ... Description: ..." format
  const headlineMatch = content.match(/headline[:\s]+(.+?)(?:\n|description|$)/i);
  const descriptionMatch = content.match(/description[:\s]+([\s\S]+?)$/i);

  if (headlineMatch && descriptionMatch) {
    return {
      headline: headlineMatch[1].trim(),
      description: descriptionMatch[1].trim(),
    };
  }

  // Fallback: split at first period or newline
  const parts = content.split(/\n/);
  if (parts.length >= 2) {
    return { headline: parts[0].trim(), description: parts.slice(1).join(' ').trim() };
  }

  return null;
}

export function DemoPlatformCard({
  platform,
  content,
  hashtags,
  compliance,
  qualityScore,
  index = 0,
}: DemoPlatformCardProps) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  const isGoogleAds = platform === 'googleAds';
  const googleAdParsed = isGoogleAds ? parseGoogleAdsContent(content) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12 }}
      className="bg-surface border border-gold/10 rounded-xl p-5 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className={cn('w-5 h-5', meta.color)} />
        <span className="font-serif text-cream font-medium">{meta.label}</span>
      </div>

      {/* Body */}
      <div className="flex-1">
        {isGoogleAds && googleAdParsed ? (
          <div className="space-y-1">
            <p className="text-cream/90 text-sm font-semibold leading-snug">
              {googleAdParsed.headline}
            </p>
            <p className="text-cream/80 text-sm leading-relaxed">
              {googleAdParsed.description}
            </p>
          </div>
        ) : (
          <p className="text-cream/90 text-sm leading-relaxed">{content}</p>
        )}
      </div>

      {/* Hashtags */}
      {hashtags && hashtags.length > 0 && (
        <p className="text-gold/70 text-xs">
          {hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gold/10">
        {compliance.passed ? (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
            Compliant ✓
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
            {compliance.fixCount} fix{compliance.fixCount !== 1 ? 'es' : ''} applied
          </span>
        )}
        {qualityScore !== undefined && (
          <span className="inline-flex items-center gap-1 bg-gold/10 text-gold text-xs px-2 py-0.5 rounded-full">
            Quality {qualityScore}/10
          </span>
        )}
      </div>
    </motion.div>
  );
}
