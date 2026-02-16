'use client';

import { Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComplianceAgentResult } from '@/lib/types/compliance';

interface ComplianceBannerProps {
  result: ComplianceAgentResult;
  onFixAll: () => void | Promise<void>;
  isFixing?: boolean;
}

export function ComplianceBanner({ result, onFixAll, isFixing }: ComplianceBannerProps) {
  const hardCount = result.violations.filter(v => v.severity === 'hard').length;
  const softCount = result.violations.filter(v => v.severity === 'soft').length;
  const hasHard = hardCount > 0;
  const hasSoft = softCount > 0;
  const allClean = result.campaignVerdict === 'compliant';

  if (allClean) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
            <Check className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-green-900">
              All checks passed
            </p>
            <p className="text-xs text-green-700">No issues flagged by current fair housing checks</p>
          </div>
        </div>
      </div>
    );
  }

  const bgClass = hasHard
    ? 'border-red-200 bg-red-50'
    : 'border-amber-200 bg-amber-50';

  const iconBgClass = hasHard
    ? 'bg-red-100 text-red-600'
    : 'bg-amber-100 text-amber-600';

  const titleColor = hasHard ? 'text-red-900' : 'text-amber-900';
  const subtitleColor = hasHard ? 'text-red-700' : 'text-amber-700';

  const Icon = hasHard ? ShieldAlert : AlertTriangle;

  const parts: string[] = [];
  if (hardCount > 0) {
    parts.push(`${hardCount} violation${hardCount !== 1 ? 's' : ''}`);
  }
  if (softCount > 0) {
    parts.push(`${softCount} warning${softCount !== 1 ? 's' : ''}`);
  }

  return (
    <div className={`flex items-center justify-between rounded-xl border px-6 py-4 ${bgClass}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${iconBgClass}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <p className={`text-sm font-semibold ${titleColor}`}>
            {result.totalViolations} issue{result.totalViolations !== 1 ? 's' : ''} found &mdash; {parts.join(', ')}
          </p>
          <p className={`text-xs ${subtitleColor}`}>
            {hasHard
              ? 'Some platforms contain terms that may violate fair housing laws'
              : 'Some platforms contain language flagged by industry guidelines'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={hasHard ? 'destructive' : 'outline'}
        onClick={onFixAll}
        disabled={isFixing}
      >
        {isFixing ? 'Fixing...' : 'Fix All'}
      </Button>
    </div>
  );
}
