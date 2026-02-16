'use client'

import { useState } from 'react'
import { Search, CheckCircle, AlertTriangle } from 'lucide-react'
// TODO: update for new compliance QA types (Task 13)
// import type { ScanResponse } from '@/lib/types/compliance-qa'

interface ScannerViewProps {
  onSaveToCorpus: (ad: {
    state: string
    name: string
    text: string
    expected_violations: Array<{ term: string; category: string; severity: string }>
    is_clean: boolean
    tags: string[]
    source: string
  }) => Promise<void>
}

const STATES = [
  { code: 'MT', name: 'Montana' },
]

export function ScannerView({ onSaveToCorpus }: ScannerViewProps) {
  const [adText, setAdText] = useState('')
  const [selectedState, setSelectedState] = useState('MT')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveSource, setSaveSource] = useState('')
  const [saveTags, setSaveTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [includedViolations, setIncludedViolations] = useState<Set<string>>(new Set())

  const handleScan = async () => {
    if (!adText.trim()) return

    setScanning(true)
    setScanResult(null)
    setShowSaveForm(false)
    setSaveSuccess(false)

    try {
      const res = await fetch('/api/admin/compliance-qa/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: adText, state: selectedState }),
      })

      if (!res.ok) throw new Error('Scan failed')

      const data = await res.json()
      setScanResult(data)

      // Initialize all violations as included
      const allTerms = new Set<string>(data.violations.map((v: any) => v.term))
      setIncludedViolations(allTerms)
    } catch (err) {
      console.error('Scan error:', err)
      alert('Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const toggleViolationInclusion = (term: string) => {
    setIncludedViolations((prev) => {
      const next = new Set(prev)
      if (next.has(term)) {
        next.delete(term)
      } else {
        next.add(term)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!scanResult || !saveName.trim()) return

    const expectedViolations = scanResult.violations
      .filter((v: any) => includedViolations.has(v.term))
      .map((v: any) => ({
        term: v.term,
        category: v.category,
        severity: v.severity,
      }))

    const tags = saveTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    setSaving(true)

    try {
      await onSaveToCorpus({
        state: selectedState,
        name: saveName,
        text: adText,
        expected_violations: expectedViolations,
        is_clean: expectedViolations.length === 0,
        tags,
        source: saveSource.trim() || 'Ad Hoc Scanner',
      })

      setSaveSuccess(true)
      setShowSaveForm(false)

      // Reset save form
      setSaveName('')
      setSaveSource('')
      setSaveTags('')

      // Auto-hide success message after 3s
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save to corpus. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <div className="space-y-4">
        <div>
          <label htmlFor="ad-text" className="block text-sm font-medium text-foreground mb-2">
            Ad Text
          </label>
          <textarea
            id="ad-text"
            value={adText}
            onChange={(e) => setAdText(e.target.value)}
            placeholder="Paste ad text here..."
            rows={8}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none"
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="state" className="block text-sm font-medium text-foreground mb-2">
              State
            </label>
            <select
              id="state"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
            >
              {STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleScan}
            disabled={!adText.trim() || scanning}
            className="bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold/90 rounded-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-4 h-4" />
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="rounded-lg border border-green-400/50 bg-green-400/10 px-4 py-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-400">Saved to corpus successfully</p>
          </div>
        </div>
      )}

      {/* Results Panel */}
      {scanResult && (
        <div className="space-y-4">
          {/* Status Banner */}
          {scanResult.violations.length === 0 ? (
            <div className="rounded-lg border border-green-400/50 bg-green-400/10 px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">Clean — no violations found</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-400/50 bg-amber-400/10 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-400 mb-1">
                  {scanResult.summary.total} violation{scanResult.summary.total === 1 ? '' : 's'} found
                </p>
                <p className="text-xs text-amber-400/80">
                  {scanResult.summary.hard} hard, {scanResult.summary.soft} soft
                </p>
              </div>
            </div>
          )}

          {/* Layer Breakdown */}
          {scanResult.violations.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Layer breakdown:</span> State: {scanResult.layerBreakdown.state.length}, Federal: {scanResult.layerBreakdown.federal.length}, Industry: {scanResult.layerBreakdown.industry.length}
            </div>
          )}

          {/* Save to Corpus Button */}
          {!showSaveForm && (
            <button
              onClick={() => setShowSaveForm(true)}
              className="border border-border px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
            >
              Save to Corpus
            </button>
          )}

          {/* Save Form */}
          {showSaveForm && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Save to Test Corpus</h3>

              <div>
                <label htmlFor="save-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Name *
                </label>
                <input
                  id="save-name"
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., Clean family-friendly ad"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                />
              </div>

              <div>
                <label htmlFor="save-source" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Source
                </label>
                <input
                  id="save-source"
                  type="text"
                  value={saveSource}
                  onChange={(e) => setSaveSource(e.target.value)}
                  placeholder="e.g., Zillow, manual entry"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                />
              </div>

              <div>
                <label htmlFor="save-tags" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  id="save-tags"
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="e.g., family-status, clean, edge-case"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim() || saving}
                  className="bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold/90 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  disabled={saving}
                  className="border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md disabled:opacity-40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Violations Table */}
          {scanResult.violations.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {showSaveForm && (
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20">
                        Include
                      </th>
                    )}
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Term
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Category
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Severity
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                      Citation
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">
                      Context
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scanResult.violations.map((violation: any, idx: number) => {
                    const isIncluded = includedViolations.has(violation.term)
                    const rowOpacity = showSaveForm && !isIncluded ? 'opacity-40' : ''

                    return (
                      <tr key={idx} className={`${rowOpacity} transition-opacity`}>
                        {showSaveForm && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleViolationInclusion(violation.term)}
                              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                isIncluded
                                  ? 'bg-gold/10 text-gold hover:bg-gold/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {isIncluded ? 'Yes' : 'No'}
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono text-foreground">
                            {violation.term}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground capitalize">
                            {violation.category.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              violation.severity === 'hard'
                                ? 'bg-red-400/10 text-red-400'
                                : 'bg-amber-400/10 text-amber-400'
                            }`}
                          >
                            {violation.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {violation.law}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {violation.context.length > 60
                              ? `${violation.context.slice(0, 60)}...`
                              : violation.context}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
