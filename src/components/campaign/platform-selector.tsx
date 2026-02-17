'use client';

import React, { useCallback, useMemo } from 'react';
import {
  PlatformId,
  PlatformOption,
  PlatformPreset,
  PlatformCategory,
  ALL_PLATFORMS,
} from '@/lib/types/campaign';
import {
  Instagram,
  Facebook,
  Twitter,
  Search as GoogleIcon,
  Layers,
  BookOpen,
  BookMarked,
  Mail,
  Globe,
  Building2,
  Home,
  FileText,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Platform metadata ---

const PLATFORM_OPTIONS: PlatformOption[] = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram', detail: '3 tones', category: 'social' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', detail: '3 tones', category: 'social' },
  { id: 'twitter', label: 'Twitter / X', icon: 'twitter', detail: '280 chars', category: 'social' },
  { id: 'googleAds', label: 'Google Ads', icon: 'googleAds', detail: 'Search ads', category: 'paid' },
  { id: 'metaAd', label: 'Meta Ad', icon: 'metaAd', detail: 'FB/IG ad', category: 'paid' },
  { id: 'magazineFullPage', label: 'Magazine Full', icon: 'magazineFullPage', detail: 'Full page', category: 'print' },
  { id: 'magazineHalfPage', label: 'Magazine Half', icon: 'magazineHalfPage', detail: 'Half page', category: 'print' },
  { id: 'postcard', label: 'Postcard', icon: 'postcard', detail: 'Front + back', category: 'print' },
  { id: 'zillow', label: 'Zillow', icon: 'zillow', detail: 'Listing desc', category: 'listings' },
  { id: 'realtorCom', label: 'Realtor.com', icon: 'realtorCom', detail: 'Listing desc', category: 'listings' },
  { id: 'homesComTrulia', label: 'Homes / Trulia', icon: 'homesComTrulia', detail: 'Listing desc', category: 'listings' },
  { id: 'mlsDescription', label: 'MLS Description', icon: 'mlsDescription', detail: 'Compliant', category: 'mls' },
];

const PRESETS: PlatformPreset[] = [
  { id: 'all', label: 'All Platforms', platforms: [...ALL_PLATFORMS] },
  { id: 'social', label: 'Social Media', platforms: ['instagram', 'facebook', 'twitter'] },
  { id: 'listings', label: 'Listing Sites', platforms: ['zillow', 'realtorCom', 'homesComTrulia', 'mlsDescription'] },
  { id: 'print', label: 'Print Pack', platforms: ['magazineFullPage', 'magazineHalfPage', 'postcard'] },
  { id: 'paid', label: 'Paid Ads', platforms: ['googleAds', 'metaAd'] },
];

const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  social: 'Social Media',
  paid: 'Paid Advertising',
  print: 'Print',
  listings: 'Online Listings',
  mls: 'MLS',
};

const CATEGORY_ORDER: PlatformCategory[] = ['social', 'paid', 'print', 'listings', 'mls'];

function PlatformIcon({ platformId, className }: { platformId: string; className?: string }) {
  const iconProps = { className: cn('h-5 w-5', className) };
  switch (platformId) {
    case 'instagram': return <Instagram {...iconProps} />;
    case 'facebook': return <Facebook {...iconProps} />;
    case 'twitter': return <Twitter {...iconProps} />;
    case 'googleAds': return <GoogleIcon {...iconProps} />;
    case 'metaAd': return <Layers {...iconProps} />;
    case 'magazineFullPage': return <BookOpen {...iconProps} />;
    case 'magazineHalfPage': return <BookMarked {...iconProps} />;
    case 'postcard': return <Mail {...iconProps} />;
    case 'zillow': return <Globe {...iconProps} />;
    case 'realtorCom': return <Building2 {...iconProps} />;
    case 'homesComTrulia': return <Home {...iconProps} />;
    case 'mlsDescription': return <FileText {...iconProps} />;
    default: return <Globe {...iconProps} />;
  }
}

// --- Component ---

interface PlatformSelectorProps {
  selected: PlatformId[];
  onChange: (platforms: PlatformId[]) => void;
}

export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = useCallback(
    (id: PlatformId) => {
      if (selectedSet.has(id)) {
        onChange(selected.filter((p) => p !== id));
      } else {
        onChange([...selected, id]);
      }
    },
    [selected, selectedSet, onChange]
  );

  const applyPreset = useCallback(
    (preset: PlatformPreset) => {
      if (preset.id === 'all') {
        // If all are already selected, deselect all; otherwise select all
        if (selected.length === ALL_PLATFORMS.length) {
          onChange([]);
        } else {
          onChange([...ALL_PLATFORMS]);
        }
      } else {
        // Toggle the preset: if all of its platforms are selected, remove them; otherwise add them
        const allInPreset = preset.platforms.every((p) => selectedSet.has(p));
        if (allInPreset) {
          onChange(selected.filter((p) => !preset.platforms.includes(p)));
        } else {
          const merged = new Set([...selected, ...preset.platforms]);
          onChange([...merged]);
        }
      }
    },
    [selected, selectedSet, onChange]
  );

  const isPresetActive = useCallback(
    (preset: PlatformPreset) => {
      if (preset.id === 'all') return selected.length === ALL_PLATFORMS.length;
      return preset.platforms.every((p) => selectedSet.has(p));
    },
    [selected, selectedSet]
  );

  const groupedByCategory = useMemo(() => {
    const groups: Record<PlatformCategory, PlatformOption[]> = {
      social: [],
      paid: [],
      print: [],
      listings: [],
      mls: [],
    };
    for (const opt of PLATFORM_OPTIONS) {
      groups[opt.category].push(opt);
    }
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Choose Your Platforms
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {selected.length}/{ALL_PLATFORMS.length} selected
        </span>
      </div>

      {/* Quick Presets */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {PRESETS.map((preset) => {
          const active = isPresetActive(preset);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Platform Grid grouped by category */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((category) => {
          const platforms = groupedByCategory[category];
          if (platforms.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {platforms.map((platform) => {
                  const isSelected = selectedSet.has(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggle(platform.id)}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-1 rounded-lg border p-3 min-h-[60px] min-w-0 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        isSelected
                          ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted'
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                      )}
                      <PlatformIcon
                        platformId={platform.id}
                        className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                      />
                      <span className="text-[11px] font-medium leading-tight text-center truncate w-full">
                        {platform.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategy note */}
      <p className="text-xs text-muted-foreground italic">
        Strategy toolkit (hashtags, CTAs, targeting) is always included.
      </p>
    </div>
  );
}
