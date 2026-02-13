'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignKit } from '@/lib/types';
import { autoFixCampaign, checkAllPlatforms, getDefaultCompliance } from '@/lib/compliance/engine';
import { PropertyHeader } from './property-header';
import { CampaignTabs } from './campaign-tabs';
import { ComplianceBanner } from './compliance-banner';
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

  const handleFixAll = useCallback(() => {
    if (!campaign || !campaign.complianceResult) return;

    const config = getDefaultCompliance();
    const fixed = autoFixCampaign(campaign, campaign.complianceResult);
    const newResult = checkAllPlatforms(fixed, config);
    const updated = { ...fixed, complianceResult: newResult };

    setCampaign(updated);
    sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
  }, [campaign]);

  const handleReplace = useCallback(
    (platform: string, oldTerm: string, newTerm: string) => {
      if (!campaign) return;

      const config = getDefaultCompliance();

      // Deep clone and do targeted replacement
      const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

      // Replace the term in the target platform's text
      function replaceInText(text: string): string {
        const regex = new RegExp(`\\b${oldTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-\s]+/g, '[\\s\\-]+')}\\b`, 'gi');
        return text.replace(regex, (matched) => {
          if (matched === matched.toUpperCase() && matched !== matched.toLowerCase()) {
            return newTerm.toUpperCase();
          }
          if (matched[0] === matched[0].toUpperCase() && matched[0] !== matched[0].toLowerCase()) {
            return newTerm.charAt(0).toUpperCase() + newTerm.slice(1);
          }
          return newTerm;
        });
      }

      // Apply replacement based on platform path
      const parts = platform.split('.');
      const root = parts[0];

      if (root === 'instagram' || root === 'facebook') {
        const tone = parts[1];
        if (root === 'instagram' && updated.instagram) {
          updated.instagram[tone as keyof typeof updated.instagram] = replaceInText(updated.instagram[tone as keyof typeof updated.instagram]);
        } else if (root === 'facebook' && updated.facebook) {
          updated.facebook[tone as keyof typeof updated.facebook] = replaceInText(updated.facebook[tone as keyof typeof updated.facebook]);
        }
      } else if (root === 'twitter') {
        if (updated.twitter) updated.twitter = replaceInText(updated.twitter);
      } else if (root.startsWith('googleAds')) {
        if (updated.googleAds) {
          const match = root.match(/googleAds\[(\d+)\]/);
          if (match) {
            const idx = parseInt(match[1]);
            const field = parts[1] as 'headline' | 'description';
            updated.googleAds[idx][field] = replaceInText(updated.googleAds[idx][field]);
          }
        }
      } else if (root === 'metaAd') {
        if (updated.metaAd) {
          const field = parts[1] as keyof typeof updated.metaAd;
          updated.metaAd[field] = replaceInText(updated.metaAd[field]);
        }
      } else if (root === 'magazineFullPage') {
        if (updated.magazineFullPage) {
          const style = parts[1];
          const field = parts[2] as 'headline' | 'body' | 'cta';
          (updated.magazineFullPage as Record<string, { headline: string; body: string; cta: string }>)[style][field] = replaceInText(
            (updated.magazineFullPage as Record<string, { headline: string; body: string; cta: string }>)[style][field]
          );
        }
      } else if (root === 'magazineHalfPage') {
        if (updated.magazineHalfPage) {
          const style = parts[1];
          const field = parts[2] as 'headline' | 'body' | 'cta';
          (updated.magazineHalfPage as Record<string, { headline: string; body: string; cta: string }>)[style][field] = replaceInText(
            (updated.magazineHalfPage as Record<string, { headline: string; body: string; cta: string }>)[style][field]
          );
        }
      } else if (root === 'postcard') {
        if (updated.postcard) {
          const style = parts[1];
          if (parts[2] === 'front') {
            const field = parts[3] as 'headline' | 'body' | 'cta';
            (updated.postcard as Record<string, { front: { headline: string; body: string; cta: string }; back: string }>)[style].front[field] = replaceInText(
              (updated.postcard as Record<string, { front: { headline: string; body: string; cta: string }; back: string }>)[style].front[field]
            );
          } else if (parts[2] === 'back') {
            (updated.postcard as Record<string, { front: any; back: string }>)[style].back = replaceInText(
              (updated.postcard as Record<string, { front: any; back: string }>)[style].back
            );
          }
        }
      } else if (root === 'zillow') {
        if (updated.zillow) updated.zillow = replaceInText(updated.zillow);
      } else if (root === 'realtorCom') {
        if (updated.realtorCom) updated.realtorCom = replaceInText(updated.realtorCom);
      } else if (root === 'homesComTrulia') {
        if (updated.homesComTrulia) updated.homesComTrulia = replaceInText(updated.homesComTrulia);
      } else if (root === 'mlsDescription') {
        if (updated.mlsDescription) updated.mlsDescription = replaceInText(updated.mlsDescription);
      } else if (root === 'hashtags') {
        updated.hashtags = updated.hashtags.map((h) => replaceInText(h));
      } else if (root === 'callsToAction') {
        updated.callsToAction = updated.callsToAction.map((c) => replaceInText(c));
      } else if (root === 'targetingNotes') {
        updated.targetingNotes = replaceInText(updated.targetingNotes);
      } else if (root === 'sellingPoints') {
        updated.sellingPoints = updated.sellingPoints.map((s) => replaceInText(s));
      }

      // Re-run compliance
      const newResult = checkAllPlatforms(updated, config);
      updated.complianceResult = newResult;

      setCampaign(updated);
      sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
    },
    [campaign]
  );

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Campaign not found or session expired.</p>
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Campaign Kit</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>New Campaign</Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>Export CSV</Button>
            <Button onClick={() => handleExport('pdf')}>Export PDF</Button>
          </div>
        </div>

        {campaign.complianceResult && (
          <ComplianceBanner result={campaign.complianceResult} onFixAll={handleFixAll} />
        )}

        <PropertyHeader listing={campaign.listing} />
        <CampaignTabs campaign={campaign} onReplace={handleReplace} />
      </div>
    </div>
  );
}
