'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, AdTone } from '@/lib/types';
import { AdCard } from './ad-card';
import { GoogleAdsCard } from './google-ads-card';
import { MetaAdCard } from './meta-ad-card';
import { PrintAdCard } from './print-ad-card';
import { PostcardCard } from './postcard-card';
import { MlsCard } from './mls-card';
import { MarketingCard } from './marketing-card';

const socialTones: AdTone[] = ['professional', 'casual', 'luxury'];

interface CampaignTabsProps {
  campaign: CampaignKit;
}

export function CampaignTabs({ campaign }: CampaignTabsProps) {
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
        <AdCard title="Instagram Caption" content={campaign.instagram} tones={socialTones} characterLimit={2200} subtitle="Emoji-friendly, optimized for engagement" />
        <AdCard title="Facebook Post" content={campaign.facebook} tones={socialTones} subtitle="Conversational, lifestyle-focused, 500-800 words" />
        <AdCard title="Twitter / X Post" content={campaign.twitter} characterLimit={280} subtitle="Ultra-short, link-friendly" />
      </TabsContent>

      <TabsContent value="paid" className="space-y-4 mt-4">
        <GoogleAdsCard ads={campaign.googleAds} />
        <MetaAdCard ad={campaign.metaAd} />
      </TabsContent>

      <TabsContent value="print" className="space-y-4 mt-4">
        <PrintAdCard title="Magazine — Full Page" content={campaign.magazineFullPage} subtitle="Headline + body + CTA for full-page print placement" />
        <PrintAdCard title="Magazine — Half Page" content={campaign.magazineHalfPage} subtitle="Condensed version for smaller placements" />
        <PostcardCard content={campaign.postcard} />
      </TabsContent>

      <TabsContent value="listings" className="space-y-4 mt-4">
        <AdCard title="Zillow Description" content={campaign.zillow} subtitle="Optimized for Zillow format and search SEO" />
        <AdCard title="Realtor.com Description" content={campaign.realtorCom} subtitle="Tuned to Realtor.com tone and format" />
        <AdCard title="Homes.com / Trulia Description" content={campaign.homesComTrulia} subtitle="Platform-specific variation" />
      </TabsContent>

      <TabsContent value="mls" className="mt-4">
        <MlsCard description={campaign.mlsDescription} checklist={campaign.mlsComplianceChecklist} />
      </TabsContent>

      <TabsContent value="strategy" className="mt-4">
        <MarketingCard sellingPoints={campaign.sellingPoints} hashtags={campaign.hashtags} callsToAction={campaign.callsToAction} targetingNotes={campaign.targetingNotes} />
      </TabsContent>
    </Tabs>
  );
}
