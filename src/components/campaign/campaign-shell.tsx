'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignKit } from '@/lib/types';
import { PropertyHeader } from './property-header';
import { CampaignTabs } from './campaign-tabs';
import { Button } from '@/components/ui/button';

export function CampaignShell() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignKit | null>(null);

  useEffect(() => {
    const id = params.id as string;
    const stored = sessionStorage.getItem(`campaign-${id}`);
    if (stored) {
      setCampaign(JSON.parse(stored));
    }
  }, [params.id]);

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-500">Campaign not found or session expired.</p>
          <Button onClick={() => router.push('/')}>Generate New Campaign</Button>
        </div>
      </div>
    );
  }

  async function handleExport(format: 'pdf' | 'csv') {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, format }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign!.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Campaign Kit</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>New Campaign</Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>Export CSV</Button>
            <Button onClick={() => handleExport('pdf')}>Export PDF</Button>
          </div>
        </div>

        <PropertyHeader listing={campaign.listing} />
        <CampaignTabs campaign={campaign} />
      </div>
    </div>
  );
}
