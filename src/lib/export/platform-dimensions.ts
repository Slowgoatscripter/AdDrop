// Platform photo dimensions for export
export interface PlatformDimension {
  platform: string;
  label: string;
  width: number;
  height: number;
  filenamePrefix: string;
}

export const PLATFORM_DIMENSIONS: PlatformDimension[] = [
  { platform: 'instagram', label: 'Instagram Post', width: 1080, height: 1080, filenamePrefix: 'Instagram' },
  { platform: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920, filenamePrefix: 'Instagram-Story' },
  { platform: 'facebook', label: 'Facebook Post', width: 1200, height: 630, filenamePrefix: 'Facebook' },
  { platform: 'twitter', label: 'Twitter/X Post', width: 1600, height: 900, filenamePrefix: 'Twitter' },
  { platform: 'linkedin', label: 'LinkedIn Post', width: 1200, height: 627, filenamePrefix: 'LinkedIn' },
];

// Character count limits per platform
export interface CharLimit {
  element: string;
  limit: number;
  type: 'hard' | 'truncation';
  notes?: string;
}

export const PLATFORM_CHAR_LIMITS: Record<string, CharLimit[]> = {
  twitter: [
    { element: 'tweet', limit: 280, type: 'hard' },
  ],
  googleAds: [
    { element: 'headline', limit: 30, type: 'hard' },
    { element: 'description', limit: 90, type: 'hard' },
  ],
  metaAd: [
    { element: 'primaryText', limit: 125, type: 'truncation', notes: 'Before "see more"' },
    { element: 'headline', limit: 40, type: 'hard' },
    { element: 'description', limit: 30, type: 'hard' },
  ],
  instagram: [
    { element: 'caption-visible', limit: 125, type: 'truncation', notes: 'Before "more"' },
    { element: 'caption-total', limit: 2200, type: 'hard' },
  ],
  facebook: [
    { element: 'post-visible', limit: 477, type: 'truncation', notes: 'Before "see more"' },
  ],
  zillow: [
    { element: 'description', limit: 4500, type: 'hard', notes: 'Approximate' },
  ],
  realtorCom: [
    { element: 'description', limit: 5000, type: 'hard', notes: 'Approximate' },
  ],
  homesComTrulia: [
    { element: 'description', limit: 4000, type: 'hard', notes: 'Approximate' },
  ],
  mlsDescription: [
    { element: 'description', limit: 2000, type: 'hard', notes: 'Safe default, varies by provider' },
  ],
};

// Supabase storage domain for SSRF validation
export const ALLOWED_PHOTO_DOMAINS = [
  'qunrofzwejafqzssmkpa.supabase.co',
];

export function isAllowedPhotoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_PHOTO_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}
