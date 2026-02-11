'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageIcon, X } from 'lucide-react';

interface ImagePickerProps {
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ImagePicker({ images, selectedIndex, onSelect }: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (images.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        aria-label="Change image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 rounded-lg bg-white shadow-xl border p-2 grid grid-cols-4 gap-1.5 w-[200px]">
          <button
            onClick={() => setOpen(false)}
            className="absolute -top-2 -right-2 rounded-full bg-slate-900 p-0.5 text-white hover:bg-slate-700 z-10"
            aria-label="Close image picker"
          >
            <X className="h-3 w-3" />
          </button>
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => { onSelect(i); setOpen(false); }}
              className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                i === selectedIndex ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
