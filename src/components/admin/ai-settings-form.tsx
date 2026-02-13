'use client'

import { useState, useTransition } from 'react'
import { saveSettings, resetSettings } from '@/app/admin/settings/actions'

interface AISettingsFormProps {
  settings: Record<string, unknown>
}

export function AISettingsForm({ settings }: AISettingsFormProps) {
  const [model, setModel] = useState(settings['ai.model'] as string)
  const [temperature, setTemperature] = useState(settings['ai.temperature'] as number)
  const [maxTokens, setMaxTokens] = useState(settings['ai.max_tokens'] as number)
  const [qualityModel, setQualityModel] = useState(settings['ai.quality_model'] as string)
  const [qualityTemp, setQualityTemp] = useState(settings['ai.quality_temperature'] as number)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings({
          'ai.model': model,
          'ai.temperature': temperature,
          'ai.max_tokens': maxTokens,
          'ai.quality_model': qualityModel,
          'ai.quality_temperature': qualityTemp,
        })
        setMessage({ type: 'success', text: 'AI settings saved.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset all AI settings to defaults?')) return
    startTransition(async () => {
      try {
        await resetSettings([
          'ai.model', 'ai.temperature', 'ai.max_tokens',
          'ai.quality_model', 'ai.quality_temperature',
        ])
        // Reload page to get fresh defaults
        window.location.reload()
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' })
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'
  const hintClass = 'text-xs text-muted-foreground mt-1'

  return (
    <div className="space-y-6 max-w-xl">
      {/* Generation Model */}
      <div>
        <label className={labelClass}>Generation Model</label>
        <select className={inputClass} value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="gpt-5.2">GPT-5.2</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
        </select>
        <p className={hintClass}>The model used for generating ad copy.</p>
      </div>

      {/* Temperature */}
      <div>
        <label className={labelClass}>
          Temperature: <span className="text-gold">{temperature}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full accent-gold"
        />
        <p className={hintClass}>Higher = more creative. Lower = more consistent. Default: 0.7</p>
      </div>

      {/* Max Tokens */}
      <div>
        <label className={labelClass}>Max Tokens</label>
        <input
          className={inputClass}
          type="number"
          min={1000}
          max={32000}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
        />
        <p className={hintClass}>Maximum output length. Higher = longer ads. Default: 16000</p>
      </div>

      {/* Quality Model */}
      <div>
        <label className={labelClass}>Quality Scoring Model</label>
        <select className={inputClass} value={qualityModel} onChange={(e) => setQualityModel(e.target.value)}>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4o">GPT-4o</option>
        </select>
        <p className={hintClass}>Used for quality scoring and auto-fix. Cheaper model recommended.</p>
      </div>

      {/* Quality Temperature */}
      <div>
        <label className={labelClass}>
          Quality Temperature: <span className="text-gold">{qualityTemp}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1.0"
          step="0.1"
          value={qualityTemp}
          onChange={(e) => setQualityTemp(parseFloat(e.target.value))}
          className="w-full accent-gold"
        />
        <p className={hintClass}>Lower is better for quality analysis. Default: 0.3</p>
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
          {isPending ? 'Saving...' : 'Save AI Settings'}
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
