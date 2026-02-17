'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { ImagePicker } from '@/components/ui/image-picker';

interface MockupImageProps {
  src: string;
  alt: string;
  aspectRatio: string;
  sizes: string;
  className?: string;
  onImageSelect?: (index: number) => void;
  photos?: string[];
  selectedIndex?: number;
}

export function MockupImage({
  src,
  alt,
  aspectRatio,
  sizes,
  className,
  onImageSelect,
  photos,
  selectedIndex,
}: MockupImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(!src);
  const isLocal = src && (src.startsWith('/') || src.startsWith('/_next'));

  return (
    <div className={`relative ${aspectRatio} overflow-hidden bg-slate-100 ${className ?? ''}`}>
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Error fallback */}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-16 w-16 text-slate-300" />
        </div>
      ) : isLocal ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}

      {/* ImagePicker overlay */}
      {photos && photos.length >= 2 && onImageSelect && (
        <div className="absolute bottom-2 right-2">
          <ImagePicker
            images={photos}
            selectedIndex={selectedIndex ?? 0}
            onSelect={onImageSelect}
          />
        </div>
      )}
    </div>
  );
}
