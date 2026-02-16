'use client'

import { useState, useRef, Fragment } from 'react'
import {
  Search,
  ChevronRight,
  ChevronDown,
  Copy,
  Trash2,
  Upload,
  Download,
  Home,
  DollarSign,
  Bed,
  Bath,
  Maximize,
  Calendar,
  Tag,
} from 'lucide-react'
import type { ComplianceTestProperty } from '@/lib/types/compliance-qa'

interface CorpusViewProps {
  properties: ComplianceTestProperty[]
  onDelete: (id: string) => Promise<void>
  onDuplicate: (property: any) => Promise<void>
  onRefresh: () => Promise<void>
}

type SeedFilter = 'all' | 'seed' | 'real'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)

const getRiskCategoryColor = (category: string) => {
  switch (category) {
    case 'clean':
      return 'bg-green-400/10 text-green-400'
    case 'economic-exclusion':
      return 'bg-amber-400/10 text-amber-400'
    case 'religion':
    case 'religion-steering':
      return 'bg-purple-400/10 text-purple-400'
    case 'familial-status':
      return 'bg-blue-400/10 text-blue-400'
    case 'disability':
      return 'bg-cyan-400/10 text-cyan-400'
    case 'race-color-national-origin':
      return 'bg-red-400/10 text-red-400'
    default:
      return 'bg-muted/50 text-muted-foreground'
  }
}

const formatRiskLabel = (category: string) =>
  category
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export function CorpusView({ properties, onDelete, onDuplicate, onRefresh }: CorpusViewProps) {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [seedFilter, setSeedFilter] = useState<SeedFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Unique values for filters
  const uniqueStates = Array.from(new Set(properties.map((p) => p.state))).sort()
  const uniqueRiskCategories = Array.from(new Set(properties.map((p) => p.risk_category))).sort()

  // Apply filters
  const filtered = properties.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))

    const matchesState = stateFilter === 'all' || p.state === stateFilter
    const matchesRisk = riskFilter === 'all' || p.risk_category === riskFilter
    const matchesSeed =
      seedFilter === 'all' ||
      (seedFilter === 'seed' && p.is_seed) ||
      (seedFilter === 'real' && !p.is_seed)

    return matchesSearch && matchesState && matchesRisk && matchesSeed
  })

  // Stats
  const stateCounts = properties.reduce(
    (acc, p) => {
      acc[p.state] = (acc[p.state] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const riskCounts = properties.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const seedCount = properties.filter((p) => p.is_seed).length
  const realCount = properties.length - seedCount

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
    setExpandedDescription(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test property?')) return
    try {
      await onDelete(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete property')
    }
  }

  async function handleDuplicate(property: ComplianceTestProperty) {
    try {
      await onDuplicate(property)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate property')
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const imported = JSON.parse(text) as any[]

      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array of properties')
      }

      for (const prop of imported) {
        const response = await fetch('/api/admin/compliance-qa/corpus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prop.name,
            state: prop.state,
            listing_data: prop.listing_data,
            risk_category: prop.risk_category,
            is_seed: prop.is_seed,
            tags: prop.tags,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to import property: ${prop.name}`)
        }
      }

      await onRefresh()
      alert(`Successfully imported ${imported.length} properties`)
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
    const exportData = properties.map((p) => ({
      name: p.name,
      state: p.state,
      listing_data: p.listing_data,
      risk_category: p.risk_category,
      is_seed: p.is_seed,
      tags: p.tags,
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-properties-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-4 p-3 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-foreground">
            <span className="font-medium">{properties.length}</span> properties total
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            {uniqueStates.map((s) => `${s}: ${stateCounts[s]}`).join(', ')}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            {Object.entries(riskCounts)
              .map(([cat, count]) => `${formatRiskLabel(cat)}: ${count}`)
              .join(', ')}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-blue-400">{seedCount} seed</span>,{' '}
          <span className="text-green-400">{realCount} real</span>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        {/* Search input */}
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, tags..."
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

        {/* Risk category filter */}
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          <option value="all">All Risk Categories</option>
          {uniqueRiskCategories.map((cat) => (
            <option key={cat} value={cat}>
              {formatRiskLabel(cat)}
            </option>
          ))}
        </select>

        {/* Seed/Real filter */}
        <select
          value={seedFilter}
          onChange={(e) => setSeedFilter(e.target.value as SeedFilter)}
          className="text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          <option value="all">All Properties</option>
          <option value="seed">Seed Only</option>
          <option value="real">Real Only</option>
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
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                State
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Risk Category
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Tags
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((property) => {
              const isExpanded = expandedId === property.id
              const listing = property.listing_data

              return (
                <Fragment key={property.id}>
                  {/* Main row */}
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(property.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                      {property.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {property.state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRiskCategoryColor(
                          property.risk_category
                        )}`}
                      >
                        {formatRiskLabel(property.risk_category)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {property.is_seed ? (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                          Seed
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                          Real
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {property.tags.slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold"
                          >
                            {tag}
                          </span>
                        ))}
                        {property.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{property.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(property)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
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
                    <tr key={`${property.id}-detail`}>
                      <td colSpan={7} className="px-4 py-4 bg-muted/20">
                        <div className="space-y-4">
                          {/* Address & Price row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Home className="w-3 h-3" /> Address
                              </p>
                              <p className="text-sm text-foreground">
                                {listing.address.street}, {listing.address.city},{' '}
                                {listing.address.state} {listing.address.zip}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Price
                              </p>
                              <p className="text-sm text-foreground font-medium">
                                {formatPrice(listing.price)}
                              </p>
                            </div>
                          </div>

                          {/* Property details row */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Bed className="w-3 h-3" /> Beds
                              </p>
                              <p className="text-sm text-foreground">{listing.beds}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Bath className="w-3 h-3" /> Baths
                              </p>
                              <p className="text-sm text-foreground">{listing.baths}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Maximize className="w-3 h-3" /> Sqft
                              </p>
                              <p className="text-sm text-foreground">
                                {listing.sqft.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Home className="w-3 h-3" /> Type
                              </p>
                              <p className="text-sm text-foreground">{listing.propertyType}</p>
                            </div>
                            {listing.yearBuilt && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Year Built
                                </p>
                                <p className="text-sm text-foreground">{listing.yearBuilt}</p>
                              </div>
                            )}
                            {listing.lotSize && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Lot Size
                                </p>
                                <p className="text-sm text-foreground">{listing.lotSize}</p>
                              </div>
                            )}
                          </div>

                          {/* Features */}
                          {listing.features.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Features
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {listing.features.map((feature, i) => (
                                  <span
                                    key={i}
                                    className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Description
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {expandedDescription === property.id
                                ? listing.description
                                : listing.description.length > 200
                                ? listing.description.slice(0, 200) + '...'
                                : listing.description}
                            </p>
                            {listing.description.length > 200 && (
                              <button
                                onClick={() =>
                                  setExpandedDescription(
                                    expandedDescription === property.id ? null : property.id
                                  )
                                }
                                className="text-xs text-gold hover:text-gold/80 mt-1 transition-colors"
                              >
                                {expandedDescription === property.id ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>

                          {/* Tags */}
                          {property.tags.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Tags
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {property.tags.map((tag, i) => (
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
                </Fragment>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No properties found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Showing {filtered.length} of {properties.length} properties
      </p>
    </div>
  )
}
