'use client';

import { Sparkles, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PlatformQualityResult } from '@/lib/types/quality';

interface QualityBadgeProps {
  result: PlatformQualityResult;
  score?: number;
}

export function QualityBadge({ result, score }: QualityBadgeProps) {
  if (result.passed && score != null) {
    const colorClass =
      score >= 8
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        : score >= 6
          ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100'
          : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';

    return (
      <Badge className={`text-xs px-1.5 py-0.5 gap-1 ${colorClass}`}>
        <Sparkles className="w-3 h-3" />
        {score}/10
      </Badge>
    );
  }

  if (result.passed) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
        <Sparkles className="w-3.5 h-3.5" />
      </span>
    );
  }

  const requiredCount = result.issues.filter((i) => i.priority === 'required').length;
  const recommendedCount = result.issues.filter((i) => i.priority === 'recommended').length;

  if (requiredCount > 0) {
    return (
      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
        {requiredCount + recommendedCount}
      </Badge>
    );
  }

  return (
    <Badge className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
      {recommendedCount}
    </Badge>
  );
}
