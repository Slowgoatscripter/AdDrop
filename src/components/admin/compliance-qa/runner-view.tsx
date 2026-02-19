'use client'

import { useState, Fragment } from 'react'
import {
  Play,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type {
  ComplianceTestProperty,
  RunResponse,
  PropertyTestResult,
  TestRunMode,
} from '@/lib/types/compliance-qa'
import type { ComplianceAgentViolation, ComplianceAutoFix } from '@/lib/types/compliance'

interface RunnerViewProps {
  properties: ComplianceTestProperty[]
  onRunComplete: () => Promise<void>
}

export function RunnerView({ properties, onRunComplete }: RunnerViewProps) {
  const [runMode, setRunMode] = useState<TestRunMode>('snapshot')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<RunResponse | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Extract unique states from properties
  const states = Array.from(new Set(properties.map((p) => p.state))).sort()

  const handleRun = async (filterState?: string) => {
    setRunning(true)
    setError(null)
    setResults(null)

    const targetState = filterState || stateFilter

    try {
      const res = await fetch('/api/admin/compliance-qa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: targetState === 'all' ? undefined : targetState,
          mode: runMode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Run failed')
      }

      const data = await res.json()
      setResults(data)
      await onRunComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  const toggleRow = (propertyId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId)
    } else {
      newExpanded.add(propertyId)
    }
    setExpandedRows(newExpanded)
  }

  const getStateCounts = (state: string) => {
    return properties.filter((p) => p.state === state).length
  }

  const getPassRate = () => {
    if (!results) return 0
    return Math.round((results.summary.passed / results.summary.totalProperties) * 100)
  }

  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-400'
    if (rate >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

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

  const getVerdictBadge = (verdict: 'compliant' | 'needs-review' | 'non-compliant') => {
    switch (verdict) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-400/10 text-green-400">
            Compliant
          </span>
        )
      case 'needs-review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-400/10 text-amber-400">
            Needs Review
          </span>
        )
      case 'non-compliant':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-400/10 text-red-400">
            Non-Compliant
          </span>
        )
    }
  }

  // Empty state
  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No test properties in corpus yet. Use the Scanner to add some first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Top section: Mode selector + controls */}
      {!results && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Mode:</span>
              <div className="flex rounded-lg border border-border bg-card p-1">
                <button
                  onClick={() => setRunMode('snapshot')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    runMode === 'snapshot'
                      ? 'bg-gold text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Snapshot Test
                </button>
                <button
                  onClick={() => setRunMode('full-pipeline')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    runMode === 'full-pipeline'
                      ? 'bg-gold text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Full Pipeline
                </button>
              </div>
            </div>

            {/* State filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">State:</span>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              >
                <option value="all">ALL</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Run button */}
            <button
              onClick={() => handleRun()}
              disabled={running}
              className="bg-gold px-4 py-1.5 text-sm font-medium text-background hover:bg-gold/90 rounded-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Tests
                </>
              )}
            </button>
          </div>

          {/* State cards grid */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">Quick Run by State</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => {
                    setStateFilter(state)
                    handleRun(state)
                  }}
                  disabled={running}
                  className="rounded-lg border border-border bg-card p-4 text-left hover:border-gold/50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-2xl font-bold text-foreground">{state}</div>
                    <Play className="w-5 h-5 text-gold" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStateCounts(state)} {getStateCounts(state) === 1 ? 'property' : 'properties'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results section */}
      {results && (
        <div className="space-y-6">
          {/* Summary banner */}
          <div
            className={`rounded-lg border p-4 ${
              getPassRate() >= 90
                ? 'border-green-500/30 bg-green-500/10'
                : getPassRate() >= 70
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {getPassRate() >= 90 ? (
                  <CheckCircle className="w-6 h-6 text-green-300" />
                ) : getPassRate() >= 70 ? (
                  <AlertTriangle className="w-6 h-6 text-amber-300" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-300" />
                )}
                <div>
                  <div className={`text-3xl font-bold ${getPassRateColor(getPassRate())}`}>
                    {getPassRate()}%
                  </div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
                </div>
              </div>
              <button
                onClick={() => setResults(null)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Run Again
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div>
                <span className="text-foreground font-medium">{results.summary.totalProperties}</span>
                <span className="text-muted-foreground ml-1">properties tested</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div>
                <span className="text-green-400 font-medium">{results.summary.passed}</span>
                <span className="text-muted-foreground ml-1">passed</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div>
                <span className="text-red-400 font-medium">{results.summary.failed}</span>
                <span className="text-muted-foreground ml-1">failed</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div>
                <span className="text-amber-400 font-medium">{results.summary.totalViolationsFound}</span>
                <span className="text-muted-foreground ml-1">violations found</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div>
                <span className="text-blue-400 font-medium">{results.summary.totalAutoFixes}</span>
                <span className="text-muted-foreground ml-1">auto-fixes applied</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div>
                <span className="text-muted-foreground">{results.durationMs}ms</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    runMode === 'snapshot'
                      ? 'bg-purple-400/10 text-purple-400'
                      : 'bg-blue-400/10 text-blue-400'
                  }`}
                >
                  {runMode === 'snapshot' ? 'Snapshot' : 'Full Pipeline'}
                </span>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Property Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    State
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Risk Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    Verdict
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                    Violations
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                    Auto-Fixes
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result: PropertyTestResult) => {
                  const hasDetails =
                    result.complianceResult.violations.length > 0 ||
                    result.complianceResult.autoFixes.length > 0
                  const isExpanded = expandedRows.has(result.propertyId)

                  return (
                    <Fragment key={result.propertyId}>
                      <tr
                        className={`border-b border-border ${
                          !result.passed ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-2 py-3">
                          {hasDetails && (
                            <button
                              onClick={() => toggleRow(result.propertyId)}
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
                          {result.propertyName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                            {result.state}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRiskCategoryColor(
                              result.riskCategory
                            )}`}
                          >
                            {result.riskCategory.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getVerdictBadge(result.complianceResult.campaignVerdict)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                          {result.complianceResult.totalViolations}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                          {result.complianceResult.totalAutoFixes}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && hasDetails && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-accent/50">
                            <div className="space-y-4">
                              {/* Violations */}
                              {result.complianceResult.violations.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-foreground mb-2">
                                    Violations ({result.complianceResult.violations.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {result.complianceResult.violations.map(
                                      (violation: ComplianceAgentViolation, idx: number) => (
                                        <div
                                          key={idx}
                                          className="rounded-lg border border-border bg-card p-3 text-sm"
                                        >
                                          <div className="flex items-start gap-3 mb-2">
                                            <code className="text-foreground font-mono">
                                              {violation.term}
                                            </code>
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                violation.severity === 'hard'
                                                  ? 'bg-red-400/10 text-red-400'
                                                  : 'bg-amber-400/10 text-amber-400'
                                              }`}
                                            >
                                              {violation.severity}
                                            </span>
                                            <span className="text-xs text-muted-foreground capitalize">
                                              {violation.category.replace(/-/g, ' ')}
                                            </span>
                                            {violation.isContextual && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-400/10 text-blue-400">
                                                Contextual
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground mb-1">
                                            {violation.explanation}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {violation.law}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Regex pre-scan findings */}
                              {result.regexFindingsCount != null && result.regexFindingsCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({result.regexFindingsCount} regex pre-scan findings)
                                </span>
                              )}

                              {/* Auto-fixes */}
                              {result.complianceResult.autoFixes.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-foreground mb-2">
                                    Auto-Fixes Applied ({result.complianceResult.autoFixes.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {result.complianceResult.autoFixes.map(
                                      (fix: ComplianceAutoFix, idx: number) => (
                                        <div
                                          key={idx}
                                          className="rounded-lg border border-border bg-card p-3"
                                        >
                                          <div className="flex items-start gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                {fix.violationTerm}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {fix.category} • {fix.platform}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Before
                                              </p>
                                              <div className="rounded border border-border bg-background p-2">
                                                <code className="text-xs text-red-400 line-through">
                                                  {fix.before}
                                                </code>
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                                After
                                              </p>
                                              <div className="rounded border border-border bg-background p-2">
                                                <code className="text-xs text-green-400">
                                                  {fix.after}
                                                </code>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Generated text (full-pipeline mode only) */}
                              {runMode === 'full-pipeline' && result.generatedText && (
                                <div>
                                  <h4 className="text-sm font-medium text-foreground mb-2">
                                    Generated Text
                                    {(result.qualitySuggestionsCount ?? result.qualityFixesApplied ?? 0) > 0 && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({result.qualitySuggestionsCount ?? result.qualityFixesApplied ?? 0} quality {result.qualitySuggestionsCount ? 'suggestions' : 'fixes applied'})
                                      </span>
                                    )}
                                  </h4>
                                  <div className="space-y-2">
                                    {Object.entries(result.generatedText).map(
                                      ([platform, text]) => (
                                        <details key={platform} className="group">
                                          <summary className="cursor-pointer list-none rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium text-foreground capitalize">
                                                {platform}
                                              </span>
                                              <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                                            </div>
                                          </summary>
                                          <div className="mt-2 rounded-lg border border-border bg-background p-3">
                                            <p className="text-xs text-foreground whitespace-pre-wrap">
                                              {text}
                                            </p>
                                          </div>
                                        </details>
                                      )
                                    )}
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
