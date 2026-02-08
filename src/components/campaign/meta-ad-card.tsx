'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { MetaAd } from '@/lib/types';

interface MetaAdCardProps {
  ad: MetaAd;
}

export function MetaAdCard({ ad }: MetaAdCardProps) {
  const fullText = `Primary: ${ad.primaryText}\nHeadline: ${ad.headline}\nDescription: ${ad.description}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Meta / Facebook Ad</CardTitle>
            <p className="text-sm text-muted-foreground">Paid ad format with all required fields</p>
          </div>
          <CopyButton text={fullText} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Primary Text</p>
              <Badge variant="secondary" className="text-xs">{ad.primaryText.length} chars</Badge>
            </div>
            <p className="text-sm">{ad.primaryText}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Headline</p>
              <Badge variant={ad.headline.length > 40 ? 'destructive' : 'secondary'} className="text-xs">
                {ad.headline.length}/40
              </Badge>
            </div>
            <p className="text-sm font-semibold">{ad.headline}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Description</p>
              <Badge variant={ad.description.length > 30 ? 'destructive' : 'secondary'} className="text-xs">
                {ad.description.length}/30
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{ad.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
