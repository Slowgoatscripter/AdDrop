# Property Input Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace URL-based scraping with MLS# lookup + editable property form + manual entry, keeping per-ad photo assignment intact.

**Architecture:** New MLS# resolver constructs search URLs for Realtor.com → Redfin → Zillow fallback chain. Scraped data populates an editable form. Manual entry uses the same form unfilled. Both paths feed existing `ListingData` → `generateCampaign()` pipeline unchanged.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, Cheerio, Jest + React Testing Library

**Design Doc:** `docs/plans/2026-02-08-property-input-redesign.md`

---

## Task 1: Add `mlsNumber` field to ListingData type

**Files:**
- Modify: `src/lib/types/listing.ts`

**Step 1: Add the field**

In `src/lib/types/listing.ts`, add `mlsNumber?: string` to the `ListingData` interface, after the `broker` field:

```typescript
interface ListingData {
  url: string;
  address: ListingAddress;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSize?: string;
  yearBuilt?: number;
  propertyType: string;
  features: string[];
  description: string;
  photos: string[];
  listingAgent?: string;
  broker?: string;
  mlsNumber?: string;
}
```

**Step 2: Commit**

```bash
git add src/lib/types/listing.ts
git commit -m "feat: add mlsNumber field to ListingData type"
```

---

## Task 2: Build the MLS# → URL resolver

**Files:**
- Create: `src/lib/scraper/mls-resolver.ts`
- Create: `src/lib/scraper/__tests__/mls-resolver.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/scraper/__tests__/mls-resolver.test.ts`:

```typescript
import { resolveMlsNumber } from '../mls-resolver';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('resolveMlsNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns Realtor.com URL when listing found', async () => {
    // Realtor.com returns 200 (listing exists)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      status: 200,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      source: 'realtor.com',
    });
  });

  test('falls back to Redfin when Realtor.com fails', async () => {
    // Realtor.com returns 404
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    // Redfin search returns a redirect to a listing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.redfin.com/MT/Missoula/123-Main-St/home/12345',
      status: 200,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.redfin.com/MT/Missoula/123-Main-St/home/12345',
      source: 'redfin',
    });
  });

  test('falls back to Zillow when Realtor.com and Redfin fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.zillow.com/homedetails/123-Main-St/12345_zpid/',
      status: 200,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.zillow.com/homedetails/123-Main-St/12345_zpid/',
      source: 'zillow',
    });
  });

  test('returns failure when all sources fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await resolveMlsNumber('INVALID123');
    expect(result).toEqual({
      success: false,
      error: 'Listing not found on any source. You can enter details manually.',
    });
  });

  test('strips non-alphanumeric characters from MLS number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      status: 200,
    });

    await resolveMlsNumber('MLS# 300-254-32');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('30025432'),
      expect.any(Object)
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/scraper/__tests__/mls-resolver.test.ts --verbose`
Expected: FAIL — module `../mls-resolver` not found

**Step 3: Implement the resolver**

Create `src/lib/scraper/mls-resolver.ts`:

```typescript
export interface MlsResolveResult {
  success: boolean;
  url?: string;
  source?: string;
  error?: string;
}

function sanitizeMlsNumber(mlsNumber: string): string {
  return mlsNumber.replace(/[^a-zA-Z0-9]/g, '');
}

const SOURCES = [
  {
    name: 'realtor.com',
    buildUrl: (mls: string) =>
      `https://www.realtor.com/realestateandhomes-detail/M${mls}`,
  },
  {
    name: 'redfin',
    buildUrl: (mls: string) =>
      `https://www.redfin.com/stingray/do/query-location?location=MLS%23${mls}&v=2`,
  },
  {
    name: 'zillow',
    buildUrl: (mls: string) =>
      `https://www.zillow.com/homes/${mls}_rb/`,
  },
];

