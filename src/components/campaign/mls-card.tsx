'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { ComplianceCheckItem } from '@/lib/types';

interface MlsCardProps {
  description: string;
  checklist: ComplianceCheckItem[];
}

export function MlsCard({ description, checklist }: MlsCardProps) {
  const passCount = checklist.filter((c) => c.passed).length;
  const allPassed = passCount === checklist.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">MLS Description</CardTitle>
            <p className="text-sm text-muted-foreground">Montana MLS Compliant</p>
          </div>
          <CopyButton text={description} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {description}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{description.length} chars</Badge>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">Compliance Checklist</h3>
            <Badge variant={allPassed ? 'secondary' : 'destructive'} className="text-xs">
              {passCount}/{checklist.length} passed
            </Badge>
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={item.passed ? 'text-green-600' : 'text-red-500'}>
                  {item.passed ? '\u2713' : '\u2717'}
                </span>
                <div>
                  <p className={item.passed ? 'text-slate-600' : 'text-red-700 font-medium'}>{item.rule}</p>
                  {item.detail && <p className="text-xs text-red-500 mt-0.5">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
