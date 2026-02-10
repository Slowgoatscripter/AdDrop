'use client';

import { Sparkles, Check, AlertTriangle } from 'lucide-react';
import { CampaignQualityResult, QualityCategory } from '@/lib/types/quality';

interface QualityBannerProps {
  result: CampaignQualityResult;
}

const categoryLabels: Record<QualityCategory, string> = {
  'platform-format': 'format fixes',
  'cta-effectiveness': 'CTA improvements',
  'anti-pattern': 'cliches removed',
  'power-avoid-words': 'weak words replaced',
  'formatting': 'formatting fixes',
  'hook-strength': 'hooks strengthened',
  'specificity': 'specificity boosts',
  'feature-to-benefit': 'benefit rewrites',
  'tone-consistency': 'tone adjustments',
  'variation-redundancy': 'variation improvements',
  'platform-optimization': 'platform tweaks',
  'demographic-fit': 'audience adjustments',
  'property-type-fit': 'property type fixes',
  'emotional-triggers': 'emotional enhancements',
};

function buildBreakdown(result: CampaignQualityResult): string | null {
  const counts = new Map<QualityCategory, number>();

  for (const platform of result.platforms) {
    for (const issue of platform.issues) {
      if (issue.fixedText) {
        counts.set(issue.category, (counts.get(issue.category) || 0) + 1);
      }
    }
  }

  if (counts.size === 0) return null;

  const parts: string[] = [];
  for (const [category, count] of counts) {
    const label = categoryLabels[category] || category;
    parts.push(`${count} ${label}`);
  }

  return parts.join(', ');
}

export function QualityBanner({ result }: QualityBannerProps) {
  const hasRequired = result.requiredIssues > 0;
  const hasRecommended = result.recommendedIssues > 0;
  const hasIssues = hasRequired || hasRecommended;

  const totalAds = result.platforms.length;
  const breakdown = buildBreakdown(result);

  // State 1: All passed and improvements were applied
  if (result.allPassed && result.improvementsApplied > 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {result.improvementsApplied} quality improvement{result.improvementsApplied !== 1 ? 's' : ''} applied
              {totalAds > 0 ? ` across ${totalAds} ad${totalAds !== 1 ? 's' : ''}` : ''}
              {result.overallScore != null && (
                <span className="ml-2 text-emerald-700 font-normal">
                  &mdash; Overall Quality: {result.overallScore}/10
                </span>
              )}
            </p>
            {breakdown && (
              <p className="text-xs text-emerald-700">{breakdown}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 2: All passed, no issues
  if (result.allPassed) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
            <Check className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Quality checks passed
              {result.overallScore != null && (
                <span className="ml-2 text-emerald-700 font-normal">
                  &mdash; Overall Quality: {result.overallScore}/10
                </span>
              )}
            </p>
            <p className="text-xs text-emerald-700">
              All {totalAds} ad{totalAds !== 1 ? 's' : ''} meet quality standards
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Has issues
  const bgClass = hasRequired
    ? 'border-red-200 bg-red-50'
    : 'border-amber-200 bg-amber-50';

  const iconBgClass = hasRequired
    ? 'bg-red-100 text-red-600'
    : 'bg-amber-100 text-amber-600';

  const titleColor = hasRequired ? 'text-red-900' : 'text-amber-900';
  const subtitleColor = hasRequired ? 'text-red-700' : 'text-amber-700';

  const parts: string[] = [];
  if (result.requiredIssues > 0) {
    parts.push(`${result.requiredIssues} required fix${result.requiredIssues !== 1 ? 'es' : ''}`);
  }
  if (result.recommendedIssues > 0) {
    parts.push(`${result.recommendedIssues} suggestion${result.recommendedIssues !== 1 ? 's' : ''}`);
  }

  return (
    <div className={`flex items-center justify-between rounded-xl border px-6 py-4 ${bgClass}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${iconBgClass}`}>
          <AlertTriangle className="w-5 h-5" />
        </span>
        <div>
          <p className={`text-sm font-semibold ${titleColor}`}>
            {result.totalPassed}/{result.totalChecks} checks passed &mdash; {parts.join(', ')}
            {result.overallScore != null && (
              <span className="ml-2 font-normal">
                &mdash; Overall Quality: {result.overallScore}/10
              </span>
            )}
          </p>
          <p className={`text-xs ${subtitleColor}`}>
            {hasRequired
              ? 'Some ads have quality issues that should be fixed before publishing'
              : 'Some ads could be improved with the suggested changes'}
          </p>
        </div>
      </div>
    </div>
  );
}
