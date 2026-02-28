import { ComplianceAgentResult } from './compliance';
import { CampaignQualityResult } from './quality';

export type AdTone = 'professional' | 'casual' | 'luxury';

export type AudioTone = 'conversational' | 'authoritative' | 'friendly';

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

export interface RadioScript {
  script: string;
  wordCount: number;
  estimatedDuration: number;
  notes?: string;
  voiceStyle?: string;
  musicSuggestion?: string;
}

export type RadioTimeSlot = '15s' | '30s' | '60s';
export type RadioTone = 'conversational' | 'authoritative' | 'friendly';

/** Radio ad content keyed by time slot (e.g. '30s', '60s') then by RadioTone */
export interface RadioAdsContent {
  [timeSlot: string]: Record<RadioTone, RadioScript>;
}

// --- Platform Selection Types ---

export type PlatformId =
  | 'instagram' | 'facebook' | 'twitter'
  | 'googleAds' | 'metaAd'
  | 'magazineFullPage' | 'magazineHalfPage' | 'postcard'
  | 'zillow' | 'realtorCom' | 'homesComTrulia'
  | 'mlsDescription'
  | 'radioAds';

export type PlatformCategory = 'social' | 'paid' | 'print' | 'listings' | 'mls' | 'audio';

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
  radioAds?: RadioAdsContent;
  // Metadata
  complianceResult: ComplianceAgentResult;
  qualityResult?: CampaignQualityResult;
  /** Advisory quality suggestions -- user applies via UI (replaces auto-fix) */
  qualitySuggestions?: import('./quality').QualitySuggestion[];
  /** Auto-enforced hard constraints (char limits, disclosures) */
  qualityConstraints?: import('./quality').QualityConstraintViolation[];
  selectedPlatforms?: PlatformId[];
  /** The subscription tier when this campaign was generated (for grandfathering) */
  generated_at_tier?: import('../stripe/config').SubscriptionTier;
  stateCode?: string;
  // Strategy fields — always generated
  hashtags: string[];
  callsToAction: string[];
  targetingNotes: string;
  sellingPoints: string[];
}
