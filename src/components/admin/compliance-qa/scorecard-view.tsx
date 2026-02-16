'use client'

import { CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react'
// TODO: update for new compliance QA types (Task 16)
import type { ComplianceTestRun, RunSummary } from '@/lib/types/compliance-qa'
import type { ViolationCategory } from '@/lib/types/compliance'

interface ScorecardViewProps {
  ads: any[]
  runs: ComplianceTestRun[]
}

interface StateHealthData {
  state: string
  adCount: number
  passRate: number | null
  categoryCoverage: string
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

function getStatusColor(passRate: number | null): StatusStyle {
  if (passRate === null) {
    return {
      borderColor: 'border-border',
      bgColor: 'bg-muted/20',
      textColor: 'text-muted-foreground',
      progressColor: 'bg-muted',
      icon: AlertCircle
    }
  }

  if (passRate >= 95) {
    return {
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-600',
      progressColor: 'bg-emerald-500',
      icon: CheckCircle
    }
  }

  if (passRate >= 80) {
    return {
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600',
      progressColor: 'bg-amber-500',
      icon: AlertTriangle
    }
  }

  return {
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600',
    progressColor: 'bg-red-500',
    icon: XCircle
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

function getAllCategories(): ViolationCategory[] {
  return [
    'steering',
    'familial-status',
    'disability',
    'race-color-national-origin',
    'religion',
    'sex-gender',
    'age',
    'marital-status',
    'political-beliefs',
    'economic-exclusion',
    'misleading-claims'
  ]
}

export function ScorecardView({ ads, runs }: ScorecardViewProps) {
  // Find last full-suite run
  const lastFullSuiteRun = runs
    .filter(r => r.run_type === 'full-suite')
    .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())[0]

  const fullSuitePassRate = lastFullSuiteRun
    ? ((lastFullSuiteRun.summary as RunSummary).passed / (lastFullSuiteRun.summary as RunSummary).totalProperties) * 100
    : null

  // Build state health data
  const statesByState = ads.reduce((acc, ad) => {
    if (!acc[ad.state]) acc[ad.state] = []
    acc[ad.state].push(ad)
    return acc
  }, {} as Record<string, any[]>)

  const stateHealthData: StateHealthData[] = (Object.entries(statesByState) as [string, any[]][]).map(([state, stateAds]) => {
    // Find most recent single-state run for this state
    const stateRuns = runs
      .filter(r => r.run_type === 'single-state' && r.state === state)
      .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())

    const lastRun = stateRuns[0]

    let passRate: number | null = null
    let status: StateHealthData['status'] = 'no-data'

    if (lastRun) {
      const summary = lastRun.summary as RunSummary
      passRate = (summary.passed / summary.totalProperties) * 100

      if (passRate >= 95) status = 'excellent'
      else if (passRate >= 80) status = 'warning'
      else status = 'critical'
    }

    // Calculate category coverage
    const allCategories = getAllCategories()
    const coveredCategories = new Set(
      stateAds.flatMap((ad: any) => ad.expected_violations.map((v: any) => v.category))
    )
    const categoryCoverage = `${coveredCategories.size}/${allCategories.length} categories`

    return {
      state,
      adCount: stateAds.length,
      passRate,
      categoryCoverage,
      lastRunTime: lastRun?.run_at ?? null,
      status
    }
  }).sort((a, b) => a.state.localeCompare(b.state))

  // Find coverage gaps
  const coverageGaps: Array<{ state: string; missingCategories: ViolationCategory[] }> = [];

  (Object.entries(statesByState) as [string, any[]][]).forEach(([state, stateAds]) => {
    const allCategories = getAllCategories()
    const coveredCategories = new Set(
      stateAds.flatMap((ad: any) => ad.expected_violations.map((v: any) => v.category))
    )

    const missing = allCategories.filter(cat => !coveredCategories.has(cat))
    if (missing.length > 0) {
      coverageGaps.push({ state, missingCategories: missing })
    }
  })

  // Recent runs trend (last 10 runs)
  const recentRuns = runs
    .filter(r => r.run_type === 'full-suite' || r.run_type === 'single-state')
    .sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Overall banner */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            {lastFullSuiteRun ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Last Full Suite Run</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(lastFullSuiteRun.run_at)} • {lastFullSuiteRun.duration_ms ? `${(lastFullSuiteRun.duration_ms / 1000).toFixed(1)}s` : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: getStatusColor(fullSuitePassRate).textColor.replace('text-', '') }}>
                    {fullSuitePassRate?.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">pass rate</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No full suite runs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* State health cards grid */}
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
                    {data.adCount} test {data.adCount === 1 ? 'ad' : 'ads'}
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
                    <span className="text-muted-foreground">{data.categoryCoverage}</span>
                    <span className="text-muted-foreground">
                      {data.lastRunTime ? formatTimeAgo(data.lastRunTime) : 'No runs'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">{data.categoryCoverage}</p>
                  <p className="text-xs text-muted-foreground">No runs yet</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Coverage gaps */}
      {coverageGaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">Coverage Gaps</h3>
              <div className="space-y-2">
                {coverageGaps.map(({ state, missingCategories }) => (
                  <div key={state} className="text-sm">
                    <span className="font-medium text-amber-900">{state}:</span>{' '}
                    <span className="text-amber-800">
                      {missingCategories.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent runs trend */}
      {recentRuns.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Recent Runs</h3>
          </div>

          <div className="space-y-3">
            {recentRuns.map((run) => {
              const summary = run.summary as RunSummary
              const passRate = (summary.passed / summary.totalProperties) * 100
              const style = getStatusColor(passRate)

              return (
                <div key={run.id} className="flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {run.run_type === 'full-suite' ? 'Full Suite' : run.state}
                      </span>
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
