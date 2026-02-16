'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, PlatformId, ComplianceAgentResult, ComplianceViolation, PlatformComplianceResult } from '@/lib/types';
import { AdCard } from './ad-card';
import { InstagramCard } from './instagram-card';
import { FacebookCard } from './facebook-card';
import { GoogleAdsCard } from './google-ads-card';
import { MetaAdCard } from './meta-ad-card';
import { PrintAdCard } from './print-ad-card';
import { PostcardCard } from './postcard-card';
import { MlsCard } from './mls-card';
import { MarketingCard } from './marketing-card';

interface CategoryConfig {
  value: string;
  label: string;
  platforms: PlatformId[];
}

const CATEGORIES: CategoryConfig[] = [
  { value: 'social', label: 'Social Media', platforms: ['instagram', 'facebook', 'twitter'] },
  { value: 'paid', label: 'Paid Ads', platforms: ['googleAds', 'metaAd'] },
  { value: 'print', label: 'Print', platforms: ['magazineFullPage', 'magazineHalfPage', 'postcard'] },
  { value: 'listings', label: 'Online Listings', platforms: ['zillow', 'realtorCom', 'homesComTrulia'] },
  { value: 'mls', label: 'MLS', platforms: ['mlsDescription'] },
];

interface CampaignTabsProps {
  campaign: CampaignKit;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

function buildPlatformResult(
  agentResult: ComplianceAgentResult | undefined,
  platformPrefix: string
): PlatformComplianceResult | undefined {
  if (!agentResult) return undefined;

  const platformVerdict = agentResult.platforms.find(p => p.platform === platformPrefix);
  if (!platformVerdict) return undefined;

  // Filter violations for this platform (exact match or dot-prefixed sub-platforms)
  const violations: ComplianceViolation[] = agentResult.violations
    .filter(v => v.platform === platformPrefix || v.platform.startsWith(platformPrefix + '.'))
    .map(v => {
      // Find matching auto-fix for suggested alternative
      const fix = agentResult.autoFixes.find(
        f => f.platform === v.platform && f.violationTerm === v.term
      );
      return {
        platform: v.platform,
        term: v.term,
        category: v.category,
        severity: v.severity,
        explanation: v.explanation,
        law: v.law,
        alternative: fix?.after || 'review this term',
        context: v.term,
      };
    });

  return {
    platform: platformPrefix,
    violations,
    passed: platformVerdict.verdict === 'pass',
    hardCount: violations.filter(v => v.severity === 'hard').length,
    softCount: violations.filter(v => v.severity === 'soft').length,
  };
}

/** undefined selectedPlatforms = all platforms (backward compat for old campaigns) */
function has(selected: PlatformId[] | undefined, platform: PlatformId): boolean {
  if (!selected) return true;
  return selected.includes(platform);
}

export function CampaignTabs({ campaign, onReplace }: CampaignTabsProps) {
  const agentResult = campaign.complianceResult;
  const photos = campaign.listing.photos;
  const listing = campaign.listing;
  const selected = campaign.selectedPlatforms;

  // Hide entire category tab when 0 platforms in that category are selected
  const visibleCategories = CATEGORIES.filter((cat) =>
    cat.platforms.some((p) => has(selected, p))
  );

  // Strategy is always visible; default to first visible category
  const defaultTab = visibleCategories.length > 0 ? visibleCategories[0].value : 'strategy';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="flex overflow-x-auto flex-nowrap w-full">
        {visibleCategories.map((cat) => (
          <TabsTrigger key={cat.value} value={cat.value} className="flex-shrink-0">{cat.label}</TabsTrigger>
        ))}
        <TabsTrigger value="strategy" className="flex-shrink-0">Strategy</TabsTrigger>
      </TabsList>

      {/* Social Media */}
      {visibleCategories.some((c) => c.value === 'social') && (
        <TabsContent value="social" className="flex flex-col items-center gap-6 mt-4">
          {has(selected, 'instagram') && campaign.instagram && (
            <InstagramCard content={campaign.instagram} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, 'instagram')} onReplace={onReplace} />
          )}
          {has(selected, 'facebook') && campaign.facebook && (
            <FacebookCard content={campaign.facebook} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, 'facebook')} onReplace={onReplace} />
          )}
          {has(selected, 'twitter') && campaign.twitter && (
            <AdCard title="Twitter / X Post" content={campaign.twitter} characterLimit={280} subtitle="Ultra-short, link-friendly" complianceResult={buildPlatformResult(agentResult, 'twitter')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Paid Ads */}
      {visibleCategories.some((c) => c.value === 'paid') && (
        <TabsContent value="paid" className="flex flex-col items-center gap-6 mt-4">
          {has(selected, 'googleAds') && campaign.googleAds && (
            <GoogleAdsCard ads={campaign.googleAds} listing={listing} complianceResult={buildPlatformResult(agentResult, 'googleAds')} onReplace={onReplace} />
          )}
          {has(selected, 'metaAd') && campaign.metaAd && (
            <MetaAdCard content={{ professional: campaign.metaAd }} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, 'metaAd')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Print */}
      {visibleCategories.some((c) => c.value === 'print') && (
        <TabsContent value="print" className="flex flex-col items-center gap-6 mt-4">
          {has(selected, 'magazineFullPage') && campaign.magazineFullPage && (
            <PrintAdCard title="Magazine — Full Page" content={campaign.magazineFullPage} photos={photos} listing={listing} variant="full-page" complianceResult={buildPlatformResult(agentResult, 'magazineFullPage')} onReplace={onReplace} />
          )}
          {has(selected, 'magazineHalfPage') && campaign.magazineHalfPage && (
            <PrintAdCard title="Magazine — Half Page" content={campaign.magazineHalfPage} photos={photos} listing={listing} variant="half-page" complianceResult={buildPlatformResult(agentResult, 'magazineHalfPage')} onReplace={onReplace} />
          )}
          {has(selected, 'postcard') && campaign.postcard && (
            <PostcardCard content={campaign.postcard} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, 'postcard')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Online Listings */}
      {visibleCategories.some((c) => c.value === 'listings') && (
        <TabsContent value="listings" className="flex flex-col items-center gap-6 mt-4">
          {has(selected, 'zillow') && campaign.zillow && (
            <AdCard title="Zillow Description" content={campaign.zillow} subtitle="Optimized for Zillow format and search SEO" complianceResult={buildPlatformResult(agentResult, 'zillow')} onReplace={onReplace} />
          )}
          {has(selected, 'realtorCom') && campaign.realtorCom && (
            <AdCard title="Realtor.com Description" content={campaign.realtorCom} subtitle="Tuned to Realtor.com tone and format" complianceResult={buildPlatformResult(agentResult, 'realtorCom')} onReplace={onReplace} />
          )}
          {has(selected, 'homesComTrulia') && campaign.homesComTrulia && (
            <AdCard title="Homes.com / Trulia Description" content={campaign.homesComTrulia} subtitle="Platform-specific variation" complianceResult={buildPlatformResult(agentResult, 'homesComTrulia')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* MLS */}
      {visibleCategories.some((c) => c.value === 'mls') && (
        <TabsContent value="mls" className="mt-4">
          {has(selected, 'mlsDescription') && campaign.mlsDescription && (
            <MlsCard description={campaign.mlsDescription} complianceResult={buildPlatformResult(agentResult, 'mlsDescription')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Strategy — always visible */}
      <TabsContent value="strategy" className="mt-4">
        <MarketingCard
          sellingPoints={campaign.sellingPoints}
          hashtags={campaign.hashtags}
          callsToAction={campaign.callsToAction}
          targetingNotes={campaign.targetingNotes}
          complianceResults={{
            hashtags: buildPlatformResult(agentResult, 'hashtags'),
            callsToAction: buildPlatformResult(agentResult, 'callsToAction'),
            targetingNotes: buildPlatformResult(agentResult, 'targetingNotes'),
            sellingPoints: buildPlatformResult(agentResult, 'sellingPoints'),
          }}
          onReplace={onReplace}
        />
      </TabsContent>
    </Tabs>
  );
}
