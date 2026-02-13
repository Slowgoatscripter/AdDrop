'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, PlatformComplianceResult, PlatformId } from '@/lib/types';
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
            <InstagramCard content={campaign.instagram} photos={photos} listing={listing} complianceResult={findResult(platforms, 'instagram')} onReplace={onReplace} />
          )}
          {has(selected, 'facebook') && campaign.facebook && (
            <FacebookCard content={campaign.facebook} photos={photos} listing={listing} complianceResult={findResult(platforms, 'facebook')} onReplace={onReplace} />
          )}
          {has(selected, 'twitter') && campaign.twitter && (
            <AdCard title="Twitter / X Post" content={campaign.twitter} characterLimit={280} subtitle="Ultra-short, link-friendly" complianceResult={findResult(platforms, 'twitter')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Paid Ads */}
      {visibleCategories.some((c) => c.value === 'paid') && (
        <TabsContent value="paid" className="flex flex-col items-center gap-6 mt-4">
          {has(selected, 'googleAds') && campaign.googleAds && (
            <GoogleAdsCard ads={campaign.googleAds} listing={listing} complianceResult={findResult(platforms, 'googleAds')} onReplace={onReplace} />
          )}
          {has(selected, 'metaAd') && campaign.metaAd && (
            <MetaAdCard content={{ professional: campaign.metaAd }} photos={photos} listing={listing} complianceResult={findResult(platforms, 'metaAd')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Print */}
      {visibleCategories.some((c) => c.value === 'print') && (
        <TabsContent value="print" className="flex flex-col items-center gap-6 mt-4">
          {has(selected, 'magazineFullPage') && campaign.magazineFullPage && (
            <PrintAdCard title="Magazine — Full Page" content={campaign.magazineFullPage} photos={photos} listing={listing} variant="full-page" complianceResult={findResult(platforms, 'magazineFullPage')} onReplace={onReplace} />
          )}
          {has(selected, 'magazineHalfPage') && campaign.magazineHalfPage && (
            <PrintAdCard title="Magazine — Half Page" content={campaign.magazineHalfPage} photos={photos} listing={listing} variant="half-page" complianceResult={findResult(platforms, 'magazineHalfPage')} onReplace={onReplace} />
          )}
          {has(selected, 'postcard') && campaign.postcard && (
            <PostcardCard content={campaign.postcard} photos={photos} listing={listing} complianceResult={findResult(platforms, 'postcard')} onReplace={onReplace} />
          )}
        </TabsContent>
      )}

      {/* Online Listings */}
      {visibleCategories.some((c) => c.value === 'listings') && (
        <TabsContent value="listings" className="flex flex-col items-center gap-6 mt-4">
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
