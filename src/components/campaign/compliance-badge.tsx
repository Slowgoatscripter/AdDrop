'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlatformComplianceResult } from '@/lib/types';

interface ComplianceBadgeProps {
  result: PlatformComplianceResult;
}

export function ComplianceBadge({ result }: ComplianceBadgeProps) {
  if (result.passed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label="Compliance passed"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Compliance passed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (result.hardCount > 0) {
    const total = result.hardCount + result.softCount;
    const label = `${total} compliance ${total === 1 ? 'issue' : 'issues'} (${result.hardCount} hard)`;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              aria-label={label}
              variant="destructive"
              className="text-xs px-1.5 py-0.5"
            >
              {total}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Soft warnings only
  const label = `${result.softCount} compliance ${result.softCount === 1 ? 'warning' : 'warnings'}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            aria-label={label}
            className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
          >
            {result.softCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
