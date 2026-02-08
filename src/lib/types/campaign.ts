export type AdTone = 'professional' | 'casual' | 'luxury';

export interface AdVariation {
  platform: string;
  tone?: AdTone;
  headline?: string;
  body: string;
  characterCount: number;
  characterLimit?: number;
}

export interface GoogleAd {
  headline: string;
  description: string;
}

export interface MetaAd {
  primaryText: string;
  headline: string;
  description: string;
}

export interface PrintAd {
  headline: string;
  body: string;
  cta: string;
}

export interface ComplianceCheckItem {
  rule: string;
  passed: boolean;
  detail?: string;
}

export interface CampaignKit {
  id: string;
  listing: import('./listing').ListingData;
  createdAt: string;
  instagram: Record<AdTone, string>;
  facebook: Record<AdTone, string>;
  twitter: string;
  googleAds: GoogleAd[];
  metaAd: MetaAd;
  magazineFullPage: Record<'professional' | 'luxury', PrintAd>;
  magazineHalfPage: Record<'professional' | 'luxury', PrintAd>;
  postcard: Record<'professional' | 'casual', { front: PrintAd; back: string }>;
  zillow: string;
  realtorCom: string;
  homesComTrulia: string;
  mlsDescription: string;
  mlsComplianceChecklist: ComplianceCheckItem[];
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
  sellingPoints: string[];
}
