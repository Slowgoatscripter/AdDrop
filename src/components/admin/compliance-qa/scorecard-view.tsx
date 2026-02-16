'use client'

import { CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp, AlertCircle, Activity } from 'lucide-react'
import type { ComplianceTestProperty, ComplianceTestRun, RunSummary, TestRunMode } from '@/lib/types/compliance-qa'

interface ScorecardViewProps {
  properties: ComplianceTestProperty[]
  runs: ComplianceTestRun[]
}

interface StateHealthData {
  state: string
  propertyCount: number
  passRate: number | null
  riskCategoryCoverage: string
  lastRunTime: string | null
  status: 'excellent' | 'warning' | 'critical' | 'no-data'
}

interface StatusStyle {
  borderColor: string
  bgColor: string
  textColor: string
  progressColor: string
  icon: typeof CheckCircle
}

const ALL_RISK_CATEGORIES = [
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
] as const

function getStatusColor(passRate: number | null): StatusStyle {
  if (passRate === null) {
    return {
      borderColor: 'border-border',
      bgColor: 'bg-muted/20',
      textColor: 'text-muted-foreground',
      progressColor: 'bg-muted',
      icon: AlertCircle,
    }
  }

  if (passRate >= 95) {
    return {
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-600',
      progressColor: 'bg-emerald-500',
      icon: CheckCircle,
    }
  }

  if (passRate >= 80) {
    return {
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600',
      progressColor: 'bg-amber-500',
      icon: AlertTriangle,
    }
  }

  return {
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600',
    progressColor: 'bg-red-500',
    icon: XCircle,
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const past = new Date(dateStr)
  const diffMs = now.getTime() - past.getTime()

  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return `${days}d ago`
}

function getModeBadge(mode: TestRunMode) {
  if (mode === 'snapshot') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-600 border border-purple-500/20">
        Snapshot
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-600 border border-blue-500/20">
      Full Pipeline
    </span>
  )
}

function getTriggeredByBadge(triggeredBy: 'manual' | 'scheduled') {
  if (triggeredBy === 'manual') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        Manual
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      Scheduled
    </span>
  )
}

