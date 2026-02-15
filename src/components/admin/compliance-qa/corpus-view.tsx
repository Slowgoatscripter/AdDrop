'use client'

import { useState, useRef } from 'react'
import { Search, ChevronRight, ChevronDown, Copy, Trash2, Upload, Download } from 'lucide-react'
import type { ComplianceTestAd } from '@/lib/types/compliance-qa'

interface CorpusViewProps {
  ads: ComplianceTestAd[]
  onDelete: (id: string) => Promise<void>
  onDuplicate: (ad: ComplianceTestAd) => Promise<void>
  onRefresh: () => Promise<void>
}

type CleanFilter = 'all' | 'clean' | 'violations'

export function CorpusView({ ads, onDelete, onDuplicate, onRefresh }: CorpusViewProps) {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [cleanFilter, setCleanFilter] = useState<CleanFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get unique states
  const uniqueStates = Array.from(new Set(ads.map((ad) => ad.state))).sort()

  // Apply filters
  const filtered = ads.filter((ad) => {
    const matchesSearch =
      search === '' ||
      ad.name.toLowerCase().includes(search.toLowerCase()) ||
      ad.text.toLowerCase().includes(search.toLowerCase()) ||
      ad.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))

    const matchesState = stateFilter === 'all' || ad.state === stateFilter

    const matchesClean =
      cleanFilter === 'all' ||
      (cleanFilter === 'clean' && ad.is_clean) ||
      (cleanFilter === 'violations' && !ad.is_clean)

    return matchesSearch && matchesState && matchesClean
  })

  // Stats
  const stateCounts = ads.reduce(
    (acc, ad) => {
      acc[ad.state] = (acc[ad.state] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const cleanCount = ads.filter((ad) => ad.is_clean).length
  const violationsCount = ads.length - cleanCount

  // Montana and Ohio counts for display
  const mtCount = stateCounts['MT'] || 0
  const ohCount = stateCounts['OH'] || 0

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test ad?')) return
    try {
      await onDelete(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete ad')
    }
  }

  async function handleDuplicate(ad: ComplianceTestAd) {
    try {
      await onDuplicate(ad)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate ad')
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const imported = JSON.parse(text) as ComplianceTestAd[]

      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array of ads')
      }

      // Post each ad to the API
      for (const ad of imported) {
        const response = await fetch('/api/admin/compliance-qa/corpus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: ad.state,
            name: ad.name,
            text: ad.text,
            expected_violations: ad.expected_violations,
            is_clean: ad.is_clean,
            tags: ad.tags,
            source: ad.source,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to import ad: ${ad.name}`)
        }
      }

      await onRefresh()
      alert(`Successfully imported ${imported.length} ads`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import file')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleExport() {
    const exportData = ads.map((ad) => ({
      state: ad.state,
      name: ad.name,
      text: ad.text,
      expected_violations: ad.expected_violations,
      is_clean: ad.is_clean,
      tags: ad.tags,
      source: ad.source,
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-corpus-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'hard':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'soft':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-muted/50 text-muted-foreground border-border'
    }
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-4 p-3 rounded-lg border border-border bg-card">
        <p className="text-sm text-foreground">
          <span className="font-medium">{ads.length}</span> ads total —{' '}
          <span className="text-muted-foreground">
            MT: {mtCount}, OH: {ohCount}
          </span>{' '}
          —{' '}
          <span className="text-green-400">{cleanCount} clean</span>,{' '}
          <span className="text-amber-400">{violationsCount} with violations</span>
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        {/* Search input */}
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ads, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </div>

        {/* State filter */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          <option value="all">All States</option>
          {uniqueStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        {/* Clean/Violations filter */}
        <select
          value={cleanFilter}
          onChange={(e) => setCleanFilter(e.target.value as CleanFilter)}
          className="text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          <option value="all">All Ads</option>
          <option value="clean">Clean Only</option>
          <option value="violations">Violations Only</option>
        </select>

        {/* Import button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />

        {/* Export button */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-10"></th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">State</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Violations</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tags</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Source</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((ad) => {
              const isExpanded = expandedId === ad.id

              return (
                <>
                  {/* Main row */}
                  <tr key={ad.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(ad.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{ad.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {ad.state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ad.is_clean ? (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                          Clean
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                          Violations
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {ad.expected_violations.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ad.tags.slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold"
                          >
                            {tag}
                          </span>
                        ))}
                        {ad.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{ad.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ad.source}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(ad)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`${ad.id}-detail`}>
                      <td colSpan={8} className="px-4 py-4 bg-muted/20">
                        <div className="space-y-3">
                          {/* Ad text */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Ad Text</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{ad.text}</p>
                          </div>

                          {/* Expected violations */}
                          {ad.expected_violations.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Expected Violations
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {ad.expected_violations.map((v, i) => (
                                  <span
                                    key={i}
                                    className={`rounded-md border px-2 py-1 text-xs font-medium ${getSeverityColor(
                                      v.severity
                                    )}`}
                                  >
                                    {v.term} ({v.category})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All tags */}
                          {ad.tags.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                              <div className="flex flex-wrap gap-1">
                                {ad.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No ads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Showing {filtered.length} of {ads.length} ads
      </p>
    </div>
  )
}
