'use client'

import { Pencil, Trash2, Home } from 'lucide-react'
import type { TestPreset } from '@/lib/types/preset'

interface PresetCardProps {
  preset: TestPreset
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function PresetCard({ preset, isSelected, onSelect, onEdit, onDelete }: PresetCardProps) {
  const listing = preset.listing_data

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className={`w-full text-left rounded-lg border p-4 transition-colors cursor-pointer ${
        isSelected
          ? 'border-gold bg-gold/5 ring-1 ring-gold'
          : 'border-border bg-card hover:border-gold/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted-foreground shrink-0" />
          <h3 className="font-medium text-foreground text-sm">{preset.name}</h3>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit preset"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete preset"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground">
          {listing.address.city}, {listing.address.state} &middot; {listing.propertyType}
        </p>
        <p className="text-sm text-foreground font-medium">
          ${(listing.price ?? 0).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {listing.beds ?? 0} bd &middot; {listing.baths ?? 0} ba &middot; {(listing.sqft ?? 0).toLocaleString()} sqft
        </p>
      </div>
    </div>
  )
}
