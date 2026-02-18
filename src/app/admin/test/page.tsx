'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FlaskConical, Loader2, RotateCcw } from 'lucide-react'
import { PresetCard } from '@/components/admin/preset-card'
import { PresetForm } from '@/components/admin/preset-form'
import { getPresets, createPreset, updatePreset, deletePreset, reseedPresets } from './actions'
import type { TestPreset } from '@/lib/types/preset'
import type { ListingData } from '@/lib/types/listing'

export default function TestBenchPage() {
  const router = useRouter()
  const [presets, setPresets] = useState<TestPreset[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPreset, setEditingPreset] = useState<TestPreset | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [reseeding, setReseeding] = useState(false)

  useEffect(() => {
    loadPresets()
  }, [])

  async function loadPresets() {
    try {
      const data = await getPresets()
      setPresets(data as TestPreset[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presets')
    }
  }

  function handleEdit(preset: TestPreset) {
    setEditingPreset(preset)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this preset?')) return
    startTransition(async () => {
      try {
        await deletePreset(id)
        if (selectedId === id) setSelectedId(null)
        await loadPresets()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  function handleSave(name: string, listingData: ListingData) {
    startTransition(async () => {
      try {
        if (editingPreset) {
          await updatePreset(editingPreset.id, name, listingData)
        } else {
          await createPreset(name, listingData)
        }
        setShowForm(false)
        setEditingPreset(null)
        await loadPresets()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  async function handleReseed() {
    if (!confirm('This will delete all your current presets and replace them with the Montana defaults. Continue?')) return
    setReseeding(true)
    setError(null)
    try {
      await reseedPresets()
      setSelectedId(null)
      await loadPresets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reseed presets')
    } finally {
      setReseeding(false)
    }
  }

  async function handleGenerate() {
    const preset = presets.find((p) => p.id === selectedId)
    if (!preset) return

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing: preset.listing_data }),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Generation failed')

      router.push(`/campaign/${json.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  const selectedPreset = presets.find((p) => p.id === selectedId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Workflow Test Bench</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a preset and generate a campaign without re-entering property data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReseed}
            disabled={reseeding}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${reseeding ? 'animate-spin' : ''}`} />
            {reseeding ? 'Reseeding...' : 'Reseed Defaults'}
          </button>
          <button
            onClick={() => { setEditingPreset(null); setShowForm(true) }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Preset
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <PresetForm
            preset={editingPreset}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingPreset(null) }}
          />
        </div>
      )}

      {/* Preset grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={selectedId === preset.id}
            onSelect={() => setSelectedId(preset.id)}
            onEdit={() => handleEdit(preset)}
            onDelete={() => handleDelete(preset.id)}
          />
        ))}
        {presets.length === 0 && !showForm && (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
            No presets yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Generate section */}
      {selectedPreset && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedPreset.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${(selectedPreset.listing_data.price ?? 0).toLocaleString()} &middot;{' '}
                {selectedPreset.listing_data.beds ?? 0}bd/{selectedPreset.listing_data.baths ?? 0}ba &middot;{' '}
                {selectedPreset.listing_data.address.city}, {selectedPreset.listing_data.address.state}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" />
                  Generate Campaign
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
