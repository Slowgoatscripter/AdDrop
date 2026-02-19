'use client';

import { useState } from 'react';
import { Check, AlertTriangle, ShieldAlert, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import type { ComplianceAgentResult } from '@/lib/types/compliance';

interface ComplianceBannerProps {
  result: ComplianceAgentResult;
}

function AutoFixSummary({ result }: { result: ComplianceAgentResult }) {
  const [expanded, setExpanded] = useState(false);

  if (result.totalAutoFixes === 0) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
            <Wrench className="w-5 h-5" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-blue-900">
              {result.totalAutoFixes} compliance rewrite{result.totalAutoFixes !== 1 ? 's' : ''} applied
            </p>
            <p className="text-xs text-blue-700">Click to review what was changed</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-blue-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-blue-600" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {result.autoFixes.map((fix, idx) => (
            <div key={idx} className="rounded-lg border border-blue-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                  {fix.category.replace(/-/g, ' ')}
                </span>
                <span className="text-xs text-blue-600">{fix.platform}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Before</p>
                  <p className="text-sm text-red-700 line-through bg-red-50 rounded px-2 py-1">
                    {fix.before}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">After</p>
                  <p className="text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                    {fix.after}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComplianceBanner({ result }: ComplianceBannerProps) {
  const hardCount = result.violations.filter(v => v.severity === 'hard').length;
  const softCount = result.violations.filter(v => v.severity === 'soft').length;
  const hasHard = hardCount > 0;
  const allClean = result.campaignVerdict === 'compliant';

  // Phase 2 rewrite failed — show a warning to manually review
  if (result.complianceRewriteApplied === false) {
    return (
      <div className="space-y-3">
        <div className="flex items-center rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Compliance review could not be completed
              </p>
              <p className="text-xs text-amber-700">
                This campaign should be manually reviewed before use.
              </p>
            </div>
          </div>
        </div>
        <AutoFixSummary result={result} />
      </div>
    );
  }

  if (allClean) {
    return (
      <div className="space-y-3">
        <div className="flex items-center rounded-xl border border-green-200 bg-green-50 px-6 py-4">
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
        <AutoFixSummary result={result} />
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
    <div className="space-y-3">
      <div className={`flex items-center rounded-xl border px-6 py-4 ${bgClass}`}>
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
      </div>
      <AutoFixSummary result={result} />
    </div>
  );
}
