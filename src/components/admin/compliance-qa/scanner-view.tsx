'use client'

import { useState } from 'react'
import { Search, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { ScanResponse } from '@/lib/types/compliance-qa'

const STATES = [
  { code: 'MT', name: 'Montana' },
  { code: 'OH', name: 'Ohio' },
]

const PLATFORMS = [
  { id: 'zillow', name: 'Zillow' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'google', name: 'Google' },
]

export function ScannerView() {
  const [adText, setAdText] = useState('')
  const [selectedState, setSelectedState] = useState('MT')
  const [selectedPlatform, setSelectedPlatform] = useState('zillow')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)

  const handleScan = async () => {
    if (!adText.trim()) return

    setScanning(true)
    setScanResult(null)

    try {
      const res = await fetch('/api/admin/compliance-qa/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: adText,
          state: selectedState,
          platform: selectedPlatform,
        }),
      })

      if (!res.ok) throw new Error('Scan failed')

      const data = await res.json()
      setScanResult(data)
    } catch (err) {
      console.error('Scan error:', err)
      alert('Scan failed. Please try again.')
    } finally {
      setScanning(false)
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

          <div className="flex-1">
            <label htmlFor="platform" className="block text-sm font-medium text-foreground mb-2">
              Platform
            </label>
            <select
              id="platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
            >
              {PLATFORMS.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
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

      {/* Results Panel */}
      {scanResult && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
            scanResult.verdict === 'compliant'
              ? 'border-green-400/50 bg-green-400/10'
              : scanResult.verdict === 'needs-review'
              ? 'border-amber-400/50 bg-amber-400/10'
              : 'border-red-400/50 bg-red-400/10'
          }`}>
            {scanResult.verdict === 'compliant' ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : scanResult.verdict === 'needs-review' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                scanResult.verdict === 'compliant'
                  ? 'text-green-400'
                  : scanResult.verdict === 'needs-review'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {scanResult.verdict === 'compliant' && 'Compliant'}
                {scanResult.verdict === 'needs-review' && 'Needs Review'}
                {scanResult.verdict === 'non-compliant' && 'Non-Compliant'}
              </p>
              <p className={`text-xs mt-0.5 ${
                scanResult.verdict === 'compliant'
                  ? 'text-green-400/80'
                  : scanResult.verdict === 'needs-review'
                  ? 'text-amber-400/80'
                  : 'text-red-400/80'
              }`}>
                {scanResult.summary.total} violation{scanResult.summary.total === 1 ? '' : 's'} found
                {scanResult.summary.total > 0 && ` (${scanResult.summary.hard} hard, ${scanResult.summary.soft} soft)`}
                {scanResult.summary.autoFixed > 0 && ` • ${scanResult.summary.autoFixed} auto-fixed`}
              </p>
            </div>
          </div>

          {/* Violations Table */}
          {scanResult.violations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Violations</h3>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
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
                        Explanation
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">
                        Law Citation
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-32">
                        Contextual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scanResult.violations.map((violation, idx) => (
                      <tr key={idx}>
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
                            {violation.explanation}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {violation.law}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {violation.isContextual && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-400/10 text-blue-400">
                              Contextual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Auto-Fixes Section */}
          {scanResult.autoFixes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Auto-Fixes Applied</h3>
              <div className="space-y-3">
                {scanResult.autoFixes.map((fix, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{fix.violationTerm}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fix.category}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Before</p>
                        <div className="rounded border border-border bg-background p-2">
                          <code className="text-xs text-red-400 line-through">{fix.before}</code>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">After</p>
                        <div className="rounded border border-border bg-background p-2">
                          <code className="text-xs text-green-400">{fix.after}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
