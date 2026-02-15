import { CampaignComplianceResult } from './compliance';
import { CampaignQualityResult } from './quality';

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

// --- Platform Selection Types ---

export type PlatformId =
  | 'instagram' | 'facebook' | 'twitter'
  | 'googleAds' | 'metaAd'
  | 'magazineFullPage' | 'magazineHalfPage' | 'postcard'
  | 'zillow' | 'realtorCom' | 'homesComTrulia'
  | 'mlsDescription';

export type PlatformCategory = 'social' | 'paid' | 'print' | 'listings' | 'mls';

export const ALL_PLATFORMS: PlatformId[] = [
  'instagram', 'facebook', 'twitter',
  'googleAds', 'metaAd',
  'magazineFullPage', 'magazineHalfPage', 'postcard',
  'zillow', 'realtorCom', 'homesComTrulia',
  'mlsDescription',
];

export interface PlatformOption {
  id: PlatformId;
  label: string;
  icon: string;
  detail: string;
  category: PlatformCategory;
}

export interface PlatformPreset {
  id: string;
  label: string;
  platforms: PlatformId[];
}

// --- CampaignKit ---

export interface CampaignKit {
  id: string;
  listing: import('./listing').ListingData;
  createdAt: string;
  // Platform fields — optional for selective generation
  instagram?: Record<AdTone, string>;
  facebook?: Record<AdTone, string>;
  twitter?: string;
  googleAds?: GoogleAd[];
  metaAd?: MetaAd;
  magazineFullPage?: Record<'professional' | 'luxury', PrintAd>;
  magazineHalfPage?: Record<'professional' | 'luxury', PrintAd>;
  postcard?: Record<'professional' | 'casual', { front: PrintAd; back: string }>;
  zillow?: string;
  realtorCom?: string;
  homesComTrulia?: string;
  mlsDescription?: string;
  // Metadata
  complianceResult: CampaignComplianceResult;
  qualityResult?: CampaignQualityResult;
  selectedPlatforms?: PlatformId[];
  stateCode?: string;
  // Strategy fields — always generated
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
  sellingPoints: string[];
}
