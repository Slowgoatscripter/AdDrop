'use client';

import { PLATFORM_CHAR_LIMITS, type CharLimit } from '@/lib/export/platform-dimensions';
import { cn } from '@/lib/utils';

interface CharacterCountProps {
  platformId: string;
  text: string;
  /** Override element name if a platform has multiple limits (e.g. 'headline' vs 'description') */
  element?: string;
}

export function CharacterCount({ platformId, text, element }: CharacterCountProps) {
  const limits = PLATFORM_CHAR_LIMITS[platformId];
  if (!limits || limits.length === 0) return null;

  const relevantLimits = element
    ? limits.filter(l => l.element === element)
    : limits;

  if (relevantLimits.length === 0) return null;

  const count = text.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {relevantLimits.map((limit) => {
        const ratio = count / limit.limit;
        const isOver = count > limit.limit;
        const isWarning = ratio >= 0.9 && !isOver;
        const overBy = count - limit.limit;

        return (
          <div key={limit.element} className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                'text-xs font-mono tabular-nums',
                isOver && 'text-red-500 font-semibold',
                isWarning && 'text-yellow-600',
                !isOver && !isWarning && 'text-muted-foreground',
              )}
            >
              {count.toLocaleString()}/{limit.limit.toLocaleString()}
              {limit.type === 'truncation' && (
                <span className="text-[10px] ml-1 opacity-70">visible</span>
              )}
            </span>
            {isOver && (
              <span className="text-[10px] text-red-500">
                Over by {overBy} char{overBy !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
