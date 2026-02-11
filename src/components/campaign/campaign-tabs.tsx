'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, AdTone, PlatformComplianceResult, PlatformId } from '@/lib/types';
import { AdCard } from './ad-card';
import { InstagramCard } from './instagram-card';
import { FacebookCard } from './facebook-card';
import { GoogleAdsCard } from './google-ads-card';
import { MetaAdCard } from './meta-ad-card';
import { PrintAdCard } from './print-ad-card';
import { PostcardCard } from './postcard-card';
import { MlsCard } from './mls-card';
import { MarketingCard } from './marketing-card';

const socialTones: AdTone[] = ['professional', 'casual', 'luxury'];

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

// Tailwind needs full class names at build time — no dynamic interpolation
const gridColsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

interface CampaignTabsProps {
  campaign: CampaignKit;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

function findResult(
  platforms: PlatformComplianceResult[] | undefined,
  platform: string
): PlatformComplianceResult | undefined {
  return platforms?.find((p) => p.platform === platform);
}

/** undefined selectedPlatforms = all platforms (backward compat for old campaigns) */
function has(selected: PlatformId[] | undefined, platform: PlatformId): boolean {
  if (!selected) return true;
  return selected.includes(platform);
}

export function CampaignTabs({ campaign, onReplace }: CampaignTabsProps) {
  const platforms = campaign.complianceResult?.platforms;
  const photos = campaign.listing.photos;
  const selected = campaign.selectedPlatforms;

  // Hide entire category tab when 0 platforms in that category are selected
  const visibleCategories = CATEGORIES.filter((cat) =>
    cat.platforms.some((p) => has(selected, p))
  );

  // Strategy is always visible; default to first visible category
  const defaultTab = visibleCategories.length > 0 ? visibleCategories[0].value : 'strategy';
  const tabCount = visibleCategories.length + 1; // +1 for strategy

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className={`grid w-full ${gridColsClass[tabCount] || 'grid-cols-6'}`}>
        {visibleCategories.map((cat) => (
          <TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>
        ))}
        <TabsTrigger value="strategy">Strategy</TabsTrigger>
      </TabsList>

      {/* Social Media */}
      {visibleCategories.some((c) => c.value === 'social') && (
        <TabsContent value="social" className="space-y-4 mt-4">
          {has(selected, 'instagram') && campaign.instagram && (
            <InstagramCard content={campaign.instagram} photos={photos} complianceResult={findResult(platforms, 'instagram')} onReplace={onReplace} />
          )}
          {has(selected, 'facebook') && campaign.facebook && (
            <FacebookCard content={campaign.facebook} photos={photos} complianceResult={findResult(platforms, 'facebook')} onReplace={onReplace} />
          )}
          {has(selected, 'twitter') && campaign.twitter && (
            <AdCard title="Twitter / X Post" content={campaign.twitter} characterLimit={280} subtitle="Ultra-short, link-friendly" complianceResult={findResult(platforms, 'twitter')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Paid Ads */}
      {visibleCategories.some((c) => c.value === 'paid') && (
        <TabsContent value="paid" className="space-y-4 mt-4">
          {has(selected, 'googleAds') && campaign.googleAds && (
            <GoogleAdsCard ads={campaign.googleAds} complianceResult={findResult(platforms, 'googleAds')} onReplace={onReplace} />
          )}
          {has(selected, 'metaAd') && campaign.metaAd && (
            <MetaAdCard ad={campaign.metaAd} photos={photos} complianceResult={findResult(platforms, 'metaAd')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Print */}
      {visibleCategories.some((c) => c.value === 'print') && (
        <TabsContent value="print" className="space-y-4 mt-4">
          {has(selected, 'magazineFullPage') && campaign.magazineFullPage && (
            <PrintAdCard title="Magazine — Full Page" content={campaign.magazineFullPage} photos={photos} subtitle="Headline + body + CTA for full-page print placement" complianceResult={findResult(platforms, 'magazineFullPage')} onReplace={onReplace} />
          )}
          {has(selected, 'magazineHalfPage') && campaign.magazineHalfPage && (
            <PrintAdCard title="Magazine — Half Page" content={campaign.magazineHalfPage} photos={photos} subtitle="Condensed version for smaller placements" complianceResult={findResult(platforms, 'magazineHalfPage')} onReplace={onReplace} />
          )}
          {has(selected, 'postcard') && campaign.postcard && (
            <PostcardCard content={campaign.postcard} photos={photos} complianceResult={findResult(platforms, 'postcard')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Online Listings */}
      {visibleCategories.some((c) => c.value === 'listings') && (
        <TabsContent value="listings" className="space-y-4 mt-4">
          {has(selected, 'zillow') && campaign.zillow && (
            <AdCard title="Zillow Description" content={campaign.zillow} subtitle="Optimized for Zillow format and search SEO" complianceResult={findResult(platforms, 'zillow')} onReplace={onReplace} />
          )}
          {has(selected, 'realtorCom') && campaign.realtorCom && (
            <AdCard title="Realtor.com Description" content={campaign.realtorCom} subtitle="Tuned to Realtor.com tone and format" complianceResult={findResult(platforms, 'realtorCom')} onReplace={onReplace} />
          )}
          {has(selected, 'homesComTrulia') && campaign.homesComTrulia && (
            <AdCard title="Homes.com / Trulia Description" content={campaign.homesComTrulia} subtitle="Platform-specific variation" complianceResult={findResult(platforms, 'homesComTrulia')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* MLS */}
      {visibleCategories.some((c) => c.value === 'mls') && (
        <TabsContent value="mls" className="mt-4">
          {has(selected, 'mlsDescription') && campaign.mlsDescription && (
            <MlsCard description={campaign.mlsDescription} complianceResult={findResult(platforms, 'mlsDescription')} onReplace={onReplace} />
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
            hashtags: findResult(platforms, 'hashtags'),
            callsToAction: findResult(platforms, 'callsToAction'),
            targetingNotes: findResult(platforms, 'targetingNotes'),
            sellingPoints: findResult(platforms, 'sellingPoints'),
          }}
          onReplace={onReplace}
        />
      </TabsContent>
    </Tabs>
  );
}
