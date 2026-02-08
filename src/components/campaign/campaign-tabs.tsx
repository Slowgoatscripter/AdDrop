'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, AdTone, PlatformComplianceResult } from '@/lib/types';
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

export function CampaignTabs({ campaign, onReplace }: CampaignTabsProps) {
  const platforms = campaign.complianceResult?.platforms;
  const photos = campaign.listing.photos;

  return (
    <Tabs defaultValue="social" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="social">Social Media</TabsTrigger>
        <TabsTrigger value="paid">Paid Ads</TabsTrigger>
        <TabsTrigger value="print">Print</TabsTrigger>
        <TabsTrigger value="listings">Online Listings</TabsTrigger>
        <TabsTrigger value="mls">MLS</TabsTrigger>
        <TabsTrigger value="strategy">Strategy</TabsTrigger>
      </TabsList>

      <TabsContent value="social" className="space-y-4 mt-4">
        <InstagramCard content={campaign.instagram} photos={photos} complianceResult={findResult(platforms, 'instagram')} onReplace={onReplace} />
        <FacebookCard content={campaign.facebook} photos={photos} complianceResult={findResult(platforms, 'facebook')} onReplace={onReplace} />
        <AdCard title="Twitter / X Post" content={campaign.twitter} characterLimit={280} subtitle="Ultra-short, link-friendly" complianceResult={findResult(platforms, 'twitter')} onReplace={onReplace} />
      </TabsContent>

      <TabsContent value="paid" className="space-y-4 mt-4">
        <GoogleAdsCard ads={campaign.googleAds} complianceResult={findResult(platforms, 'googleAds')} onReplace={onReplace} />
        <MetaAdCard ad={campaign.metaAd} photos={photos} complianceResult={findResult(platforms, 'metaAd')} onReplace={onReplace} />
      </TabsContent>

      <TabsContent value="print" className="space-y-4 mt-4">
        <PrintAdCard title="Magazine — Full Page" content={campaign.magazineFullPage} photos={photos} subtitle="Headline + body + CTA for full-page print placement" complianceResult={findResult(platforms, 'magazineFullPage')} onReplace={onReplace} />
        <PrintAdCard title="Magazine — Half Page" content={campaign.magazineHalfPage} photos={photos} subtitle="Condensed version for smaller placements" complianceResult={findResult(platforms, 'magazineHalfPage')} onReplace={onReplace} />
        <PostcardCard content={campaign.postcard} photos={photos} complianceResult={findResult(platforms, 'postcard')} onReplace={onReplace} />
      </TabsContent>

      <TabsContent value="listings" className="space-y-4 mt-4">
        <AdCard title="Zillow Description" content={campaign.zillow} subtitle="Optimized for Zillow format and search SEO" complianceResult={findResult(platforms, 'zillow')} onReplace={onReplace} />
        <AdCard title="Realtor.com Description" content={campaign.realtorCom} subtitle="Tuned to Realtor.com tone and format" complianceResult={findResult(platforms, 'realtorCom')} onReplace={onReplace} />
        <AdCard title="Homes.com / Trulia Description" content={campaign.homesComTrulia} subtitle="Platform-specific variation" complianceResult={findResult(platforms, 'homesComTrulia')} onReplace={onReplace} />
      </TabsContent>

      <TabsContent value="mls" className="mt-4">
        <MlsCard description={campaign.mlsDescription} complianceResult={findResult(platforms, 'mlsDescription')} onReplace={onReplace} />
      </TabsContent>

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
