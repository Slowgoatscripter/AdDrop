'use client'

import { useState } from 'react'
import { FlaskConical, Database, Play, BarChart3, History } from 'lucide-react'
import type { ComplianceTestProperty, ComplianceTestRun } from '@/lib/types/compliance-qa'
import { ScannerView } from './scanner-view'
import { CorpusView } from './corpus-view'
import { RunnerView } from './runner-view'
import { ScorecardView } from './scorecard-view'
import { HistoryView } from './history-view'

const tabs = [
  { id: 'scanner', label: 'Ad Hoc Scanner', icon: FlaskConical },
  { id: 'corpus', label: 'Properties', icon: Database },
  { id: 'runner', label: 'Suite Runner', icon: Play },
  { id: 'scorecard', label: 'Scorecard', icon: BarChart3 },
  { id: 'history', label: 'Run History', icon: History },
] as const

type TabId = (typeof tabs)[number]['id']

interface QATabsProps {
  initialProperties: ComplianceTestProperty[]
  initialRuns: ComplianceTestRun[]
}

export function QATabs({ initialProperties, initialRuns }: QATabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scanner')
  const [properties, setProperties] = useState(initialProperties)
  const [runs, setRuns] = useState(initialRuns)

  const refreshProperties = async () => {
    const res = await fetch('/api/admin/compliance-qa/corpus')
    if (res.ok) {
      const data = await res.json()
      setProperties(data.properties)
    }
  }

  const refreshRuns = async () => {
    const res = await fetch('/api/admin/compliance-qa/runs')
    if (res.ok) {
      const data = await res.json()
      setRuns(data.runs)
    }
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'scanner' && <ScannerView />}
      {activeTab === 'corpus' && (
        <CorpusView
          properties={properties}
          onDelete={async (id) => {
            await fetch(`/api/admin/compliance-qa/corpus/${id}`, { method: 'DELETE' })
            await refreshProperties()
          }}
          onDuplicate={async (property) => {
            await fetch('/api/admin/compliance-qa/corpus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${property.name} (copy)`,
                state: property.state,
                listing_data: property.listing_data,
                risk_category: property.risk_category,
                tags: property.tags,
              }),
            })
            await refreshProperties()
          }}
          onRefresh={refreshProperties}
        />
      )}
      {activeTab === 'runner' && (
        <RunnerView
          properties={properties}
          onRunComplete={refreshRuns}
        />
      )}
      {activeTab === 'scorecard' && (
        <ScorecardView properties={properties} runs={runs} />
      )}
      {activeTab === 'history' && (
        <HistoryView runs={runs} onRefresh={refreshRuns} />
      )}
    </div>
  )
}
