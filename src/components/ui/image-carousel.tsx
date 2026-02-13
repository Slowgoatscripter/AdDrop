'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Lightbox } from '@/components/ui/lightbox'

interface ImageCarouselProps {
  images: string[]
  alt?: string
  /** Overlay content rendered at bottom of current slide (for gradient + text) */
  overlay?: React.ReactNode
}

export function ImageCarousel({
  images,
  alt = 'Property image',
  overlay,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  // Empty state
  if (images.length === 0) {
    return (
      <div className="relative w-full h-[250px] md:h-[300px] lg:h-[350px] rounded-t-xl bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No photos available</p>
      </div>
    )
  }

  const trackWidth = images.length * 100
  const translateX = -currentIndex * (100 / images.length)
  const imageWidth = 100 / images.length

  return (
    <>
      <div className="relative w-full h-[250px] md:h-[300px] lg:h-[350px] overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-900 group">
        {/* Carousel track */}
        <div
          className="carousel-track h-full"
          style={{
            width: `${trackWidth}%`,
            transform: `translateX(${translateX}%)`,
          }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              style={{ width: `${imageWidth}%` }}
              className="h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`${alt} ${index + 1}`}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setLightboxOpen(true)}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  target.parentElement?.classList.add('bg-slate-200');
                }}
              />
            </div>
          ))}
        </div>

        {/* Navigation arrows - only show when multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Photo count badge */}
        <div className="absolute top-3 right-3 bg-black/50 rounded-full px-3 py-1 text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Dot indicators - only show when multiple images (max 8) */}
        {images.length > 1 && images.length <= 8 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10 max-w-[200px] overflow-hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${index + 1}`}
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

      {/* Lightbox integration */}
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
  )
}
