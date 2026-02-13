# AI Workflow Test Bench — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin page where admins can manage test property presets and fire the AI generation workflow with one click, reusing the existing campaign results page.

**Architecture:** New `/admin/test` page with preset CRUD via Supabase `test_presets` table. On "Generate", calls `/api/generate` with preset data, stores result in sessionStorage, and navigates to `/campaign/[id]` — identical to the existing flow in `mls-input-form.tsx`.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres + RLS), Tailwind CSS, Lucide icons, TypeScript

---

### Task 1: Create TestPreset type

**Files:**
- Create: `src/lib/types/preset.ts`

**Step 1: Write the type definition**

```ts
import type { ListingData } from './listing'

export interface TestPreset {
  id: string
  name: string
  listing_data: ListingData
  created_by: string
  created_at: string
  updated_at: string
}
```

**Step 2: Commit**

```bash
git add src/lib/types/preset.ts
git commit -m "feat(test-bench): add TestPreset type definition"
```

---

### Task 2: Create Supabase migration for test_presets table

**Files:**
- Create: `supabase/migrations/20260209_create_test_presets.sql`

**Step 1: Write the migration**

```sql
-- Create test_presets table for admin AI workflow testing
CREATE TABLE IF NOT EXISTS test_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  listing_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: admin-only access
ALTER TABLE test_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read test presets"
  ON test_presets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert test presets"
  ON test_presets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update test presets"
  ON test_presets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete test presets"
  ON test_presets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed with 3 default presets
INSERT INTO test_presets (name, listing_data) VALUES
(
  'Luxury Bozeman Home',
  '{
    "url": "",
    "address": {
      "street": "2847 Bridger Hills Dr",
      "city": "Bozeman",
      "state": "MT",
      "zip": "59715",
      "neighborhood": "Bridger Hills"
    },
    "price": 850000,
    "beds": 4,
    "baths": 3,
    "sqft": 2800,
    "yearBuilt": 2019,
    "propertyType": "Single Family",
    "features": ["Mountain views", "Gourmet kitchen", "Heated 3-car garage", "Home office", "Stone fireplace", "Hardwood floors"],
    "description": "Stunning custom-built home nestled in Bridger Hills with panoramic mountain views. Chef-grade kitchen with quartz countertops and Wolf appliances. Spacious primary suite with private balcony overlooking the Gallatin Valley. Heated three-car garage and professionally landscaped yard.",
    "photos": ["https://placehold.co/800x600?text=Luxury+Home+Front", "https://placehold.co/800x600?text=Kitchen", "https://placehold.co/800x600?text=Mountain+View"],
    "sellingPoints": ["Unobstructed mountain views from every room", "Chef-grade Wolf/Sub-Zero kitchen", "Minutes from downtown Bozeman"]
  }'::jsonb
),
(
  'Starter Condo in Missoula',
  '{
    "url": "",
    "address": {
      "street": "415 River Rd Unit 204",
      "city": "Missoula",
      "state": "MT",
      "zip": "59801"
    },
    "price": 275000,
    "beds": 2,
    "baths": 1,
    "sqft": 950,
    "yearBuilt": 2015,
    "propertyType": "Condo",
    "features": ["Updated appliances", "Community pool", "In-unit laundry", "Covered parking", "Close to University of Montana"],
    "description": "Move-in ready condo just minutes from the University of Montana campus and downtown Missoula. Updated stainless steel appliances, in-unit washer and dryer, and a private covered parking spot. Community amenities include pool and fitness center.",
    "photos": ["https://placehold.co/800x600?text=Condo+Exterior", "https://placehold.co/800x600?text=Living+Room"],
    "sellingPoints": ["Walk to UM campus and downtown", "Low HOA with pool and gym", "Move-in ready"]
  }'::jsonb
),
(
  'Rural Ranch in Helena',
  '{
    "url": "",
    "address": {
      "street": "8901 Canyon Ferry Rd",
      "city": "Helena",
      "state": "MT",
      "zip": "59602"
    },
    "price": 525000,
    "beds": 3,
    "baths": 2,
    "sqft": 1600,
    "lotSize": "5 acres",
    "yearBuilt": 1998,
    "propertyType": "Ranch",
    "features": ["5 acres", "Horse-ready corrals", "Workshop/barn", "Well water", "Mountain backdrop", "Fenced pasture"],
    "description": "Peaceful 5-acre ranch property with breathtaking mountain backdrop near Canyon Ferry Lake. Includes a 30x40 workshop/barn, horse-ready corrals, and fully fenced pasture. The home features an open floor plan, wood-burning stove, and wraparound deck perfect for taking in Montana sunsets.",
    "photos": ["https://placehold.co/800x600?text=Ranch+Home", "https://placehold.co/800x600?text=Barn", "https://placehold.co/800x600?text=Pasture"],
    "sellingPoints": ["5 acres with horse-ready facilities", "30x40 workshop/barn included", "Minutes from Canyon Ferry Lake recreation"]
  }'::jsonb
);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260209_create_test_presets.sql
git commit -m "feat(test-bench): add test_presets migration with seed data"
```

