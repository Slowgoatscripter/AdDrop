'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { saveSettings, resetSettings } from '@/app/admin/settings/actions'

const CATEGORIES = [
  { key: 'steering', label: 'Steering' },
  { key: 'familial-status', label: 'Familial Status' },
  { key: 'disability', label: 'Disability' },
  { key: 'race-color-national-origin', label: 'Race, Color & National Origin' },
  { key: 'religion', label: 'Religion' },
  { key: 'sex-gender', label: 'Sex & Gender' },
  { key: 'age', label: 'Age' },
  { key: 'marital-status', label: 'Marital Status' },
  { key: 'political-beliefs', label: 'Political Beliefs' },
  { key: 'economic-exclusion', label: 'Economic Exclusion' },
  { key: 'misleading-claims', label: 'Misleading Claims' },
] as const

interface ComplianceSettingsFormProps {
  settings: Record<string, unknown>
}

export function ComplianceSettingsForm({ settings }: ComplianceSettingsFormProps) {
  const [enabled, setEnabled] = useState(settings['compliance.enabled'] as boolean)
  const [state, setState] = useState(settings['compliance.state'] as string)
  const [maxDescLength, setMaxDescLength] = useState(settings['compliance.max_description_length'] as number)
  const [categories, setCategories] = useState<string[]>(settings['compliance.categories'] as string[])
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings({
          'compliance.enabled': enabled,
          'compliance.state': state,
          'compliance.max_description_length': maxDescLength,
          'compliance.categories': categories,
        })
        setMessage({ type: 'success', text: 'Compliance settings saved.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset all compliance settings to defaults?')) return
    startTransition(async () => {
      try {
        await resetSettings([
          'compliance.enabled', 'compliance.state',
          'compliance.max_description_length', 'compliance.categories',
        ])
        window.location.reload()
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' })
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'

  return (
    <div className="space-y-6 max-w-xl">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Enable Compliance Checking</p>
          <p className="text-xs text-muted-foreground">Scan generated ads for fair housing violations</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-gold' : 'bg-muted-foreground/30'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`} />
        </button>
      </div>

      {/* Warning when disabled */}
      {!enabled && (
        <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-400">
            Disabling compliance removes fair housing protection from all generated ads. Proceed with caution.
          </p>
        </div>
      )}

      {/* Rest of form - disabled when compliance is off */}
      <div className={!enabled ? 'opacity-40 pointer-events-none' : ''}>
        {/* State */}
        <div className="mb-6">
          <label className={labelClass}>State</label>
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="MT">Montana</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">More states coming soon.</p>
        </div>

        {/* Max Description Length */}
        <div className="mb-6">
          <label className={labelClass}>Max Description Length</label>
          <input
            className={inputClass}
            type="number"
            min={100}
            max={10000}
            value={maxDescLength}
            onChange={(e) => setMaxDescLength(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground mt-1">Character limit for MLS descriptions. Default: 1000</p>
        </div>

        {/* Category toggles */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Protected Categories</p>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const isActive = categories.includes(cat.key)
              return (
                <div key={cat.key} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                  <span className="text-sm text-foreground">{cat.label}</span>
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      isActive ? 'bg-gold' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Compliance Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
