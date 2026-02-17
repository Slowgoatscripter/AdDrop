'use client';

import { Sparkles, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

    const label = `Quality score: ${score}/10`;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge aria-label={label} className={`text-xs px-1.5 py-0.5 gap-1 ${colorClass}`}>
              <Sparkles aria-hidden="true" className="w-3 h-3" />
              {score}/10
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (result.passed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label="Quality passed"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600"
            >
              <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Quality passed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const requiredCount = result.issues.filter((i) => i.priority === 'required').length;
  const recommendedCount = result.issues.filter((i) => i.priority === 'recommended').length;

  if (requiredCount > 0) {
    const total = requiredCount + recommendedCount;
    const label = `${total} quality ${total === 1 ? 'issue' : 'issues'} (${requiredCount} required)`;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge aria-label={label} variant="destructive" className="text-xs px-1.5 py-0.5">
              {total}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const label = `${recommendedCount} quality ${recommendedCount === 1 ? 'suggestion' : 'suggestions'}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            aria-label={label}
            className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
          >
            {recommendedCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
