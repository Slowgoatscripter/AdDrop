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
  Plus,
  X,
  Loader2,
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

const RISK_CATEGORY_OPTIONS = [
  'clean',
  'economic-exclusion',
  'religion-steering',
  'familial-status',
  'disability',
  'race-color-national-origin',
  'sex-gender',
  'age',
  'marital-status',
  'multi-category',
]

const INITIAL_FORM = {
  name: '',
  state: 'MT',
  risk_category: 'clean',
  is_seed: false,
  tags: '',
  street: '',
  city: '',
  addressState: 'MT',
  zip: '',
  price: '',
  beds: '',
  baths: '',
  sqft: '',
  lotSize: '',
  yearBuilt: '',
  propertyType: 'Single Family',
  features: '',
  description: '',
}

export function CorpusView({ properties, onDelete, onDuplicate, onRefresh }: CorpusViewProps) {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [seedFilter, setSeedFilter] = useState<SeedFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
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

  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/compliance-qa/corpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          state: form.state,
          risk_category: form.risk_category,
          is_seed: form.is_seed,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          listing_data: {
            url: '',
            address: {
              street: form.street,
              city: form.city,
              state: form.addressState,
              zip: form.zip,
            },
            price: Number(form.price) || 0,
            beds: Number(form.beds) || 0,
            baths: Number(form.baths) || 0,
            sqft: Number(form.sqft) || 0,
            lotSize: form.lotSize || undefined,
            yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
            propertyType: form.propertyType,
            features: form.features
              .split(',')
              .map((f) => f.trim())
              .filter(Boolean),
            description: form.description,
            photos: [],
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create property')
      }

      setForm(INITIAL_FORM)
      setShowAddForm(false)
      await onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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

        {/* Add Property button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showAddForm
              ? 'bg-muted text-foreground border border-border'
              : 'bg-gold text-background hover:bg-gold/90'
          }`}
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Add Property'}
        </button>
      </div>

      {/* Add Property Form */}
      {showAddForm && (
        <form onSubmit={handleAddProperty} className="mb-4 p-4 rounded-lg border border-gold/30 bg-gold/5">
          <h3 className="text-sm font-semibold text-foreground mb-4">New Test Property</h3>

          {/* Row 1: Name, State, Risk Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g., Luxury Whitefish Estate"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">State *</label>
              <input
                type="text"
                required
                maxLength={2}
                value={form.state}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase()
                  updateForm('state', val)
                  updateForm('addressState', val)
                }}
                placeholder="MT"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Risk Category *</label>
              <select
                value={form.risk_category}
                onChange={(e) => updateForm('risk_category', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                {RISK_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatRiskLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Address */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Street *</label>
              <input
                type="text"
                required
                value={form.street}
                onChange={(e) => updateForm('street', e.target.value)}
                placeholder="123 Main St"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
                placeholder="Billings"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">ZIP *</label>
              <input
                type="text"
                required
                value={form.zip}
                onChange={(e) => updateForm('zip', e.target.value)}
                placeholder="59101"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          {/* Row 3: Property details */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Price *</label>
              <input
                type="number"
                required
                value={form.price}
                onChange={(e) => updateForm('price', e.target.value)}
                placeholder="350000"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Beds *</label>
              <input
                type="number"
                required
                value={form.beds}
                onChange={(e) => updateForm('beds', e.target.value)}
                placeholder="3"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Baths *</label>
              <input
                type="number"
                required
                value={form.baths}
                onChange={(e) => updateForm('baths', e.target.value)}
                placeholder="2"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Sqft *</label>
              <input
                type="number"
                required
                value={form.sqft}
                onChange={(e) => updateForm('sqft', e.target.value)}
                placeholder="1800"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Year Built</label>
              <input
                type="number"
                value={form.yearBuilt}
                onChange={(e) => updateForm('yearBuilt', e.target.value)}
                placeholder="2020"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Lot Size</label>
              <input
                type="text"
                value={form.lotSize}
                onChange={(e) => updateForm('lotSize', e.target.value)}
                placeholder="0.5 acres"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          {/* Row 4: Property Type, Features, Tags */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Property Type</label>
              <select
                value={form.propertyType}
                onChange={(e) => updateForm('propertyType', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="Single Family">Single Family</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Multi-Family">Multi-Family</option>
                <option value="Land">Land</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Features <span className="text-muted-foreground/60">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.features}
                onChange={(e) => updateForm('features', e.target.value)}
                placeholder="garage, pool, backyard"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tags <span className="text-muted-foreground/60">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => updateForm('tags', e.target.value)}
                placeholder="luxury, pricing-language"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          {/* Row 5: Description */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="Property description..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
            />
          </div>

          {/* Row 6: Seed checkbox + Submit */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_seed}
                onChange={(e) => updateForm('is_seed', e.target.checked)}
                className="rounded border-border"
              />
              Seed property (manually crafted for testing)
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold/90 rounded-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Property
                </>
              )}
            </button>
          </div>
        </form>
      )}

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
