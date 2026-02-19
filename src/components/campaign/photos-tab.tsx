'use client';

import React, { useCallback, useRef, useState } from 'react';
import { uploadPropertyImages } from '@/lib/uploads/property-images';
import { X, Upload, Loader2, ImagePlus, Star } from 'lucide-react';
import { toast } from 'sonner';

interface PhotosTabProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  userId: string;
}

export function PhotosTab({ photos, onPhotosChange, userId }: PhotosTabProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemovePhoto = useCallback(
    (index: number) => {
      const updated = photos.filter((_, i) => i !== index);
      onPhotosChange(updated);
    },
    [photos, onPhotosChange]
  );

  const handleSetHero = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updated = [...photos];
      const [photo] = updated.splice(index, 1);
      updated.unshift(photo);
      onPhotosChange(updated);
      toast.success('Hero image updated');
    },
    [photos, onPhotosChange]
  );

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        const { urls, errors } = await uploadPropertyImages(
          Array.from(files),
          userId,
          photos.length
        );

        if (errors.length > 0) {
          errors.forEach((err) => toast.error(err));
        }

        if (urls.length > 0) {
          onPhotosChange([...photos, ...urls]);
          toast.success(`Uploaded ${urls.length} photo${urls.length !== 1 ? 's' : ''}`);
        }
      } catch (err) {
        console.error('[photos-tab] Upload failed:', err);
        toast.error('Upload failed. Please try again.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [photos, onPhotosChange, userId]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {photos.length} of 25 photos
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md cursor-pointer text-sm transition-colors">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Add Photos
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={handleUpload}
            disabled={uploading || photos.length >= 25}
            className="hidden"
          />
        </label>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo, i) => (
            <div
              key={`${photo}-${i}`}
              className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
            >
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
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetHero(i)}
                    className="p-1 bg-black/60 rounded-full text-white hover:bg-primary/80"
                    title="Set as hero image"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(i)}
                  className="p-1 bg-black/60 rounded-full text-white hover:bg-destructive/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" /> Hero
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <ImagePlus className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">No photos yet</p>
          <p className="text-xs mt-1">Upload photos to see them in your ad mockups</p>
        </div>
      )}
    </div>
  );
}
