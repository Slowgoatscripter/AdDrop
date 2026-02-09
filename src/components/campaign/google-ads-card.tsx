'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { GoogleAd, PlatformComplianceResult } from '@/lib/types';

interface GoogleAdsCardProps {
  ads: GoogleAd[];
  complianceResult?: PlatformComplianceResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function GoogleAdsCard({ ads, complianceResult, onReplace }: GoogleAdsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Google Ads</CardTitle>
          {complianceResult && <ComplianceBadge result={complianceResult} />}
        </div>
        <p className="text-sm text-muted-foreground">3 headline + description combinations</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {ads.map((ad, i) => (
          <div key={i} className="bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Variation {i + 1}</p>
              <CopyButton text={`${ad.headline}\n${ad.description}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-blue-700">{ad.headline}</p>
                <Badge variant={ad.headline.length > 30 ? 'destructive' : 'secondary'} className="text-xs">
                  {ad.headline.length}/30
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">{ad.description}</p>
                <Badge variant={ad.description.length > 90 ? 'destructive' : 'secondary'} className="text-xs flex-shrink-0">
                  {ad.description.length}/90
                </Badge>
              </div>
            </div>
          </div>
        ))}

        {complianceResult && complianceResult.violations.length > 0 && onReplace && (
          <ViolationDetails violations={complianceResult.violations} onReplace={onReplace} />
        )}
      </CardContent>
    </Card>
  );
}
