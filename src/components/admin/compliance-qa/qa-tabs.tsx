'use client'

import { useState } from 'react'
import { FlaskConical, Database, Play, BarChart3 } from 'lucide-react'
// TODO: update for new compliance QA types (Task 12)
import type { ComplianceTestRun } from '@/lib/types/compliance-qa'
import { ScannerView } from './scanner-view'
import { CorpusView } from './corpus-view'
import { RunnerView } from './runner-view'
import { ScorecardView } from './scorecard-view'

const tabs = [
  { id: 'scanner', label: 'Ad Hoc Scanner', icon: FlaskConical },
  { id: 'corpus', label: 'Test Corpus', icon: Database },
  { id: 'runner', label: 'Suite Runner', icon: Play },
  { id: 'scorecard', label: 'Scorecard', icon: BarChart3 },
] as const

type TabId = (typeof tabs)[number]['id']

interface QATabsProps {
  initialAds: any[]
  initialRuns: ComplianceTestRun[]
}

export function QATabs({ initialAds, initialRuns }: QATabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scanner')
  const [ads, setAds] = useState(initialAds)
  const [runs, setRuns] = useState(initialRuns)

  const refreshAds = async () => {
    const res = await fetch('/api/admin/compliance-qa/corpus')
    if (res.ok) {
      const data = await res.json()
      setAds(data.ads)
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
      {activeTab === 'scanner' && (
        <ScannerView
          onSaveToCorpus={async (ad) => {
            const res = await fetch('/api/admin/compliance-qa/corpus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ad),
            })
            if (!res.ok) throw new Error('Failed to save')
            await refreshAds()
          }}
        />
      )}
      {activeTab === 'corpus' && (
        <CorpusView
          ads={ads}
          onDelete={async (id) => {
            await fetch(`/api/admin/compliance-qa/corpus/${id}`, { method: 'DELETE' })
            await refreshAds()
          }}
          onDuplicate={async (ad) => {
            await fetch('/api/admin/compliance-qa/corpus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                state: ad.state,
                name: `${ad.name} (copy)`,
                text: ad.text,
                expected_violations: ad.expected_violations,
                is_clean: ad.is_clean,
                tags: ad.tags,
                source: ad.source,
              }),
            })
            await refreshAds()
          }}
          onRefresh={refreshAds}
        />
      )}
      {activeTab === 'runner' && (
        <RunnerView
          ads={ads}
          onRunComplete={refreshRuns}
        />
      )}
      {activeTab === 'scorecard' && (
        <ScorecardView ads={ads} runs={runs} />
      )}
    </div>
  )
}
