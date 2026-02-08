'use client'

import * as React from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface LightboxProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  alt?: string
}

export function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  alt = 'Property image',
}: LightboxProps) {
  // Lock body scroll when mounted, restore on unmount
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose, onNavigate])

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % images.length
    onNavigate(nextIndex)
  }

  const handlePrevious = () => {
    const previousIndex = (currentIndex - 1 + images.length) % images.length
    onNavigate(previousIndex)
  }

  const showNavigation = images.length > 1

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Photo counter */}
      {showNavigation && (
        <div className="absolute top-4 left-4 z-10 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
        aria-label="Close lightbox"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Previous button */}
      {showNavigation && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handlePrevious()
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {showNavigation && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleNext()
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt={`${alt} ${currentIndex + 1}`}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
