'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Search, X, ArrowUpDown } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption = 'newest' | 'oldest' | 'price-high' | 'price-low'

export interface FilterState {
  q: string
  sort: SortOption
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-high', label: 'Price (high to low)' },
  { value: 'price-low', label: 'Price (low to high)' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignFilters({ initialQ, initialSort }: { initialQ: string; initialSort: SortOption }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build updated URL, preserving any other params
  const buildUrl = useCallback(
    (updates: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString())

      const q = 'q' in updates ? updates.q : (params.get('q') ?? '')
      const sort = 'sort' in updates ? updates.sort : (params.get('sort') ?? 'newest')

      if (q) {
        params.set('q', q)
      } else {
        params.delete('q')
      }

      if (sort && sort !== 'newest') {
        params.set('sort', sort as string)
      } else {
        params.delete('sort')
      }

      const qs = params.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [searchParams, pathname]
  )

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.replace(buildUrl({ q: value }), { scroll: false })
    }, 300)
  }

  // Immediate sort update
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(buildUrl({ sort: e.target.value as SortOption }), { scroll: false })
  }

  // Clear search
  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const input = document.getElementById('campaign-search') as HTMLInputElement | null
    if (input) input.value = ''
    router.replace(buildUrl({ q: '' }), { scroll: false })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Search input */}
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="campaign-search"
          type="search"
          defaultValue={initialQ}
          onChange={handleSearchChange}
          placeholder="Search by address or name..."
          autoComplete="off"
          className="
            w-full h-9 pl-9 pr-8 rounded-md
            border border-input bg-transparent
            text-sm placeholder:text-muted-foreground
            shadow-sm transition-colors
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
            [&::-webkit-search-cancel-button]:hidden
          "
          aria-label="Search campaigns"
        />
        {/* Clear button — shown when there's an initial value; JS shows it live via CSS */}
        {initialQ && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sort select */}
      <div className="relative flex-shrink-0">
        <ArrowUpDown
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <select
          defaultValue={initialSort}
          onChange={handleSortChange}
          className="
            h-9 pl-9 pr-8 rounded-md
            border border-input bg-background
            text-sm text-foreground
            shadow-sm transition-colors
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
            appearance-none cursor-pointer
            min-w-[160px]
          "
          aria-label="Sort campaigns"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom caret */}
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}
