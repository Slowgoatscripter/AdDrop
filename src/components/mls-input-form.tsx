'use client';

import React, { useState } from 'react';
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
    } catch {
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
    } catch {
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
