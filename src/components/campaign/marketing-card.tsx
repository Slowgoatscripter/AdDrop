'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { PlatformComplianceResult } from '@/lib/types';

interface MarketingCardProps {
  sellingPoints: string[];
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
  complianceResults?: {
    hashtags?: PlatformComplianceResult;
    callsToAction?: PlatformComplianceResult;
    targetingNotes?: PlatformComplianceResult;
    sellingPoints?: PlatformComplianceResult;
  };
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function MarketingCard({ sellingPoints, hashtags, callsToAction, targetingNotes, complianceResults, onReplace }: MarketingCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Top Selling Points</CardTitle>
            {complianceResults?.sellingPoints && <ComplianceBadge result={complianceResults.sellingPoints} />}
          </div>
          <p className="text-sm text-muted-foreground">Ranked by marketing impact</p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {sellingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="pt-0.5">{point}</span>
              </li>
            ))}
          </ol>

          {complianceResults?.sellingPoints && complianceResults.sellingPoints.violations.length > 0 && onReplace && (
            <ViolationDetails violations={complianceResults.sellingPoints.violations} onReplace={onReplace} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Hashtags</CardTitle>
              {complianceResults?.hashtags && <ComplianceBadge result={complianceResults.hashtags} />}
            </div>
            <CopyButton text={hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-sm">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Badge>
            ))}
          </div>

          {complianceResults?.hashtags && complianceResults.hashtags.violations.length > 0 && onReplace && (
            <ViolationDetails violations={complianceResults.hashtags.violations} onReplace={onReplace} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Calls to Action</CardTitle>
            {complianceResults?.callsToAction && <ComplianceBadge result={complianceResults.callsToAction} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {callsToAction.map((cta, i) => (
            <div key={i} className="flex items-center justify-between bg-secondary rounded-lg p-3">
              <p className="text-sm font-medium">{cta}</p>
              <CopyButton text={cta} />
            </div>
          ))}

          {complianceResults?.callsToAction && complianceResults.callsToAction.violations.length > 0 && onReplace && (
            <ViolationDetails violations={complianceResults.callsToAction.violations} onReplace={onReplace} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Audience &amp; Geo Targeting</CardTitle>
              {complianceResults?.targetingNotes && <ComplianceBadge result={complianceResults.targetingNotes} />}
            </div>
            <CopyButton text={targetingNotes} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {targetingNotes}
          </div>

          {complianceResults?.targetingNotes && complianceResults.targetingNotes.violations.length > 0 && onReplace && (
            <ViolationDetails violations={complianceResults.targetingNotes.violations} onReplace={onReplace} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
