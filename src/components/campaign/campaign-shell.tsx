'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignKit } from '@/lib/types';
import type { ComplianceAgentResult } from '@/lib/types/compliance';
import { createClient } from '@/lib/supabase/client';
import { PropertyHeader } from './property-header';
import { CampaignTabs } from './campaign-tabs';
import { ComplianceBanner } from './compliance-banner';
import { Button } from '@/components/ui/button';

export function CampaignShell() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignKit | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadCampaign() {
      const id = params.id as string;
      setLoading(true);

      try {
        // Try loading from database first
        const supabase = createClient();
        const { data, error } = await supabase
          .from('campaigns')
          .select('generated_ads')
          .eq('id', id)
          .single();

        if (!error && data?.generated_ads) {
          setCampaign(data.generated_ads as CampaignKit);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('[campaign-shell] DB fetch failed, trying sessionStorage:', err);
      }

      // Fallback to sessionStorage for backward compatibility
      try {
        const stored = sessionStorage.getItem(`campaign-${params.id}`);
        if (stored) {
          setCampaign(JSON.parse(stored));
        }
      } catch {
        sessionStorage.removeItem(`campaign-${params.id}`);
      }

      setLoading(false);
    }

    loadCampaign();
  }, [params.id]);

  const handleReplace = useCallback(
    async (platform: string, oldTerm: string, newTerm: string) => {
      if (!campaign) return;

      const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

      function replaceInText(text: string): string {
        const regex = new RegExp(`\\b${oldTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-\s]+/g, '[\\s\\-]+')}\\b`, 'gi');
        return text.replace(regex, (matched) => {
          if (matched === matched.toUpperCase() && matched !== matched.toLowerCase()) return newTerm.toUpperCase();
          if (matched[0] === matched[0].toUpperCase() && matched[0] !== matched[0].toLowerCase()) return newTerm.charAt(0).toUpperCase() + newTerm.slice(1);
          return newTerm;
        });
      }

      const r = replaceInText;
      const parts = platform.split('.');
      const root = parts[0];

      // Helper for tone-keyed social platforms (instagram, facebook)
      const replaceToned = (data: Record<string, string> | undefined, tone: string) => {
        if (data) data[tone] = r(data[tone]);
      };

      // Helper for print-style platforms (magazineFullPage, magazineHalfPage)
      type PrintRecord = Record<string, { headline: string; body: string; cta: string }>;
      const replacePrint = (data: PrintRecord | undefined) => {
        if (data) data[parts[1]][parts[2] as 'headline' | 'body' | 'cta'] = r(data[parts[1]][parts[2] as 'headline' | 'body' | 'cta']);
      };

      // Helper for postcard (front fields + back text)
      type PostcardRecord = Record<string, { front: { headline: string; body: string; cta: string }; back: string }>;
      const replacePostcard = (data: PostcardRecord | undefined) => {
        if (!data) return;
        if (parts[2] === 'front') data[parts[1]].front[parts[3] as 'headline' | 'body' | 'cta'] = r(data[parts[1]].front[parts[3] as 'headline' | 'body' | 'cta']);
        else if (parts[2] === 'back') data[parts[1]].back = r(data[parts[1]].back);
      };

      // Strategy: platform-keyed replacers
      const replacers: Record<string, () => void> = {
        instagram:      () => replaceToned(updated.instagram, parts[1]),
        facebook:       () => replaceToned(updated.facebook, parts[1]),
        twitter:        () => { if (updated.twitter) updated.twitter = r(updated.twitter); },
        metaAd:         () => { if (updated.metaAd) updated.metaAd[parts[1] as keyof typeof updated.metaAd] = r(updated.metaAd[parts[1] as keyof typeof updated.metaAd]); },
        magazineFullPage:  () => replacePrint(updated.magazineFullPage as PrintRecord),
        magazineHalfPage:  () => replacePrint(updated.magazineHalfPage as PrintRecord),
        postcard:       () => replacePostcard(updated.postcard as PostcardRecord),
        zillow:         () => { if (updated.zillow) updated.zillow = r(updated.zillow); },
        realtorCom:     () => { if (updated.realtorCom) updated.realtorCom = r(updated.realtorCom); },
        homesComTrulia: () => { if (updated.homesComTrulia) updated.homesComTrulia = r(updated.homesComTrulia); },
        mlsDescription: () => { if (updated.mlsDescription) updated.mlsDescription = r(updated.mlsDescription); },
        hashtags:       () => { updated.hashtags = updated.hashtags.map(r); },
        callsToAction:  () => { updated.callsToAction = updated.callsToAction.map(r); },
        targetingNotes: () => { updated.targetingNotes = r(updated.targetingNotes); },
        sellingPoints:  () => { updated.sellingPoints = updated.sellingPoints.map(r); },
      };

      // Google Ads uses indexed key: googleAds[0], googleAds[1], etc.
      if (root.startsWith('googleAds') && updated.googleAds) {
        const match = root.match(/googleAds\[(\d+)\]/);
        if (match) {
          const idx = parseInt(match[1]);
          const field = parts[1] as 'headline' | 'description';
          updated.googleAds[idx][field] = r(updated.googleAds[idx][field]);
        }
      } else {
        replacers[root]?.();
      }

      // Re-run compliance via the agent API
      try {
        const res = await fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign: updated }),
        });

        if (res.ok) {
          const result: ComplianceAgentResult = await res.json();
          updated.complianceResult = result;
        }
      } catch (err) {
        console.error('[campaign-shell] Compliance re-check failed:', err);
      }

      setCampaign(updated);
      sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
    },
    [campaign]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Campaign not found.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            <Button onClick={() => router.push('/create')}>Generate New Campaign</Button>
          </div>
        </div>
      </div>
    );
  }

  async function handleExport(format: 'pdf' | 'csv') {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign!.id, format }),
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Campaign Kit</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/create')}>New Campaign</Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>Export CSV</Button>
            <Button onClick={() => handleExport('pdf')}>Export PDF</Button>
          </div>
        </div>

        {campaign.complianceResult && (
          <ComplianceBanner result={campaign.complianceResult} />
        )}

        <PropertyHeader listing={campaign.listing} />
        <CampaignTabs campaign={campaign} onReplace={handleReplace} />
      </div>
    </div>
  );
}
