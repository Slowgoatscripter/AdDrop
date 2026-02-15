'use client'

import { useState } from 'react'
import { FlaskConical, Database, Play, BarChart3 } from 'lucide-react'
import type { ComplianceTestAd, ComplianceTestRun } from '@/lib/types/compliance-qa'

const tabs = [
  { id: 'scanner', label: 'Ad Hoc Scanner', icon: FlaskConical },
  { id: 'corpus', label: 'Test Corpus', icon: Database },
  { id: 'runner', label: 'Suite Runner', icon: Play },
  { id: 'scorecard', label: 'Scorecard', icon: BarChart3 },
] as const

type TabId = (typeof tabs)[number]['id']

interface QATabsProps {
  initialAds: ComplianceTestAd[]
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

      {/* Tab content — placeholders until Tasks 7-10 */}
      {activeTab === 'scanner' && (
        <div className="text-muted-foreground text-sm">Scanner view — loading...</div>
      )}
      {activeTab === 'corpus' && (
        <div className="text-muted-foreground text-sm">Corpus view — loading...</div>
      )}
      {activeTab === 'runner' && (
        <div className="text-muted-foreground text-sm">Runner view — loading...</div>
      )}
      {activeTab === 'scorecard' && (
        <div className="text-muted-foreground text-sm">Scorecard view — loading...</div>
      )}
    </div>
  )
}
