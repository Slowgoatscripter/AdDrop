'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingData } from '@/lib/types/listing';
import { PlatformId, ALL_PLATFORMS } from '@/lib/types/campaign';
import { PropertyForm } from '@/components/campaign/property-form';

export function MlsInputForm() {
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([...ALL_PLATFORMS]);
  const router = useRouter();

  const handleGenerate = async (listing: ListingData) => {
    setGenerateLoading(true);
    setError('');

    try {
      // When all platforms selected, send undefined to avoid staleness (Review Fix #5)
      const platforms = selectedPlatforms.length === ALL_PLATFORMS.length
        ? undefined
        : selectedPlatforms;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing, platforms }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Campaign generation failed');
        return;
      }

      sessionStorage.setItem(`campaign-${json.campaign.id}`, JSON.stringify(json.campaign));
      router.push(`/campaign/${json.campaign.id}`);
    } catch {
      setError('Failed to generate campaign. Please try again.');
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <PropertyForm
        onSubmit={handleGenerate}
        loading={generateLoading}
        selectedPlatforms={selectedPlatforms}
        onPlatformsChange={setSelectedPlatforms}
      />

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
