'use client';

import React, { useState, useCallback } from 'react';
import { ListingData, ListingAddress } from '@/lib/types/listing';
import { PlatformId, ALL_PLATFORMS } from '@/lib/types/campaign';
import { PlatformSelector } from '@/components/campaign/platform-selector';
import { Button } from '@/components/ui/button';
import { X, Plus, Upload, Loader2 } from 'lucide-react';

interface PropertyFormProps {
  initialData?: Partial<ListingData>;
  onSubmit: (data: ListingData) => void;
  loading?: boolean;
  selectedPlatforms?: PlatformId[];
  onPlatformsChange?: (platforms: PlatformId[]) => void;
}

const PROPERTY_TYPES = [
  'Residential',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
  'Commercial',
  'Other',
];

export function PropertyForm({ initialData, onSubmit, loading, selectedPlatforms, onPlatformsChange }: PropertyFormProps) {
  // Property details
  const [street, setStreet] = useState(initialData?.address?.street || '');
  const [city, setCity] = useState(initialData?.address?.city || '');
  const [state, setState] = useState(initialData?.address?.state || 'MT');
  const [zip, setZip] = useState(initialData?.address?.zip || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [beds, setBeds] = useState(initialData?.beds?.toString() || '');
  const [baths, setBaths] = useState(initialData?.baths?.toString() || '');
  const [sqft, setSqft] = useState(initialData?.sqft?.toString() || '');
  const [propertyType, setPropertyType] = useState(initialData?.propertyType || 'Residential');
  const [yearBuilt, setYearBuilt] = useState(initialData?.yearBuilt?.toString() || '');
  const [lotSize, setLotSize] = useState(initialData?.lotSize || '');
  const [mlsNumber, setMlsNumber] = useState(initialData?.mlsNumber || '');

  // Listing info
  const [listingAgent, setListingAgent] = useState(initialData?.listingAgent || '');
  const [broker, setBroker] = useState(initialData?.broker || '');

  // Description + selling points
  const [description, setDescription] = useState(initialData?.description || '');
  const [sellingPoints, setSellingPoints] = useState<string[]>(['']);

  // Photos
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddSellingPoint = useCallback(() => {
    setSellingPoints((prev) => [...prev, '']);
  }, []);

  const handleRemoveSellingPoint = useCallback((index: number) => {
    setSellingPoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSellingPointChange = useCallback((index: number, value: string) => {
    setSellingPoints((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, url]);
    });
    e.target.value = '';
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const address: ListingAddress = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
    };

    const filteredSellingPoints = sellingPoints.filter((sp) => sp.trim() !== '');

    const listing: ListingData = {
      url: '',
      address,
      price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
      beds: parseInt(beds) || 0,
      baths: parseFloat(baths) || 0,
      sqft: parseInt(sqft.replace(/[^0-9]/g, '')) || 0,
      propertyType,
      features: filteredSellingPoints,
      description: description.trim(),
      photos,
      ...(yearBuilt && { yearBuilt: parseInt(yearBuilt) }),
      ...(lotSize && { lotSize }),
      ...(listingAgent && { listingAgent }),
      ...(broker && { broker }),
      ...(mlsNumber && { mlsNumber }),
      ...(filteredSellingPoints.length > 0 && { sellingPoints: filteredSellingPoints }),
    };

    onSubmit(listing);
  };

  const inputClass =
    'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card text-foreground';
  const labelClass = 'block text-sm font-medium text-card-foreground mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {/* Section 1: Property Details */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Property Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Street Address *</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={inputClass}
              placeholder="123 Main St"
              required
            />
          </div>
          <div>
            <label className={labelClass}>City *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              placeholder="Missoula"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={inputClass}
                placeholder="MT"
                maxLength={2}
                required
              />
            </div>
            <div>
              <label className={labelClass}>ZIP *</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputClass}
                placeholder="59801"
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Price *</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
              placeholder="450,000"
              required
            />
          </div>
          <div>
            <label className={labelClass}>MLS #</label>
            <input
              type="text"
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              className={inputClass}
              placeholder="30025432"
            />
          </div>
          <div>
            <label className={labelClass}>Beds *</label>
            <input
              type="number"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              className={inputClass}
              placeholder="3"
              min="0"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Baths *</label>
            <input
              type="number"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              className={inputClass}
              placeholder="2"
              min="0"
              step="0.5"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Sqft *</label>
            <input
              type="text"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className={inputClass}
              placeholder="1,800"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={inputClass}
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Year Built</label>
            <input
              type="number"
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              className={inputClass}
              placeholder="2005"
            />
          </div>
          <div>
            <label className={labelClass}>Lot Size</label>
            <input
              type="text"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              className={inputClass}
              placeholder="0.25 acres"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Listing Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Listing Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Listing Agent</label>
            <input
              type="text"
              value={listingAgent}
              onChange={(e) => setListingAgent(e.target.value)}
              className={inputClass}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className={labelClass}>Brokerage</label>
            <input
              type="text"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className={inputClass}
              placeholder="Mountain West Realty"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Description + Selling Points */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Description</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-[120px]`}
          placeholder="Enter the listing description..."
          rows={5}
        />
        <div className="mt-6">
          <h3 className="text-sm font-medium text-card-foreground mb-2">
            Selling Points
            <span className="text-muted-foreground font-normal ml-2">
              Highlights for the AI to emphasize
            </span>
          </h3>
          <div className="space-y-2">
            {sellingPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={point}
                  onChange={(e) => handleSellingPointChange(i, e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder="e.g., New roof 2024, Walking distance to downtown"
                />
                {sellingPoints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSellingPoint(i)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddSellingPoint}
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            <Plus className="h-4 w-4" /> Add selling point
          </button>
        </div>
      </div>

      {/* Section 4: Photos */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Photos
          {photos.length > 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} — first photo is the hero
            </span>
          )}
        </h2>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`Property photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-muted');
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(i)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                    Hero
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No photos yet — upload some to get started
          </div>
        )}
        <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-md cursor-pointer text-sm text-card-foreground transition-colors">
          <Upload className="h-4 w-4" />
          Upload Photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Section 5: Platform Selection */}
      {selectedPlatforms && onPlatformsChange && (
        <div className="bg-card rounded-lg border border-border p-6">
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={onPlatformsChange}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || (selectedPlatforms !== undefined && selectedPlatforms.length === 0)}
          className="px-8 py-3 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : selectedPlatforms && selectedPlatforms.length < ALL_PLATFORMS.length ? (
            `Generate ${selectedPlatforms.length} Ad${selectedPlatforms.length !== 1 ? 's' : ''}`
          ) : (
            'Generate Campaign'
          )}
        </Button>
      </div>
    </form>
  );
}
