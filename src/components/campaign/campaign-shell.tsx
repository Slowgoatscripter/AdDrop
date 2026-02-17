'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignKit } from '@/lib/types';
import type { ComplianceAgentResult } from '@/lib/types/compliance';
import type { QualitySuggestion } from '@/lib/types/quality';
import { createClient } from '@/lib/supabase/client';
import { PropertyHeader } from './property-header';
import { CampaignTabs } from './campaign-tabs';
import { QualitySuggestionsPanel } from './quality-suggestions-panel';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

async function persistCampaignAds(id: string, generatedAds: CampaignKit) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ generated_ads: generatedAds })
      .eq('id', id);

    if (error) {
      console.error('[campaign-shell] Supabase persist failed:', error);
      toast.error('Changes saved locally but failed to sync.');
    }
  } catch (err) {
    console.error('[campaign-shell] Supabase persist error:', err);
    toast.error('Changes saved locally but failed to sync.');
  }
}

export function CampaignShell() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);
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
        toast.warning('Changes applied but compliance status may be outdated.');
      }

      setCampaign(updated);
      sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
      persistCampaignAds(updated.id, updated);
    },
    [campaign]
  );

  const handleEditText = useCallback(
    async (platform: string, field: string, newValue: string) => {
      if (!campaign) return;

      const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

      // Simple string platforms
      const simpleStringFields: Record<string, keyof CampaignKit> = {
        twitter: 'twitter',
        zillow: 'zillow',
        realtorCom: 'realtorCom',
        homesComTrulia: 'homesComTrulia',
        mlsDescription: 'mlsDescription',
      };

      if (simpleStringFields[platform]) {
        (updated as unknown as Record<string, unknown>)[platform] = newValue;
      }

      // Tone-keyed platforms: field = tone name
      if (platform === 'instagram' || platform === 'facebook') {
        const platformObj = updated[platform] as Record<string, string> | undefined;
        if (platformObj) {
          platformObj[field] = newValue;
        }
      }

      // metaAd: field = primaryText | headline | description
      if (platform === 'metaAd' && updated.metaAd) {
        (updated.metaAd as unknown as Record<string, string>)[field] = newValue;
      }

      // Google Ads: platform = googleAds[idx], field = headline | description
      const googleMatch = platform.match(/googleAds\[(\d+)\]/);
      if (googleMatch && updated.googleAds) {
        const idx = parseInt(googleMatch[1]);
        (updated.googleAds[idx] as unknown as Record<string, string>)[field] = newValue;
      }

      setCampaign(updated);
      sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));

      // Persist to Supabase (fire and forget)
      try {
        const supabase = createClient();
        await supabase
          .from('campaigns')
          .update({ generated_ads: updated })
          .eq('id', updated.id);
      } catch (err) {
        console.error('[campaign-shell] Failed to persist edit to Supabase:', err);
      }
    },
    [campaign]
  );

  const handleRegenerate = useCallback(
    async (platform: string, tone: string) => {
      if (!campaign) return;
      setRegeneratingPlatform(platform);

      try {
        const res = await fetch('/api/regenerate-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            platform,
            tone,
            listingData: campaign.listing,
          }),
        });

        if (!res.ok) throw new Error('Regeneration failed');

        const { copy } = await res.json();
        const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

        const simpleFields = ['twitter', 'zillow', 'realtorCom', 'homesComTrulia', 'mlsDescription'];
        if (simpleFields.includes(platform)) {
          (updated as unknown as Record<string, unknown>)[platform] = copy;
        }

        setCampaign(updated);
        sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));

        // Persist
        try {
          const supabase = createClient();
          await supabase.from('campaigns').update({ generated_ads: updated }).eq('id', updated.id);
        } catch {}
      } catch (err) {
        console.error('[campaign-shell] Regeneration failed:', err);
      } finally {
        setRegeneratingPlatform(null);
      }
    },
    [campaign]
  );

  /**
   * Apply a quality suggestion: replace the text in the campaign, re-check
   * compliance, and update state. If the new text introduces a compliance
   * violation, revert and alert the user.
   */
  const handleApplySuggestion = useCallback(
    async (suggestion: QualitySuggestion) => {
      if (!campaign || !suggestion.suggestedRewrite) return;

      // Deep-clone so we can revert if needed
      const updated = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

      // Use the same platform-keyed replacement logic as handleReplace,
      // but swap the exact currentText → suggestedRewrite instead of regex.
      const parts = suggestion.platform.split('.');
      const root = parts[0];

      /**
       * Navigate into the campaign object based on the dot-notation platform
       * path and replace `currentText` with `suggestedRewrite`.
       */
      function applyTextSwap(obj: CampaignKit): boolean {
        // Simple string fields
        const simpleStringFields = [
          'twitter', 'zillow', 'realtorCom', 'homesComTrulia',
          'mlsDescription', 'targetingNotes',
        ] as const;

        if (simpleStringFields.includes(root as typeof simpleStringFields[number])) {
          const key = root as keyof CampaignKit;
          const val = obj[key];
          if (typeof val === 'string') {
            (obj as unknown as Record<string, unknown>)[root] = val.replace(
              suggestion.currentText,
              suggestion.suggestedRewrite!,
            );
            return true;
          }
          return false;
        }

        // Tone-keyed social platforms (instagram.casual, facebook.formal, etc.)
        if ((root === 'instagram' || root === 'facebook') && parts[1]) {
          const platformObj = obj[root] as Record<string, string> | undefined;
          if (platformObj && typeof platformObj[parts[1]] === 'string') {
            platformObj[parts[1]] = platformObj[parts[1]].replace(
              suggestion.currentText,
              suggestion.suggestedRewrite!,
            );
            return true;
          }
          return false;
        }

        // metaAd (metaAd.primaryText, metaAd.headline, etc.)
        if (root === 'metaAd' && parts[1] && obj.metaAd) {
          const field = parts[1] as keyof typeof obj.metaAd;
          if (typeof obj.metaAd[field] === 'string') {
            (obj.metaAd as unknown as Record<string, string>)[parts[1]] = (
              obj.metaAd[field] as string
            ).replace(suggestion.currentText, suggestion.suggestedRewrite!);
            return true;
          }
          return false;
        }

        // Google Ads indexed: googleAds[0].headline
        if (root.startsWith('googleAds') && obj.googleAds) {
          const match = root.match(/googleAds\[(\d+)\]/);
          if (match) {
            const idx = parseInt(match[1]);
            const field = parts[1] as 'headline' | 'description';
            if (obj.googleAds[idx] && typeof obj.googleAds[idx][field] === 'string') {
              obj.googleAds[idx][field] = obj.googleAds[idx][field].replace(
                suggestion.currentText,
                suggestion.suggestedRewrite!,
              );
              return true;
            }
          }
          return false;
        }

        // Array fields (hashtags, callsToAction, sellingPoints)
        const arrayFields = ['hashtags', 'callsToAction', 'sellingPoints'] as const;
        if (arrayFields.includes(root as typeof arrayFields[number])) {
          const arr = obj[root as keyof CampaignKit] as string[] | undefined;
          if (arr) {
            const arrIdx = arr.findIndex((item) => item.includes(suggestion.currentText));
            if (arrIdx !== -1) {
              arr[arrIdx] = arr[arrIdx].replace(
                suggestion.currentText,
                suggestion.suggestedRewrite!,
              );
              return true;
            }
          }
          return false;
        }

        // Magazine / postcard — same nested approach
        if ((root === 'magazineFullPage' || root === 'magazineHalfPage') && parts[1] && parts[2]) {
          const printData = obj[root] as Record<string, { headline: string; body: string; cta: string }> | undefined;
          if (printData && printData[parts[1]]) {
            const field = parts[2] as 'headline' | 'body' | 'cta';
            printData[parts[1]][field] = printData[parts[1]][field].replace(
              suggestion.currentText,
              suggestion.suggestedRewrite!,
            );
            return true;
          }
          return false;
        }

        if (root === 'postcard' && parts[1]) {
          const postcardData = obj[root] as Record<string, { front: { headline: string; body: string; cta: string }; back: string }> | undefined;
          if (postcardData && postcardData[parts[1]]) {
            if (parts[2] === 'front' && parts[3]) {
              const field = parts[3] as 'headline' | 'body' | 'cta';
              postcardData[parts[1]].front[field] = postcardData[parts[1]].front[field].replace(
                suggestion.currentText,
                suggestion.suggestedRewrite!,
              );
              return true;
            }
            if (parts[2] === 'back') {
              postcardData[parts[1]].back = postcardData[parts[1]].back.replace(
                suggestion.currentText,
                suggestion.suggestedRewrite!,
              );
              return true;
            }
          }
          return false;
        }

        return false;
      }

      const applied = applyTextSwap(updated);
      if (!applied) {
        toast.warning('Could not apply suggestion — text may have already changed.');
        return;
      }

      setApplyingId(suggestion.id);

      try {
        const beforeViolationCount = campaign.complianceResult?.violations?.length ?? 0;

        // Re-check compliance on the modified campaign
        try {
          const res = await fetch('/api/compliance/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign: updated }),
          });

          if (res.ok) {
            const result: ComplianceAgentResult = await res.json();

            // If the new text introduces a compliance violation, revert
            if (result.violations && result.violations.length > beforeViolationCount) {
              const newViolations = result.violations.slice(beforeViolationCount);
              toast.error(
                'This suggestion introduces a compliance violation and was not applied: ' +
                newViolations.map((v) => `${v.term}: ${v.explanation}`).join('; '),
              );
              return;
            }

            updated.complianceResult = result;
          }
        } catch (err) {
          console.error('[campaign-shell] Compliance re-check failed after suggestion apply:', err);
          // If compliance check fails, still apply the text change but warn
          toast.warning('Suggestion applied but compliance status may be outdated.');
        }

        // Remove the applied suggestion from the list
        updated.qualitySuggestions = updated.qualitySuggestions?.filter(
          (s) => s.id !== suggestion.id,
        );

        setCampaign(updated);
        sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
        persistCampaignAds(updated.id, updated);
      } finally {
        setApplyingId(null);
      }
    },
    [campaign],
  );

  /** Dismiss a quality suggestion without applying it */
  const handleDismissSuggestion = useCallback(
    (suggestionId: string) => {
      if (!campaign) return;
      const updated: CampaignKit = {
        ...campaign,
        qualitySuggestions: campaign.qualitySuggestions?.filter(
          (s) => s.id !== suggestionId,
        ),
      };
      setCampaign(updated);
      persistCampaignAds(updated.id, updated);
    },
    [campaign],
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
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign!.id, format }),
      });

      if (!res.ok) {
        toast.error('Export failed — please try again.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign!.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch (err) {
      console.error('[campaign-shell] Export failed:', err);
      toast.error('Export failed — please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Campaign Kit</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/create')}>New Campaign</Button>
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>{exporting ? 'Exporting…' : 'Export CSV'}</Button>
            <Button onClick={() => handleExport('pdf')} disabled={exporting}>{exporting ? 'Exporting…' : 'Export PDF'}</Button>
          </div>
        </div>

        {campaign.complianceResult && campaign.complianceResult.violations?.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="font-medium">
              {campaign.complianceResult.violations.length} compliance {campaign.complianceResult.violations.length === 1 ? 'issue' : 'issues'} found
            </span>
            <span className="text-amber-600">— View issues below each ad card</span>
          </div>
        )}

        {/* Constraints section — keep full panel since these are auto-enforced and campaign-level */}
        {campaign.qualityConstraints && campaign.qualityConstraints.length > 0 && (
          <QualitySuggestionsPanel
            suggestions={[]}
            constraints={campaign.qualityConstraints}
            onApply={handleApplySuggestion}
            onDismiss={handleDismissSuggestion}
            applyingId={applyingId}
          />
        )}

        {/* Quality suggestions summary — details now live per-card */}
        {campaign.qualitySuggestions && campaign.qualitySuggestions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="font-medium">
              {campaign.qualitySuggestions.length} quality {campaign.qualitySuggestions.length === 1 ? 'suggestion' : 'suggestions'}
            </span>
            <span className="text-amber-600">— Review below each ad card</span>
          </div>
        )}

        <PropertyHeader listing={campaign.listing} />
        <CampaignTabs campaign={campaign} onReplace={handleReplace} onEditText={handleEditText} onRegenerate={handleRegenerate} regeneratingPlatform={regeneratingPlatform} qualitySuggestions={campaign.qualitySuggestions} qualityConstraints={campaign.qualityConstraints} onApplySuggestion={handleApplySuggestion} onDismissSuggestion={handleDismissSuggestion} />
      </div>
    </div>
  );
}
