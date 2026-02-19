'use client'

import { useState, Fragment, useMemo } from 'react'
import {
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
} from 'lucide-react'
import type {
  ComplianceTestRun,
  PropertyTestResult,
  TestRunMode,
} from '@/lib/types/compliance-qa'
import type { ComplianceAgentViolation, ComplianceAutoFix } from '@/lib/types/compliance'

interface HistoryViewProps {
  runs: ComplianceTestRun[]
  onRefresh: () => Promise<void>
}

type RunModeFilter = 'all' | TestRunMode
type RunTypeFilter = 'all' | 'full-suite' | 'single-state'
type TriggeredByFilter = 'all' | 'manual' | 'scheduled'

export function HistoryView({ runs, onRefresh }: HistoryViewProps) {
  const [modeFilter, setModeFilter] = useState<RunModeFilter>('all')
  const [typeFilter, setTypeFilter] = useState<RunTypeFilter>('all')
  const [triggeredByFilter, setTriggeredByFilter] = useState<TriggeredByFilter>('all')
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (modeFilter !== 'all' && run.run_mode !== modeFilter) return false
      if (typeFilter !== 'all' && run.run_type !== typeFilter) return false
      if (triggeredByFilter !== 'all' && run.triggered_by !== triggeredByFilter) return false
      return true
    })
  }, [runs, modeFilter, typeFilter, triggeredByFilter])

  const toggleRun = (runId: string) => {
    const next = new Set(expandedRuns)
    if (next.has(runId)) {
      next.delete(runId)
    } else {
      next.add(runId)
    }
    setExpandedRuns(next)
  }

  const toggleResult = (key: string) => {
    const next = new Set(expandedResults)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setExpandedResults(next)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }

  const getPassRate = (run: ComplianceTestRun) => {
    if (run.summary.totalProperties === 0) return 0
    return Math.round((run.summary.passed / run.summary.totalProperties) * 100)
  }

  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-400'
    if (rate >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  const getPassRateBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-400'
    if (rate >= 70) return 'bg-amber-400'
    return 'bg-red-400'
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
  if (runs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No test runs yet. Run a test from the Suite Runner tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Mode:</span>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as RunModeFilter)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
          >
            <option value="all">All</option>
            <option value="snapshot">Snapshot</option>
            <option value="full-pipeline">Full Pipeline</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as RunTypeFilter)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
          >
            <option value="all">All</option>
            <option value="full-suite">Full Suite</option>
            <option value="single-state">Single State</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Triggered:</span>
          <select
            value={triggeredByFilter}
            onChange={(e) => setTriggeredByFilter(e.target.value as TriggeredByFilter)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
          >
            <option value="all">All</option>
            <option value="manual">Manual</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredRuns.length} of {runs.length} runs
        </div>
      </div>

      {/* Filtered empty state */}
      {filteredRuns.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No runs match the selected filters.</p>
        </div>
      )}

      {/* Runs list */}
      <div className="space-y-3">
        {filteredRuns.map((run) => {
          const passRate = getPassRate(run)
          const isExpanded = expandedRuns.has(run.id)

          return (
            <div key={run.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Run header - clickable */}
              <button
                onClick={() => toggleRun(run.id)}
                className="w-full text-left px-4 py-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Expand icon */}
                  <div className="pt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: date + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(run.run_at)}
                      </span>

                      {/* Mode badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          run.run_mode === 'snapshot'
                            ? 'bg-purple-400/10 text-purple-400'
                            : 'bg-blue-400/10 text-blue-400'
                        }`}
                      >
                        {run.run_mode === 'snapshot' ? 'Snapshot' : 'Full Pipeline'}
                      </span>

                      {/* Type badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
                        {run.run_type === 'full-suite' ? 'Full Suite' : run.state || 'Single State'}
                      </span>

                      {/* Triggered by badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          run.triggered_by === 'scheduled'
                            ? 'bg-cyan-400/10 text-cyan-400'
                            : 'bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        {run.triggered_by}
                      </span>
                    </div>

                    {/* Pass rate bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden max-w-xs">
                        <div
                          className={`h-full rounded-full transition-all ${getPassRateBarColor(passRate)}`}
                          style={{ width: `${passRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${getPassRateColor(passRate)}`}>
                        {passRate}%
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">{run.summary.totalProperties}</span> properties
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-green-400 font-medium">{run.summary.passed}</span> passed
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-red-400 font-medium">{run.summary.failed}</span> failed
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-amber-400 font-medium">{run.summary.totalViolationsFound}</span> violations
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-blue-400 font-medium">{run.summary.totalAutoFixes}</span> auto-fixes
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(run.duration_ms)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded run detail */}
              {isExpanded && (
                <div className="border-t border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b border-border">
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
                        {run.results.map((result: PropertyTestResult) => {
                          const resultKey = `${run.id}-${result.propertyId}`
                          const hasDetails =
                            result.complianceResult.violations.length > 0 ||
                            result.complianceResult.autoFixes.length > 0 ||
                            !!result.generatedText
                          const isResultExpanded = expandedResults.has(resultKey)

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
                                      onClick={() => toggleResult(resultKey)}
                                      className="p-1 hover:bg-accent rounded transition-colors"
                                    >
                                      {isResultExpanded ? (
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

                              {/* Expanded result detail */}
                              {isResultExpanded && hasDetails && (
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
                                                        {fix.category} &bull; {fix.platform}
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

                                      {/* Generated text */}
                                      {result.generatedText && (
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
        })}
      </div>
    </div>
  )
}