**Note:** Run `npx supabase db push` or apply migration via Supabase dashboard after committing.

---

### Task 3: Create server actions for preset CRUD

**Files:**
- Create: `src/app/admin/test/actions.ts`

**Step 1: Write the server actions**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ListingData } from '@/lib/types/listing'

export async function getPresets() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('test_presets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createPreset(name: string, listingData: ListingData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('test_presets')
    .insert({
      name,
      listing_data: listingData,
      created_by: user.id,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/test')
}

export async function updatePreset(id: string, name: string, listingData: ListingData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('test_presets')
    .update({
      name,
      listing_data: listingData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/test')
}

export async function deletePreset(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('test_presets')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/test')
}
```

**Step 2: Commit**

```bash
git add src/app/admin/test/actions.ts
git commit -m "feat(test-bench): add preset CRUD server actions"
```

---

### Task 4: Create PresetCard component

**Files:**
- Create: `src/components/admin/preset-card.tsx`

**Step 1: Write the component**

```tsx
'use client'

import { Pencil, Trash2, Home } from 'lucide-react'
import type { TestPreset } from '@/lib/types/preset'

interface PresetCardProps {
  preset: TestPreset
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function PresetCard({ preset, isSelected, onSelect, onEdit, onDelete }: PresetCardProps) {
  const listing = preset.listing_data

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-colors ${
        isSelected
          ? 'border-gold bg-gold/5 ring-1 ring-gold'
          : 'border-border bg-card hover:border-gold/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted-foreground shrink-0" />
          <h3 className="font-medium text-foreground text-sm">{preset.name}</h3>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit preset"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete preset"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground">
          {listing.address.city}, {listing.address.state} &middot; {listing.propertyType}
        </p>
        <p className="text-sm text-foreground font-medium">
          ${listing.price.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {listing.beds} bd &middot; {listing.baths} ba &middot; {listing.sqft.toLocaleString()} sqft
        </p>
      </div>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/preset-card.tsx
git commit -m "feat(test-bench): add PresetCard component"
```

---

### Task 5: Create PresetForm component

**Files:**
- Create: `src/components/admin/preset-form.tsx`

**Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import type { ListingData } from '@/lib/types/listing'
import type { TestPreset } from '@/lib/types/preset'

interface PresetFormProps {
  preset?: TestPreset | null
  onSave: (name: string, data: ListingData) => void
  onCancel: () => void
}

const emptyListing: ListingData = {
  url: '',
  address: { street: '', city: '', state: 'MT', zip: '' },
  price: 0,
  beds: 0,
  baths: 0,
  sqft: 0,
  propertyType: 'Single Family',
  features: [],
  description: '',
  photos: [],
  sellingPoints: [],
}

export function PresetForm({ preset, onSave, onCancel }: PresetFormProps) {
  const [name, setName] = useState(preset?.name || '')
  const [listing, setListing] = useState<ListingData>(
    preset ? preset.listing_data : emptyListing
  )
  const [featureInput, setFeatureInput] = useState('')
  const [sellingPointInput, setSellingPointInput] = useState('')
  const [photoInput, setPhotoInput] = useState('')

  function updateAddress(field: string, value: string) {
    setListing((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }))
  }

  function addToList(key: 'features' | 'sellingPoints' | 'photos', value: string, clearFn: (v: string) => void) {
    if (!value.trim()) return
    setListing((prev) => ({ ...prev, [key]: [...(prev[key] || []), value.trim()] }))
    clearFn('')
  }

  function removeFromList(key: 'features' | 'sellingPoints' | 'photos', index: number) {
    setListing((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(name, listing)
  }

  const inputClass =
    'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">
          {preset ? 'Edit Preset' : 'New Preset'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preset name */}
      <div>
        <label className={labelClass}>Preset Name</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Luxury Bozeman Home"
          required
        />
      </div>

      {/* Address */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Street</label>
          <input className={inputClass} value={listing.address.street} onChange={(e) => updateAddress('street', e.target.value)} placeholder="123 Main St" required />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={inputClass} value={listing.address.city} onChange={(e) => updateAddress('city', e.target.value)} placeholder="Bozeman" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>State</label>
            <input className={inputClass} value={listing.address.state} onChange={(e) => updateAddress('state', e.target.value)} placeholder="MT" required />
          </div>
          <div>
            <label className={labelClass}>ZIP</label>
            <input className={inputClass} value={listing.address.zip} onChange={(e) => updateAddress('zip', e.target.value)} placeholder="59715" required />
          </div>
        </div>
      </div>

      {/* Property details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Price ($)</label>
          <input className={inputClass} type="number" value={listing.price || ''} onChange={(e) => setListing((p) => ({ ...p, price: Number(e.target.value) }))} required />
        </div>
        <div>
          <label className={labelClass}>Beds</label>
          <input className={inputClass} type="number" value={listing.beds || ''} onChange={(e) => setListing((p) => ({ ...p, beds: Number(e.target.value) }))} required />
        </div>
        <div>
          <label className={labelClass}>Baths</label>
          <input className={inputClass} type="number" value={listing.baths || ''} onChange={(e) => setListing((p) => ({ ...p, baths: Number(e.target.value) }))} required />
        </div>
        <div>
          <label className={labelClass}>Sqft</label>
          <input className={inputClass} type="number" value={listing.sqft || ''} onChange={(e) => setListing((p) => ({ ...p, sqft: Number(e.target.value) }))} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Property Type</label>
          <select className={inputClass} value={listing.propertyType} onChange={(e) => setListing((p) => ({ ...p, propertyType: e.target.value }))}>
            <option>Single Family</option>
            <option>Condo</option>
            <option>Townhouse</option>
            <option>Ranch</option>
            <option>Multi-Family</option>
            <option>Land</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Year Built</label>
          <input className={inputClass} type="number" value={listing.yearBuilt || ''} onChange={(e) => setListing((p) => ({ ...p, yearBuilt: Number(e.target.value) || undefined }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Lot Size</label>
          <input className={inputClass} value={listing.lotSize || ''} onChange={(e) => setListing((p) => ({ ...p, lotSize: e.target.value || undefined }))} placeholder="e.g. 5 acres" />
        </div>
        <div>
          <label className={labelClass}>Neighborhood</label>
          <input className={inputClass} value={listing.address.neighborhood || ''} onChange={(e) => updateAddress('neighborhood', e.target.value)} placeholder="e.g. Downtown" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea className={`${inputClass} min-h-[80px]`} value={listing.description} onChange={(e) => setListing((p) => ({ ...p, description: e.target.value }))} placeholder="Property description..." required />
      </div>

      {/* Features */}
      <div>
        <label className={labelClass}>Features</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            placeholder="Add a feature..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList('features', featureInput, setFeatureInput) } }}
          />
          <button type="button" onClick={() => addToList('features', featureInput, setFeatureInput)} className="px-3 py-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {listing.features.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-foreground">
              {f}
              <button type="button" onClick={() => removeFromList('features', i)} className="text-muted-foreground hover:text-red-400">
                <Minus className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Selling Points */}
      <div>
        <label className={labelClass}>Selling Points</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={sellingPointInput}
            onChange={(e) => setSellingPointInput(e.target.value)}
            placeholder="Add a selling point..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList('sellingPoints', sellingPointInput, setSellingPointInput) } }}
          />
          <button type="button" onClick={() => addToList('sellingPoints', sellingPointInput, setSellingPointInput)} className="px-3 py-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(listing.sellingPoints || []).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gold/10 text-gold">
              {s}
              <button type="button" onClick={() => removeFromList('sellingPoints', i)} className="hover:text-red-400">
                <Minus className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Photo URLs */}
      <div>
        <label className={labelClass}>Photo URLs</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={photoInput}
            onChange={(e) => setPhotoInput(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList('photos', photoInput, setPhotoInput) } }}
          />
          <button type="button" onClick={() => addToList('photos', photoInput, setPhotoInput)} className="px-3 py-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1 mt-2">
          {listing.photos.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate flex-1">{p}</span>
              <button type="button" onClick={() => removeFromList('photos', i)} className="text-muted-foreground hover:text-red-400 shrink-0">
                <Minus className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors">
          {preset ? 'Update Preset' : 'Create Preset'}
        </button>
      </div>
    </form>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/preset-form.tsx
git commit -m "feat(test-bench): add PresetForm component"
```

---

### Task 6: Create the Test Bench page

**Files:**
- Create: `src/app/admin/test/page.tsx`

**Step 1: Write the page**

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FlaskConical, Loader2 } from 'lucide-react'
import { PresetCard } from '@/components/admin/preset-card'
import { PresetForm } from '@/components/admin/preset-form'
import { getPresets, createPreset, updatePreset, deletePreset } from './actions'
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

  async function handleGenerate() {
    const preset = presets.find((p) => p.id === selectedId)
    if (!preset) return

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing: preset.listing_data }),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Generation failed')

      sessionStorage.setItem(
        `campaign-${json.campaign.id}`,
        JSON.stringify(json.campaign)
      )
      router.push(`/campaign/${json.campaign.id}`)
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
        <button
          onClick={() => { setEditingPreset(null); setShowForm(true) }}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Preset
        </button>
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
                ${selectedPreset.listing_data.price.toLocaleString()} &middot;{' '}
                {selectedPreset.listing_data.beds}bd/{selectedPreset.listing_data.baths}ba &middot;{' '}
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
```

**Step 2: Commit**

```bash
git add src/app/admin/test/page.tsx
git commit -m "feat(test-bench): add test bench page with preset selection and generation"
```

---

### Task 7: Add "AI Test" to admin sidebar

**Files:**
- Modify: `src/components/admin/sidebar.tsx`

**Step 1: Add the nav item**

Add `FlaskConical` to the lucide-react import and add the test bench item to `navItems`:

```diff
- import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
+ import { LayoutDashboard, Users, Settings, LogOut, FlaskConical } from 'lucide-react'

 const navItems = [
   { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
   { href: '/admin/users', label: 'Users', icon: Users },
+  { href: '/admin/test', label: 'AI Test', icon: FlaskConical },
   { href: '/admin/settings', label: 'Settings', icon: Settings },
 ]
```

**Step 2: Commit**

```bash
git add src/components/admin/sidebar.tsx
git commit -m "feat(test-bench): add AI Test nav item to admin sidebar"
```

---

### Task 8: Verify build and integration

**Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 2: Manual smoke test**

1. Navigate to `/admin/test`
2. Verify seed presets appear (after migration is applied)
3. Select a preset — verify gold highlight
4. Click "Generate Campaign" — verify loading state and redirect to `/campaign/[id]`
5. Create a new preset — verify it appears in the grid
6. Edit a preset — verify form populates correctly
7. Delete a preset — verify removal

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(test-bench): AI workflow test bench complete"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | TestPreset type | `src/lib/types/preset.ts` (new) |
| 2 | Supabase migration + seed data | `supabase/migrations/...` (new) |
| 3 | Server actions (CRUD) | `src/app/admin/test/actions.ts` (new) |
| 4 | PresetCard component | `src/components/admin/preset-card.tsx` (new) |
| 5 | PresetForm component | `src/components/admin/preset-form.tsx` (new) |
| 6 | Test Bench page | `src/app/admin/test/page.tsx` (new) |
| 7 | Sidebar nav update | `src/components/admin/sidebar.tsx` (modify) |
| 8 | Build verification | No files — verify everything works |

**Design update:** No changes needed to `/create` or `/campaign/[id]` — the existing sessionStorage + navigation pattern is reused as-is.
