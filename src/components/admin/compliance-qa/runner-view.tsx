'use client'

import { useState } from 'react'
import {
  Play,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Loader2,
} from 'lucide-react'
import type {
  ComplianceTestAd,
  RunResponse,
  AdTestResult,
  CrossStateResult,
} from '@/lib/types/compliance-qa'

interface RunnerViewProps {
  ads: ComplianceTestAd[]
  onRunComplete: () => Promise<void>
}

export function RunnerView({ ads, onRunComplete }: RunnerViewProps) {
  const [runningState, setRunningState] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<RunResponse | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [crossStateExpanded, setCrossStateExpanded] = useState(false)

  // Extract unique states from ads
  const states = Array.from(new Set(ads.map((ad) => ad.state))).sort()

  const handleRun = async (state?: string) => {
    setRunningState(state || 'all')
    setError(null)
    setResults(null)

    try {
      const res = await fetch('/api/admin/compliance-qa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state ? { state } : {}),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Run failed')
      }

      const data: RunResponse = await res.json()
      setResults(data)
      await onRunComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunningState(null)
    }
  }

  const toggleRow = (adId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(adId)) {
      newExpanded.delete(adId)
    } else {
      newExpanded.add(adId)
    }
    setExpandedRows(newExpanded)
  }

  const getStateCounts = (state: string) => {
    return ads.filter((ad) => ad.state === state).length
  }

  // Empty state
  if (ads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No test ads in corpus yet. Use the Scanner to add some first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* State cards grid */}
      {!results && (
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Run Test Suite</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {states.map((state) => (
              <button
                key={state}
                onClick={() => handleRun(state)}
                disabled={runningState !== null}
                className="rounded-lg border border-border bg-card p-4 text-left hover:border-gold/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl font-bold text-foreground">{state}</div>
                  {runningState === state ? (
                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 text-gold animate-pulse" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getStateCounts(state)} {getStateCounts(state) === 1 ? 'ad' : 'ads'}
                </div>
              </button>
            ))}

            {/* All States card */}
            <button
              onClick={() => handleRun()}
              disabled={runningState !== null}
              className="rounded-lg border-2 border-dashed border-border bg-card/50 p-4 text-left hover:border-gold/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-2xl font-bold text-foreground">ALL</div>
                {runningState === 'all' ? (
                  <Loader2 className="w-5 h-5 text-gold animate-spin" />
                ) : (
                  <Play className="w-5 h-5 text-gold animate-pulse" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {ads.length} {ads.length === 1 ? 'ad' : 'ads'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary banner */}
          <div
            className={`rounded-lg border p-4 ${
              results.summary.failed === 0
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {results.summary.failed === 0 ? (
                  <CheckCircle className="w-6 h-6 text-emerald-300" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-300" />
                )}
                <div>
                  <div
                    className={`text-lg font-semibold ${
                      results.summary.failed === 0 ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {results.summary.passed}/{results.summary.totalAds} passed
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {results.summary.falsePositives} false positives •{' '}
                    {results.summary.missedViolations} missed •{' '}
                    {results.durationMs}ms
                  </div>
                </div>
              </div>
              <button
                onClick={() => setResults(null)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Run Again
              </button>
            </div>
          </div>

          {/* Results table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Test Ad
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    State
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Result
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                    Expected
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                    Actual
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                    Mismatches
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result) => {
                  const hasMismatches = result.mismatches.length > 0
                  const isExpanded = expandedRows.has(result.adId)

                  return (
                    <>
                      <tr
                        key={result.adId}
                        className={`border-b border-border ${
                          !result.passed ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-2 py-3">
                          {hasMismatches && (
                            <button
                              onClick={() => toggleRow(result.adId)}
                              className="p-1 hover:bg-accent rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {result.adName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                            {result.state}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {result.passed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                          {result.expectedViolations.length}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                          {result.actualViolations.length}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                          {result.mismatches.length}
                        </td>
                      </tr>

                      {/* Expanded mismatches */}
                      {isExpanded && hasMismatches && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-accent/50">
                            <div className="space-y-1.5">
                              {result.mismatches.map((mismatch, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                                    mismatch.type === 'false-positive'
                                      ? 'bg-amber-500/10 text-amber-300'
                                      : 'bg-red-500/10 text-red-300'
                                  }`}
                                >
                                  <span className="font-semibold">
                                    {mismatch.type === 'false-positive'
                                      ? 'False +'
                                      : 'Missed'}
                                  </span>
                                  <span className="font-mono">{mismatch.term}</span>
                                  <span className="text-muted-foreground">
                                    {mismatch.category} / {mismatch.severity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cross-state panel */}
          {results.crossState.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setCrossStateExpanded(!crossStateExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gold" />
                  <span className="font-medium text-foreground">
                    Cross-State Isolation
                  </span>
                  {results.crossState.every((r) => r.passed) ? (
                    <span className="text-sm text-emerald-300">All passed</span>
                  ) : (
                    <span className="text-sm text-red-300">
                      {results.crossState.filter((r) => !r.passed).length} leaks
                      detected
                    </span>
                  )}
                </div>
                {crossStateExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {crossStateExpanded && (
                <div className="border-t border-border">
                  <table className="w-full">
                    <thead className="bg-accent/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                          Test Ad
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                          Ad State
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                          Tested Against
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                          Result
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">
                          Leaks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.crossState.map((check, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-border ${
                            !check.passed ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-2 text-sm text-foreground">
                            {check.adName}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                              {check.adState}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                              {check.testedAgainst}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {check.passed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-muted-foreground">
                            {check.stateLeaks.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
