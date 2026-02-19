'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { AdTone, PlatformComplianceResult } from '@/lib/types';
import type { PlatformQualityResult, QualityIssue } from '@/lib/types/quality';

interface AdCardProps {
  title: string;
  content: Record<string, string> | string;
  tones?: AdTone[];
  characterLimit?: number;
  subtitle?: string;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
}

export function AdCard({ title, content, tones, characterLimit, subtitle, complianceResult, onReplace }: AdCardProps) {
  const [activeTone, setActiveTone] = useState<string>(tones?.[0] || 'default');

  const text = typeof content === 'string' ? content : content[activeTone] || '';
  const charCount = text.length;
  const isOverLimit = characterLimit ? charCount > characterLimit : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              {complianceResult && <ComplianceBadge result={complianceResult} />}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <CopyButton text={text} />
        </div>

        {tones && tones.length > 1 && (
          <div className="flex gap-1 mt-2">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => setActiveTone(tone)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTone === tone
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="bg-secondary rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>

        <div className="flex justify-end mt-2">
          <Badge variant={isOverLimit ? 'destructive' : 'secondary'} className="text-xs">
            {charCount}{characterLimit ? ` / ${characterLimit}` : ''} chars
          </Badge>
        </div>

        {complianceResult && complianceResult.violations.length > 0 && onReplace && (
          <ViolationDetails violations={complianceResult.violations} onReplace={onReplace} />
        )}
      </CardContent>
    </Card>
  );
}
