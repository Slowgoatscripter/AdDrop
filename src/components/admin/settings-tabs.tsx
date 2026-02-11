'use client'

import { useState } from 'react'
import { Cpu, ShieldCheck, Layout } from 'lucide-react'
import { AISettingsForm } from './ai-settings-form'
import { ComplianceSettingsForm } from './compliance-settings-form'
import { LandingSettingsForm } from './landing-settings-form'

const tabs = [
  { id: 'ai', label: 'AI Settings', icon: Cpu },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'landing', label: 'Landing Page', icon: Layout },
] as const

type TabId = (typeof tabs)[number]['id']

interface SettingsTabsProps {
  settings: Record<string, unknown>
}

export function SettingsTabs({ settings }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ai')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
      {activeTab === 'ai' && <AISettingsForm settings={settings} />}
      {activeTab === 'compliance' && <ComplianceSettingsForm settings={settings} />}
      {activeTab === 'landing' && <LandingSettingsForm settings={settings} />}
    </div>
  )
}