export async function resolveMlsNumber(
  mlsNumber: string
): Promise<MlsResolveResult> {
  const sanitized = sanitizeMlsNumber(mlsNumber);

  for (const source of SOURCES) {
    try {
      const url = source.buildUrl(sanitized);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return {
          success: true,
          url: response.url,
          source: source.name,
        };
      }
    } catch {
      // Source failed, try next
      continue;
    }
  }

  return {
    success: false,
    error: 'Listing not found on any source. You can enter details manually.',
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/scraper/__tests__/mls-resolver.test.ts --verbose`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/lib/scraper/mls-resolver.ts src/lib/scraper/__tests__/mls-resolver.test.ts
git commit -m "feat: add MLS number resolver with fallback chain"
```

---

## Task 3: Create the MLS lookup API route

**Files:**
- Create: `src/app/api/mls-lookup/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/mls-lookup/__tests__/route.test.ts`:

```typescript
import { resolveMlsNumber } from '@/lib/scraper/mls-resolver';
import { scrapeListing } from '@/lib/scraper';

jest.mock('@/lib/scraper/mls-resolver');
jest.mock('@/lib/scraper');

const mockResolve = resolveMlsNumber as jest.MockedFunction<typeof resolveMlsNumber>;
const mockScrape = scrapeListing as jest.MockedFunction<typeof scrapeListing>;

// We'll test the handler logic directly
describe('MLS Lookup API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns scraped listing data when MLS number resolves', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      source: 'realtor.com',
    });
    mockScrape.mockResolvedValue({
      success: true,
      data: {
        url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
        address: { street: '123 Main St', city: 'Missoula', state: 'MT', zip: '59801' },
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        propertyType: 'Residential',
        features: [],
        description: 'Beautiful home',
        photos: [],
      },
    });

    // Import the handler after mocks are set up
    const { POST } = await import('../route');
    const request = new Request('http://localhost/api/mls-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mlsNumber: '30025432' }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.address.city).toBe('Missoula');
    expect(json.data.mlsNumber).toBe('30025432');
    expect(json.source).toBe('realtor.com');
  });

  test('returns error when MLS number not found', async () => {
    mockResolve.mockResolvedValue({
      success: false,
      error: 'Listing not found on any source. You can enter details manually.',
    });

    const { POST } = await import('../route');
    const request = new Request('http://localhost/api/mls-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mlsNumber: 'INVALID' }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error).toContain('not found');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/app/api/mls-lookup/__tests__/route.test.ts --verbose`
Expected: FAIL — module `../route` not found

**Step 3: Implement the API route**

Create `src/app/api/mls-lookup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resolveMlsNumber } from '@/lib/scraper/mls-resolver';
import { scrapeListing } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mlsNumber } = body;

    if (!mlsNumber || typeof mlsNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'MLS number is required' },
        { status: 400 }
      );
    }

    // Step 1: Resolve MLS# to a listing URL
    const resolved = await resolveMlsNumber(mlsNumber);

    if (!resolved.success || !resolved.url) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: 404 }
      );
    }

    // Step 2: Scrape the resolved URL
    const scraped = await scrapeListing(resolved.url);

    if (!scraped.success || !scraped.data) {
      return NextResponse.json(
        {
          success: false,
          error: scraped.error || 'Failed to scrape listing data',
          missingFields: scraped.missingFields,
        },
        { status: 422 }
      );
    }

    // Step 3: Attach MLS number to the data
    const data = { ...scraped.data, mlsNumber };

    return NextResponse.json({
      success: true,
      data,
      source: resolved.source,
      missingFields: scraped.missingFields,
    });
  } catch (error) {
    console.error('MLS lookup error:', error);
    const message = error instanceof Error ? error.message : 'MLS lookup failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/app/api/mls-lookup/__tests__/route.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/mls-lookup/route.ts src/app/api/mls-lookup/__tests__/route.test.ts
git commit -m "feat: add MLS lookup API route"
```

---

## Task 4: Build the editable property form component

**Files:**
- Create: `src/components/campaign/property-form.tsx`

This is the largest task. The form has 4 sections: property details, listing info, description + selling points, and photos.

**Step 1: Write the component**

Create `src/components/campaign/property-form.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { ListingData, ListingAddress } from '@/lib/types/listing';
import { Button } from '@/components/ui/button';
import { X, Plus, GripVertical, Upload, Loader2 } from 'lucide-react';

interface PropertyFormProps {
  initialData?: Partial<ListingData>;
  onSubmit: (data: ListingData) => void;
  loading?: boolean;
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

export function PropertyForm({ initialData, onSubmit, loading }: PropertyFormProps) {
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
  const [mlsNumber, setMlsNumber] = useState(
    (initialData as any)?.mlsNumber || ''
  );

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

    const listing: ListingData = {
      url: '',
      address,
      price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
      beds: parseInt(beds) || 0,
      baths: parseFloat(baths) || 0,
      sqft: parseInt(sqft.replace(/[^0-9]/g, '')) || 0,
      propertyType,
      features: sellingPoints.filter((sp) => sp.trim() !== ''),
      description: description.trim(),
      photos,
      ...(yearBuilt && { yearBuilt: parseInt(yearBuilt) }),
      ...(lotSize && { lotSize }),
      ...(listingAgent && { listingAgent }),
      ...(broker && { broker }),
      ...(mlsNumber && { mlsNumber }),
    };

    onSubmit(listing);
  };

  const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {/* Section 1: Property Details */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Property Details</h2>
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
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Listing Info</h2>
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
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Description</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-[120px]`}
          placeholder="Enter the listing description..."
          rows={5}
        />
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            Selling Points
            <span className="text-slate-400 font-normal ml-2">
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
                    className="p-2 text-slate-400 hover:text-red-500"
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
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" /> Add selling point
          </button>
        </div>
      </div>

      {/* Section 4: Photos */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Photos
          {photos.length > 0 && (
            <span className="text-slate-400 font-normal text-sm ml-2">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} — drag to reorder, first photo is the hero
            </span>
          )}
        </h2>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={photo}
                  alt={`Property photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-slate-200');
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
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">
                    Hero
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            No photos yet — upload some or look up an MLS# to pull them automatically
          </div>
        )}
        <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer text-sm text-slate-700 transition-colors">
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

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="px-8 py-3 text-base">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            'Generate Campaign'
          )}
        </Button>
      </div>
    </form>
  );
}
```

**Step 2: Write a basic component test**

Create `src/components/campaign/__tests__/property-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PropertyForm } from '../property-form';

describe('PropertyForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all required fields', () => {
    render(<PropertyForm onSubmit={mockSubmit} />);

    expect(screen.getByPlaceholderText('123 Main St')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Missoula')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MT')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('59801')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('450,000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('3')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1,800')).toBeInTheDocument();
  });

  test('pre-fills form with initial data', () => {
    render(
      <PropertyForm
        initialData={{
          address: { street: '456 Oak Ave', city: 'Helena', state: 'MT', zip: '59601' },
          price: 325000,
          beds: 4,
          baths: 3,
          sqft: 2200,
        }}
        onSubmit={mockSubmit}
      />
    );

    expect(screen.getByDisplayValue('456 Oak Ave')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Helena')).toBeInTheDocument();
    expect(screen.getByDisplayValue('325000')).toBeInTheDocument();
  });

  test('calls onSubmit with listing data', async () => {
    const user = userEvent.setup();
    render(<PropertyForm onSubmit={mockSubmit} />);

    await user.type(screen.getByPlaceholderText('123 Main St'), '789 Elm St');
    await user.type(screen.getByPlaceholderText('Missoula'), 'Bozeman');
    await user.clear(screen.getByPlaceholderText('MT'));
    await user.type(screen.getByPlaceholderText('MT'), 'MT');
    await user.type(screen.getByPlaceholderText('59801'), '59715');
    await user.type(screen.getByPlaceholderText('450,000'), '500000');
    await user.type(screen.getByPlaceholderText('3'), '3');
    await user.type(screen.getByPlaceholderText('2'), '2');
    await user.type(screen.getByPlaceholderText('1,800'), '2000');

    await user.click(screen.getByRole('button', { name: /generate campaign/i }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const submitted = mockSubmit.mock.calls[0][0];
    expect(submitted.address.street).toBe('789 Elm St');
    expect(submitted.address.city).toBe('Bozeman');
    expect(submitted.price).toBe(500000);
    expect(submitted.beds).toBe(3);
  });

  test('shows loading state', () => {
    render(<PropertyForm onSubmit={mockSubmit} loading />);

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });
});
```

**Step 3: Run tests**

Run: `npx jest src/components/campaign/__tests__/property-form.test.tsx --verbose`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/campaign/property-form.tsx src/components/campaign/__tests__/property-form.test.tsx
git commit -m "feat: add editable property form component"
```

---

## Task 5: Build the MLS# input + entry point component

**Files:**
- Create: `src/components/mls-input-form.tsx`

This replaces the current `url-input-form.tsx` as the main entry point.

**Step 1: Write the component**

Create `src/components/mls-input-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingData } from '@/lib/types/listing';
import { PropertyForm } from '@/components/campaign/property-form';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Edit3 } from 'lucide-react';