export function ScorecardView({ properties, runs }: ScorecardViewProps) {
  // --- Overall banner data ---
  const lastRun = runs
    .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())[0]

  const lastRunPassRate = lastRun
    ? (lastRun.summary.passed / lastRun.summary.totalProperties) * 100
    : null

  // --- State health data ---
  const propertiesByState = properties.reduce((acc, prop) => {
    if (!acc[prop.state]) acc[prop.state] = []
    acc[prop.state].push(prop)
    return acc
  }, {} as Record<string, ComplianceTestProperty[]>)

  const stateHealthData: StateHealthData[] = Object.entries(propertiesByState).map(([state, stateProps]) => {
    // Find most recent run covering this state (single-state for this state, or full-suite)
    const stateRuns = runs
      .filter(r => (r.run_type === 'single-state' && r.state === state) || r.run_type === 'full-suite')
      .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())

    const latestRun = stateRuns[0]

    let passRate: number | null = null
    let status: StateHealthData['status'] = 'no-data'

    if (latestRun) {
      // For full-suite runs, filter results to this state
      const stateResults = latestRun.results.filter(r => r.state === state)
      if (stateResults.length > 0) {
        const passed = stateResults.filter(r => r.passed).length
        passRate = (passed / stateResults.length) * 100

        if (passRate >= 95) status = 'excellent'
        else if (passRate >= 80) status = 'warning'
        else status = 'critical'
      }
    }

    // Calculate risk category coverage
    const coveredCategories = new Set(stateProps.map(p => p.risk_category))
    const riskCategoryCoverage = `${coveredCategories.size}/${ALL_RISK_CATEGORIES.length} categories`

    return {
      state,
      propertyCount: stateProps.length,
      passRate,
      riskCategoryCoverage,
      lastRunTime: latestRun?.run_at ?? null,
      status,
    }
  }).sort((a, b) => a.state.localeCompare(b.state))

  // --- Mode comparison data ---
  const snapshotRuns = runs
    .filter(r => r.run_mode === 'snapshot')
    .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())

  const pipelineRuns = runs
    .filter(r => r.run_mode === 'full-pipeline')
    .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())

  const latestSnapshot = snapshotRuns[0]
  const latestPipeline = pipelineRuns[0]

  const snapshotPassRate = latestSnapshot
    ? (latestSnapshot.summary.passed / latestSnapshot.summary.totalProperties) * 100
    : null

  const pipelinePassRate = latestPipeline
    ? (latestPipeline.summary.passed / latestPipeline.summary.totalProperties) * 100
    : null

  const hasBothModes = snapshotPassRate !== null && pipelinePassRate !== null
  const driftDetected = hasBothModes && (snapshotPassRate! - pipelinePassRate!) > 5

  // --- Coverage gaps ---
  const allCoveredCategories = new Set(properties.map(p => p.risk_category))
  const missingCategories = ALL_RISK_CATEGORIES.filter(cat => !allCoveredCategories.has(cat))

  // --- Recent runs trend (last 10) ---
  const recentRuns = runs
    .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Section 1: Overall Banner */}
      <div className="rounded-lg border border-border bg-card p-5">
        {lastRun ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Last Run</p>
                  {getModeBadge(lastRun.run_mode)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTimeAgo(lastRun.run_at)} &bull; {(lastRun.duration_ms / 1000).toFixed(1)}s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className={`text-3xl font-bold ${getStatusColor(lastRunPassRate).textColor}`}>
                  {lastRunPassRate?.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">pass rate</p>
              </div>

              <div className="h-10 w-px bg-border" />

              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {lastRun.summary.totalViolationsFound}
                </p>
                <p className="text-xs text-muted-foreground">violations</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {lastRun.summary.totalAutoFixes}
                </p>
                <p className="text-xs text-muted-foreground">auto-fixes</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No runs yet</p>
          </div>
        )}
      </div>

      {/* Section 2: State Health Cards Grid */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          State Health
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stateHealthData.map((data) => {
            const style = getStatusColor(data.passRate)
            const Icon = style.icon

            return (
              <div
                key={data.state}
                className={`rounded-lg border p-4 ${style.borderColor} ${style.bgColor}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-bold">{data.state}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {data.propertyCount} test {data.propertyCount === 1 ? 'property' : 'properties'}
                    </p>
                  </div>
                  <Icon className={`h-5 w-5 ${style.textColor}`} />
                </div>

                {data.passRate !== null ? (
                  <>
                    <div className="mb-2">
                      <p className={`text-3xl font-bold ${style.textColor}`}>
                        {data.passRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">pass rate</p>
                    </div>

                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${style.progressColor}`}
                        style={{ width: `${data.passRate}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{data.riskCategoryCoverage}</span>
                      <span className="text-muted-foreground">
                        {data.lastRunTime ? formatTimeAgo(data.lastRunTime) : 'No runs'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">{data.riskCategoryCoverage}</p>
                    <p className="text-xs text-muted-foreground">No runs yet</p>
                  </div>
                )}
              </div>
            )
          })}

          {stateHealthData.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
              No test properties found. Add properties to see state health data.
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Mode Comparison */}
      {hasBothModes && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Mode Comparison</h3>
            {driftDetected && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/15 text-red-600 border border-red-500/20">
                Drift Detected
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Snapshot */}
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                {getModeBadge('snapshot')}
                <span className="text-xs text-muted-foreground">
                  {latestSnapshot ? formatTimeAgo(latestSnapshot.run_at) : ''}
                </span>
              </div>
              <p className={`text-3xl font-bold ${getStatusColor(snapshotPassRate).textColor}`}>
                {snapshotPassRate!.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">pass rate</p>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-2">
                <div
                  className="h-full rounded-full transition-all bg-purple-500"
                  style={{ width: `${snapshotPassRate}%` }}
                />
              </div>
            </div>

            {/* Full Pipeline */}
            <div className={`rounded-lg border p-4 ${driftDetected ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {getModeBadge('full-pipeline')}
                <span className="text-xs text-muted-foreground">
                  {latestPipeline ? formatTimeAgo(latestPipeline.run_at) : ''}
                </span>
              </div>
              <p className={`text-3xl font-bold ${driftDetected ? 'text-red-600' : getStatusColor(pipelinePassRate).textColor}`}>
                {pipelinePassRate!.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">pass rate</p>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all ${driftDetected ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${pipelinePassRate}%` }}
                />
              </div>
              {driftDetected && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {(snapshotPassRate! - pipelinePassRate!).toFixed(1)}% below snapshot rate
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Coverage Gaps */}
      {missingCategories.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">Coverage Gaps</h3>
              <p className="text-sm text-amber-800 mb-3">
                The following risk categories have no test properties yet:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-200/60 text-amber-900 border border-amber-400/30"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Recent Runs Trend */}
      {recentRuns.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Recent Runs</h3>
            <span className="text-xs text-muted-foreground">Last {recentRuns.length}</span>
          </div>

          <div className="space-y-3">
            {recentRuns.map((run) => {
              const passRate = run.summary.totalProperties > 0
                ? (run.summary.passed / run.summary.totalProperties) * 100
                : 0
              const style = getStatusColor(passRate)

              return (
                <div key={run.id} className="flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {run.run_type === 'full-suite' ? 'Full Suite' : run.state}
                      </span>
                      {getModeBadge(run.run_mode)}
                      {getTriggeredByBadge(run.triggered_by)}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(run.run_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${style.progressColor}`}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                    <span className={`font-medium min-w-[3rem] text-right ${style.textColor}`}>
                      {passRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
