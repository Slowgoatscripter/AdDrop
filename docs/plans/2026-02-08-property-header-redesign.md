# Property Header Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current small thumbnail property header with an image-forward hero section featuring a carousel, gradient overlay, and custom lightbox.

**Architecture:** Three new components (ImageCarousel, Lightbox, redesigned PropertyHeader) composed together. Carousel manages slide state internally, lightbox is a portal-based modal. No new dependencies — all custom-built with Tailwind + React state.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui Card/Badge, Lucide React icons

---

### Task 1: Create the Lightbox Component

**Files:**
- Create: `src/components/ui/lightbox.tsx`

**Why first:** The carousel will open the lightbox on click, so we need this ready first.

**Step 1: Create the lightbox component**

```tsx
'use client';

import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  alt?: string;
}

export function Lightbox({ images, currentIndex, onClose, onNavigate, alt = 'Property photo' }: LightboxProps) {
  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
        aria-label="Close lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Photo counter */}
      <div className="absolute top-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous arrow */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Main image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[currentIndex]}
        alt={`${alt} ${currentIndex + 1}`}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next arrow */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify no build errors**

Run: `cd "C:\Users\dutte\OneDrive\Desktop\Projects\RealEstate Add Gen" && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (or at least no errors related to this file)

**Step 3: Commit**

```bash
git add src/components/ui/lightbox.tsx
git commit -m "feat: add custom lightbox component with keyboard navigation"
```

---

### Task 2: Create the Image Carousel Component

**Files:**
- Create: `src/components/ui/image-carousel.tsx`
- Modify: `src/app/globals.css` (add carousel transition)

**Step 1: Add carousel transition styles to globals.css**

Add the following after the existing `@layer utilities` block in `src/app/globals.css`:

```css
@layer utilities {
  .carousel-track {
    display: flex;
    transition: transform 0.4s ease-in-out;
  }
}
```

**Step 2: Create the image carousel component**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Lightbox } from '@/components/ui/lightbox';

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  /** Overlay content rendered on top of the current slide (bottom area) */
  overlay?: React.ReactNode;
}

export function ImageCarousel({ images, alt = 'Property photo', overlay }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-[400px] rounded-t-xl bg-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">No photos available</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full h-[400px] overflow-hidden rounded-t-xl bg-slate-100 group">
        {/* Carousel track */}
        <div
          className="carousel-track h-full"
          style={{ width: `${images.length * 100}%`, transform: `translateX(-${currentIndex * (100 / images.length)}%)` }}
        >
          {images.map((src, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={i}
              src={src}
              alt={`${alt} ${i + 1}`}
              className="h-full object-cover cursor-pointer"
              style={{ width: `${100 / images.length}%` }}
              onClick={() => setLightboxOpen(true)}
            />
          ))}
        </div>

        {/* Navigation arrows — only show if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Photo count badge */}
        <div className="absolute top-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Gradient overlay with content */}
        {overlay && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-20 pb-4 px-6">
            {overlay}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCurrentIndex}
          alt={alt}
        />
      )}
    </>
  );
}
```

**Step 3: Verify no build errors**

Run: `cd "C:\Users\dutte\OneDrive\Desktop\Projects\RealEstate Add Gen" && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/ui/image-carousel.tsx src/app/globals.css
git commit -m "feat: add image carousel component with slide transitions and dot navigation"
```

---

### Task 3: Redesign the Property Header

**Files:**
- Modify: `src/components/campaign/property-header.tsx`

**Step 1: Replace the property header with the new design**

Replace the entire contents of `src/components/campaign/property-header.tsx` with:

```tsx
import { ListingData } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageCarousel } from '@/components/ui/image-carousel';

interface PropertyHeaderProps {
  listing: ListingData;
}

export function PropertyHeader({ listing }: PropertyHeaderProps) {
  const addr = listing.address;
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

  const overlayContent = (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-white drop-shadow-md">
        {addr.street || 'Property'}
      </h2>
      <p className="text-white/80 text-sm drop-shadow-md">
        {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
      </p>
      <p className="text-3xl font-bold text-white drop-shadow-md">
        ${listing.price.toLocaleString()}
      </p>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <ImageCarousel
        images={listing.photos}
        alt={fullAddress}
        overlay={overlayContent}
      />

      <div className="p-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{listing.beds} Beds</Badge>
          <Badge variant="secondary">{listing.baths} Baths</Badge>
          <Badge variant="secondary">{listing.sqft.toLocaleString()} Sq Ft</Badge>
          <Badge variant="secondary">{listing.propertyType}</Badge>
          {listing.yearBuilt && <Badge variant="secondary">Built {listing.yearBuilt}</Badge>}
        </div>

        {listing.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {listing.features.slice(0, 6).map((f, i) => (
              <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
            ))}
            {listing.features.length > 6 && (
              <Badge variant="outline" className="text-xs">+{listing.features.length - 6} more</Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
```

**Step 2: Verify no build errors**

Run: `cd "C:\Users\dutte\OneDrive\Desktop\Projects\RealEstate Add Gen" && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Visual verification**

Run: `cd "C:\Users\dutte\OneDrive\Desktop\Projects\RealEstate Add Gen" && npx next dev`

Open the app and navigate to a campaign with a scraped listing. Verify:
- Carousel shows with full-width hero image (~400px tall)
- Arrow buttons appear on hover (hidden with 1 photo)
- Dots show below image for navigation
- Photo count badge shows in top-right ("1 / N")
- Gradient overlay shows address + price in white at bottom of image
- Clicking image opens lightbox
- Lightbox has arrows, close button, keyboard nav (Escape, arrows)
- Badges and features display below the carousel
- Responsive on mobile (full width)

**Step 4: Commit**

```bash
git add src/components/campaign/property-header.tsx
git commit -m "feat: redesign property header with image carousel and gradient overlay"
```

---

### Task 4: Handle Edge Cases and Polish

**Files:**
- Modify: `src/components/ui/image-carousel.tsx` (minor tweaks if needed)
- Modify: `src/components/ui/lightbox.tsx` (minor tweaks if needed)

**Step 1: Test edge cases manually**

Test these scenarios in the browser:
1. **No photos** — should show "No photos available" placeholder
2. **Single photo** — should show image with no arrows and no dots, just the count badge "1 / 1"
3. **Many photos (8+)** — dots should not overflow; if more than ~10, consider showing only subset of dots
4. **Broken image URL** — should gracefully show broken image (no crash)
5. **Lightbox on mobile viewport** — should be usable with reasonable sizing

**Step 2: Fix any issues found**

Apply fixes as needed based on testing.

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: handle edge cases in carousel and lightbox"
```

---

## Summary

| Task | Component | Estimated Complexity |
|------|-----------|---------------------|
| 1 | Lightbox | Small — single modal component |
| 2 | Image Carousel | Medium — slide logic, transitions, dot nav |
| 3 | Property Header Redesign | Small — composition of existing + new components |
| 4 | Edge Cases & Polish | Small — manual testing + minor fixes |

**Total new files:** 2 (`lightbox.tsx`, `image-carousel.tsx`)
**Modified files:** 2 (`property-header.tsx`, `globals.css`)
**New dependencies:** None
