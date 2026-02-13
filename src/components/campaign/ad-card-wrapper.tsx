'use client';

import { ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ComplianceBadge } from './compliance-badge';
import { QualityBadge } from './quality-badge';
import { ViolationDetails } from './violation-details';
import type { PlatformComplianceResult, ComplianceViolation } from '@/lib/types';
import type { PlatformQualityResult } from '@/lib/types/quality';

interface AdCardWrapperProps {
  platform: string;
  platformIcon: ReactNode;
  dimensionLabel: string;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  copyText: string;
  violations?: ComplianceViolation[];
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  toneSwitcher?: ReactNode;
  children: ReactNode;
}

/**
 * Wrapper for ad preview cards. Provides a consistent frame with platform icon,
 * dimension label, compliance/quality badges, copy button, and violation details.
 */
export function AdCardWrapper({
  platform,
  platformIcon,
  dimensionLabel,
  complianceResult,
  qualityResult,
  copyText,
  violations,
  onReplace,
  toneSwitcher,
  children,
}: AdCardWrapperProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = copyText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {platformIcon}
          <span className="text-sm font-semibold text-foreground">{platform}</span>
          <span className="text-xs text-muted-foreground">{dimensionLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {complianceResult && <ComplianceBadge result={complianceResult} />}
          {qualityResult && <QualityBadge result={qualityResult} />}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Copy ad text"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Tone switcher */}
      {toneSwitcher && (
        <div className="px-4 py-3 border-b border-border bg-muted/10">
          {toneSwitcher}
        </div>
      )}

      {/* Ad preview content */}
      <div className="border-b border-border">
        {children}
      </div>

      {/* Violation details (if any) */}
      {violations && violations.length > 0 && onReplace && (
        <div className="px-4 py-3">
          <ViolationDetails
            violations={violations}
            onReplace={onReplace}
          />
        </div>
      )}
    </div>
  );
}
