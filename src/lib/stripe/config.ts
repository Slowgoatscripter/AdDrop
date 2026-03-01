export type SubscriptionTier = 'free' | 'pro' | 'enterprise'
export type BillingCycle = 'monthly' | 'annual'

export const TIER_LIMITS = {
  free: { campaigns: 2, platforms: 5 },
  pro: { campaigns: 15, platforms: Infinity },
  enterprise: { campaigns: 75, platforms: Infinity },
} as const

export const FREE_PLATFORMS = [
  'instagram',
  'facebook',
  'mlsDescription',
  'googleAds',
  'twitter',
] as const

export const TIER_FEATURES = {
  free: { export: false, share: false, regenerate: false, teamSeats: false },
  pro: { export: true, share: true, regenerate: true, teamSeats: false },
  enterprise: { export: true, share: true, regenerate: true, teamSeats: true },
} as const

/**
 * Maps Stripe Price IDs to tiers. Populated from env vars.
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  const priceToTier: Record<string, SubscriptionTier> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL!]: 'pro',
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!]: 'enterprise',
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!]: 'enterprise',
  }
  return priceToTier[priceId] || 'free'
}

export function getBillingCycleFromPriceId(priceId: string): BillingCycle {
  const annualPrices = [
    process.env.STRIPE_PRICE_PRO_ANNUAL!,
    process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!,
  ]
  return annualPrices.includes(priceId) ? 'annual' : 'monthly'
}
