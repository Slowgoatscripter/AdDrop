'use client'

import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div
      className="flex items-center rounded-md border border-border overflow-hidden"
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onViewChange('grid')}
        className={cn(
          'flex items-center justify-center w-8 h-8 transition-colors',
          view === 'grid'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewChange('list')}
        className={cn(
          'flex items-center justify-center w-8 h-8 transition-colors border-l border-border',
          view === 'list'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        aria-label="List view"
        aria-pressed={view === 'list'}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  )
}
