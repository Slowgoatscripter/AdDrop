import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import type { SubscriptionTier } from './config'
import { TIER_FEATURES } from './config'

type GatedFeature = keyof typeof TIER_FEATURES.free

/**
 * Check if a user's tier grants access to a specific feature.
 * Returns null if allowed, or a 403 NextResponse if blocked.
 */
export function requireTierFeature(
  tier: SubscriptionTier,
  feature: GatedFeature
): NextResponse | null {
  if (TIER_FEATURES[tier][feature]) {
    return null
  }
  const upgradeMessage = feature === 'teamSeats'
    ? 'Team seats require an Enterprise plan.'
    : 'This feature requires a Pro or Enterprise plan.'

  return NextResponse.json(
    {
      error: upgradeMessage,
      code: 'TIER_RESTRICTED',
      requiredTier: feature === 'teamSeats' ? 'enterprise' : 'pro',
      currentTier: tier,
    },
    { status: 403 }
  )
}

/**
 * Get user's tier from their profile. Defaults to 'free'.
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionTier> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()
  return data?.subscription_tier || 'free'
}
