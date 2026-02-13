'use client';

interface ToneSwitcherProps {
  tones: string[];
  selected: string;
  onSelect: (tone: string) => void;
  label?: string;
}

/**
 * Horizontal toggle for switching between ad tone variations
 * (e.g., professional, casual, luxury).
 */
export function ToneSwitcher({ tones, selected, onSelect, label }: ToneSwitcherProps) {
  if (tones.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-muted-foreground font-medium">{label}:</span>
      )}
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
        {tones.map((tone) => (
          <button
            key={tone}
            onClick={() => onSelect(tone)}
            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
              selected === tone
                ? 'bg-gold text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tone}
          </button>
        ))}
      </div>
    </div>
  );
}