type InputMode = 'mls' | 'form';

export function MlsInputForm() {
  const [mode, setMode] = useState<InputMode>('mls');
  const [mlsNumber, setMlsNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookupData, setLookupData] = useState<Partial<ListingData> | null>(null);
  const [lookupSource, setLookupSource] = useState('');
  const router = useRouter();

  const handleMlsLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mlsNumber.trim()) return;

    setLookupLoading(true);
    setError('');

    try {
      const res = await fetch('/api/mls-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mlsNumber: mlsNumber.trim() }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Listing not found');
        return;
      }

      setLookupData(json.data);
      setLookupSource(json.source);
      setMode('form');
    } catch (err) {
      setError('Failed to look up listing. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGenerate = async (listing: ListingData) => {
    setGenerateLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Campaign generation failed');
        return;
      }

      sessionStorage.setItem(`campaign-${json.campaign.id}`, JSON.stringify(json.campaign));
      router.push(`/campaign/${json.campaign.id}`);
    } catch (err) {
      setError('Failed to generate campaign. Please try again.');
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {mode === 'mls' && !lookupData && (
        <div className="space-y-6">
          {/* MLS# Lookup */}
          <form onSubmit={handleMlsLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                MLS Listing Number
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={mlsNumber}
                  onChange={(e) => setMlsNumber(e.target.value)}
                  placeholder="Enter MLS# (e.g., 30025432)"
                  className="flex-1 rounded-md border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={lookupLoading}
                />
                <Button type="submit" disabled={lookupLoading || !mlsNumber.trim()} className="px-6">
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Look Up
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-slate-400">or</span>
            </div>
          </div>

          {/* Manual Entry */}
          <button
            onClick={() => setMode('form')}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Enter Property Details Manually
          </button>
        </div>
      )}

      {/* Editable Form (shown after MLS lookup or manual entry) */}
      {mode === 'form' && (
        <div className="space-y-4">
          {lookupSource && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Data pulled from <span className="font-medium text-slate-700">{lookupSource}</span>
                {' — '}review and edit before generating
              </p>
              <button
                onClick={() => {
                  setMode('mls');
                  setLookupData(null);
                  setLookupSource('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Start over
              </button>
            </div>
          )}
          <PropertyForm
            initialData={lookupData || undefined}
            onSubmit={handleGenerate}
            loading={generateLoading}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/mls-input-form.tsx
git commit -m "feat: add MLS input form with lookup and manual entry modes"
```

---

## Task 6: Wire up the home page to use the new input flow

**Files:**
- Modify: `src/app/page.tsx` (or wherever the home page renders `UrlInputForm`)

**Step 1: Find and update the home page**

Replace the `UrlInputForm` import and usage with `MlsInputForm`. The page should import from `@/components/mls-input-form` instead of `@/components/url-input-form`.

Change:
```tsx
import { UrlInputForm } from '@/components/url-input-form';
// ...
<UrlInputForm />
```

To:
```tsx
import { MlsInputForm } from '@/components/mls-input-form';
// ...
<MlsInputForm />
```

Keep the rest of the page layout unchanged.

**Step 2: Verify the dev server runs**

Run: `npx next dev`
Check: Home page loads with MLS# input and "Enter Manually" button.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace URL input with MLS input on home page"
```

---

## Task 7: Remove deprecated scraper files

**Files:**
- Delete: `src/lib/scraper/redfin.ts`
- Delete: `src/lib/scraper/browser.ts`
- Modify: `src/lib/scraper/index.ts` (remove Redfin/browser imports and references)

**Step 1: Update the scraper index**

In `src/lib/scraper/index.ts`:
- Remove the import of `scrapeRedfin` from `./redfin`
- Remove the dynamic import of `scrapeWithBrowser` from `./browser`
- Remove the Redfin-specific URL check and handler
- Remove the browser fallback for photos (< 3 photos case)
- Keep the core HTTP fetch + Cheerio parsing + parsers logic

The `scrapeListing` function should now be a straightforward: fetch → parse with Cheerio → merge data → return.

**Step 2: Delete the files**

Delete `src/lib/scraper/redfin.ts` and `src/lib/scraper/browser.ts`.

**Step 3: Run existing tests to make sure nothing breaks**

Run: `npx jest --verbose`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove Puppeteer-based scraping (redfin.ts, browser.ts)"
```

---

## Task 8: Update the ListingData type to include sellingPoints passthrough

**Files:**
- Modify: `src/lib/types/listing.ts`
- Modify: `src/lib/ai/prompt.ts`

**Step 1: Add sellingPoints to ListingData**

In `src/lib/types/listing.ts`, add after `mlsNumber`:

```typescript
sellingPoints?: string[];
```

**Step 2: Update the prompt builder to use sellingPoints**

In `src/lib/ai/prompt.ts`, in the `buildGenerationPrompt` function, after the description section, add:

```typescript
if (listing.sellingPoints && listing.sellingPoints.length > 0) {
  prompt += `\n\nAgent-Provided Selling Points (emphasize these):\n`;
  listing.sellingPoints.forEach((point) => {
    prompt += `• ${point}\n`;
  });
}
```

**Step 3: Update the property form to pass sellingPoints**

In `src/components/campaign/property-form.tsx`, update the `handleSubmit` to include sellingPoints in the ListingData:

```typescript
const listing: ListingData = {
  // ... existing fields
  features: sellingPoints.filter((sp) => sp.trim() !== ''),
  sellingPoints: sellingPoints.filter((sp) => sp.trim() !== ''),
  // ... rest
};
```

**Step 4: Run tests**

Run: `npx jest --verbose`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/lib/types/listing.ts src/lib/ai/prompt.ts src/components/campaign/property-form.tsx
git commit -m "feat: pass selling points through to AI prompt"
```

---

## Task 9: End-to-end manual test

**No files changed — verification only.**

**Step 1: Start dev server**

Run: `npx next dev`

**Step 2: Test MLS# lookup flow**

1. Enter an MLS number from a real Montana listing
2. Verify the form populates with scraped data
3. Edit a field (e.g., change price)
4. Add a selling point
5. Remove a photo
6. Click "Generate Campaign"
7. Verify the campaign page loads with correct data

**Step 3: Test manual entry flow**

1. Click "Enter Manually"
2. Fill in all required fields
3. Upload a photo
4. Add selling points
5. Click "Generate Campaign"
6. Verify the campaign generates successfully

**Step 4: Test error handling**

1. Enter an invalid MLS number
2. Verify the error message appears
3. Verify "Enter Manually" still works after an error

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: property input redesign complete — MLS lookup + editable form"
```

---

## Task Summary

| # | Task | Estimated Complexity |
|---|------|---------------------|
| 1 | Add `mlsNumber` to ListingData | Trivial |
| 2 | Build MLS# → URL resolver | Medium |
| 3 | Create MLS lookup API route | Medium |
| 4 | Build editable property form | Large |
| 5 | Build MLS input + entry point | Medium |
| 6 | Wire up home page | Trivial |
| 7 | Remove deprecated scraper files | Small |
| 8 | Add sellingPoints passthrough | Small |
| 9 | End-to-end manual test | Verification |

**Dependencies:**
- Task 2 must complete before Task 3
- Task 4 must complete before Task 5
- Task 1 must complete before Task 2 or Task 4
- Tasks 2 and 4 can run in parallel
- Task 6 requires Tasks 4 and 5
- Task 7 can run anytime after Task 3
- Task 8 requires Task 4
- Task 9 requires all others
