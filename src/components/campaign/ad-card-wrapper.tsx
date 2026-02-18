'use client';

import { ReactNode, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { ComplianceBadge } from './compliance-badge';
import { QualityBadge } from './quality-badge';
import { ViolationDetails } from './violation-details';
import { QualityDetails } from './quality-details';
import { CharacterCount } from './character-count';
import { PlatformComplianceResult, ComplianceViolation } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';
import type { QualityIssue } from '@/lib/types/quality';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

interface AdCardWrapperProps {
  platform: string;
  platformIcon: ReactNode;
  dimensionLabel: string;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  toneSwitcher?: ReactNode;
  copyText?: string;
  children: ReactNode;
  violations?: ComplianceViolation[];
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onRegenerate?: (tone: string) => void;
  toneOptions?: string[];
  isRegenerating?: boolean;
  platformId?: string;
  charCountText?: string;
  charCountElement?: string;
  photoUrl?: string;
  photoPlatform?: string;
}

export function AdCardWrapper({
  platform,
  platformIcon,
  dimensionLabel,
  complianceResult,
  qualityResult,
  toneSwitcher,
  copyText,
  children,
  violations,
  onReplace,
  onRevert,
  onRegenerate,
  toneOptions,
  isRegenerating,
  platformId,
  charCountText,
  charCountElement,
  photoUrl,
  photoPlatform,
}: AdCardWrapperProps) {
  const [showToneSelector, setShowToneSelector] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);

  async function handleDownloadPhoto() {
    if (!photoUrl || !photoPlatform) return;
    setDownloadingPhoto(true);
    try {
      const res = await fetch('/api/export/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, platform: photoPlatform }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || `${photoPlatform}-photo.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Photo download failed');
    } finally {
      setDownloadingPhoto(false);
    }
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0">{platformIcon}</span>
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-sm">{platform}</h3>
            <span className="text-xs text-muted-foreground">{dimensionLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {complianceResult && <ComplianceBadge result={complianceResult} />}
          {qualityResult && <QualityBadge result={qualityResult} />}
          {onRegenerate && (
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => setShowToneSelector((prev) => !prev)}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              {showToneSelector && toneOptions && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-popover border rounded-md shadow-md py-1 min-w-[140px]">
                  {toneOptions.map((tone) => (
                    <button
                      key={tone}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        onRegenerate?.(tone);
                        setShowToneSelector(false);
                      }}
                    >
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mockup area — the star of the show */}
      <div className="p-4">
        {children}
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 space-y-3">
        {/* Tone switcher slot */}
        {toneSwitcher && (
          <div className="pt-1">{toneSwitcher}</div>
        )}

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Copy + char count row */}
        <div className="flex items-center justify-between gap-2">
          {copyText ? (
            <CopyButton text={copyText} label="Copy Ad Text" />
          ) : (
            <div />
          )}
          {platformId && charCountText && (
            <CharacterCount
              platformId={platformId}
              text={charCountText}
              element={charCountElement}
            />
          )}
          {photoUrl && photoPlatform && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              disabled={downloadingPhoto}
              onClick={handleDownloadPhoto}
            >
              <Download className="h-3.5 w-3.5" />
              {downloadingPhoto ? 'Downloading...' : 'Download Photo'}
            </Button>
          )}
        </div>

        {/* Violation details */}
        {violations && violations.length > 0 && onReplace && (
          <ViolationDetails violations={violations} onReplace={onReplace} />
        )}

        {/* Quality details */}
        {qualityResult && qualityResult.issues.length > 0 && (
          <QualityDetails issues={qualityResult.issues} onRevert={onRevert} />
        )}
      </div>
    </div>
  );
}
