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
      [key]: (prev[key] || []).filter((_: string, i: number) => i !== index),
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
          <button type="button" onClick={() => addToList('features', featureInput, setFeatureInput)} className="px-3 py-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors shrink-0">
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
          <button type="button" onClick={() => addToList('sellingPoints', sellingPointInput, setSellingPointInput)} className="px-3 py-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors shrink-0">
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
          <button type="button" onClick={() => addToList('photos', photoInput, setPhotoInput)} className="px-3 py-2 rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {listing.photos.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
            {listing.photos.map((p, i) => (
              <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-muted border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFromList('photos', i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
