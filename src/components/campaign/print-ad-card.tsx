'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { PrintAd } from '@/lib/types';

interface PrintAdCardProps {
  title: string;
  content: Record<string, PrintAd>;
  subtitle?: string;
}

export function PrintAdCard({ title, content, subtitle }: PrintAdCardProps) {
  const tones = Object.keys(content);
  const [activeTone, setActiveTone] = useState(tones[0]);
  const ad = content[activeTone];

  if (!ad) return null;

  const fullText = `${ad.headline}\n\n${ad.body}\n\n${ad.cta}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <CopyButton text={fullText} />
        </div>

        {tones.length > 1 && (
          <div className="flex gap-1 mt-2">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => setActiveTone(tone)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTone === tone
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Headline</p>
            <p className="text-lg font-bold">{ad.headline}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Body</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ad.body}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Call to Action</p>
            <p className="text-sm font-semibold text-primary">{ad.cta}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
