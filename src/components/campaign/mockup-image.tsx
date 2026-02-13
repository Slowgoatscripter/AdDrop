'use client';

import Image from 'next/image';

interface MockupImageProps {
  src: string;
  alt: string;
  aspectRatio: string;
  sizes: string;
  photos?: string[];
  selectedIndex?: number;
  onImageSelect?: (index: number) => void;
}

/**
 * Image component used inside ad mockups. Supports photo selection
 * thumbnails when multiple photos are available.
 */
export function MockupImage({
  src,
  alt,
  aspectRatio,
  sizes,
  photos,
  selectedIndex = 0,
  onImageSelect,
}: MockupImageProps) {
  return (
    <div className="relative">
      <div className={`relative ${aspectRatio} w-full overflow-hidden bg-slate-100`}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            No image available
          </div>
        )}
      </div>

      {/* Photo selector thumbnails */}
      {photos && photos.length > 1 && onImageSelect && (
        <div className="flex gap-1.5 p-2 overflow-x-auto">
          {photos.slice(0, 6).map((photo, i) => (
            <button
              key={i}
              onClick={() => onImageSelect(i)}
              className={`relative w-10 h-10 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${
                i === selectedIndex
                  ? 'border-gold'
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              <Image
                src={photo}
                alt={`Photo ${i + 1}`}
                fill
                sizes="40px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
