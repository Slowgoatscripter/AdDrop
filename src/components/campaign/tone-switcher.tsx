'use client';

import { Button } from '@/components/ui/button';

interface ToneSwitcherProps {
  tones: string[];
  selected: string;
  onSelect: (tone: string) => void;
  label?: string;
}

export function ToneSwitcher({
  tones,
  selected,
  onSelect,
  label = 'Tone',
}: ToneSwitcherProps) {
  return (
    <div role="radiogroup" aria-label="Select tone" className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {tones.map((tone) => (
        <Button
          key={tone}
          size="sm"
          variant="ghost"
          role="radio"
          aria-checked={selected === tone}
          onClick={() => onSelect(tone)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected === tone
              ? 'bg-foreground text-background hover:bg-foreground hover:text-background'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {tone.charAt(0).toUpperCase() + tone.slice(1)}
        </Button>
      ))}
    </div>
  );
}
