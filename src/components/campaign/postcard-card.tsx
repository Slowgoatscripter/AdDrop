'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { PrintAd } from '@/lib/types';

interface PostcardCardProps {
  content: Record<string, { front: PrintAd; back: string }>;
}

export function PostcardCard({ content }: PostcardCardProps) {
  const tones = Object.keys(content);
  const [activeTone, setActiveTone] = useState(tones[0]);
  const postcard = content[activeTone];

  if (!postcard) return null;

  const fullText = `FRONT:\n${postcard.front.headline}\n${postcard.front.body}\n${postcard.front.cta}\n\nBACK:\n${postcard.back}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Postcard / Flyer</CardTitle>
            <p className="text-sm text-muted-foreground">Front headline + back details for mailers</p>
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

      <CardContent className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">Front</p>
          <p className="text-lg font-bold">{postcard.front.headline}</p>
          <p className="text-sm">{postcard.front.body}</p>
          <p className="text-sm font-semibold text-primary">{postcard.front.cta}</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">Back</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{postcard.back}</p>
        </div>
      </CardContent>
    </Card>
  );
}
