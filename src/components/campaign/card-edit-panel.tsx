'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { EditableText } from './editable-text';
import { ComplianceBadge } from './compliance-badge';
import { QualityBadge } from './quality-badge';
import { PlatformComplianceResult } from '@/lib/types';
import { PlatformQualityResult } from '@/lib/types/quality';

interface CardEditPanelProps {
  platform: string;
  platformIcon: ReactNode;
  content: string;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  platformId: string;
  fieldName: string;
  complianceResult?: PlatformComplianceResult;
  qualityResult?: PlatformQualityResult;
  maxLength?: number;
  children?: ReactNode;
}

export function CardEditPanel({
  platform,
  platformIcon,
  content,
  onEditText,
  platformId,
  fieldName,
  complianceResult,
  qualityResult,
  maxLength,
  children,
}: CardEditPanelProps) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {platformIcon}
        <h3 className="font-semibold text-lg">{platform}</h3>
        {complianceResult && <ComplianceBadge result={complianceResult} />}
        {qualityResult && <QualityBadge result={qualityResult} />}
      </div>

      {/* Content area - wide and comfortable */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          Ad Copy
        </label>
        {onEditText ? (
          <EditableText
            value={content}
            onChange={() => {}}
            onSave={(val) => onEditText(platformId, fieldName, val)}
            maxLength={maxLength}
          />
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>

      {/* Additional fields */}
      {children}

      {/* Character count */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Badge variant="secondary" className="text-xs">
          {content.length}{maxLength ? ` / ${maxLength}` : ''} characters
        </Badge>
      </div>
    </div>
  );
}
