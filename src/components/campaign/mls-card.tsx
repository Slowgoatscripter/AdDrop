'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { ComplianceBadge } from './compliance-badge';
import { ViolationDetails } from './violation-details';
import { PlatformComplianceResult } from '@/lib/types';
import type { PlatformQualityResult } from '@/lib/types/quality';

interface MlsCardProps {
  description: string;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

export function MlsCard({ description, complianceResult, onReplace }: MlsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">MLS Description</CardTitle>
              {complianceResult && <ComplianceBadge result={complianceResult} />}
            </div>
            <p className="text-sm text-muted-foreground">Montana MLS compliance checks enabled</p>
          </div>
          <CopyButton text={description} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {description}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{description.length} chars</Badge>
        </div>

        {complianceResult && complianceResult.violations.length > 0 && onReplace && (
          <ViolationDetails violations={complianceResult.violations} onReplace={onReplace} />
        )}
      </CardContent>
    </Card>
  );
}
