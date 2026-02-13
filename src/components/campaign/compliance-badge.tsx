'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PlatformComplianceResult } from '@/lib/types';

interface ComplianceBadgeProps {
  result: PlatformComplianceResult;
}

export function ComplianceBadge({ result }: ComplianceBadgeProps) {
  if (result.passed) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
        <Check className="w-3.5 h-3.5" />
      </span>
    );
  }

  if (result.hardCount > 0) {
    return (
      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
        {result.hardCount + result.softCount}
      </Badge>
    );
  }

  // Soft warnings only
  return (
    <Badge className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
      {result.softCount}
    </Badge>
  );
}
