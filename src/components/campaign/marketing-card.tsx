'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';

interface MarketingCardProps {
  sellingPoints: string[];
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
}

export function MarketingCard({ sellingPoints, hashtags, callsToAction, targetingNotes }: MarketingCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Selling Points</CardTitle>
          <p className="text-sm text-muted-foreground">Ranked by marketing impact</p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {sellingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="pt-0.5">{point}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Hashtags</CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calls to Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {callsToAction.map((cta, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <p className="text-sm font-medium">{cta}</p>
              <CopyButton text={cta} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Audience &amp; Geo Targeting</CardTitle>
            <CopyButton text={targetingNotes} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {targetingNotes}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
