import { SupabaseClient } from '@supabase/supabase-js'
import { TIER_LIMITS, type SubscriptionTier } from '@/lib/stripe/config'

export interface UsageInfo {
  used: number
  limit: number
  remaining: number
  resetsAt: Date | null
  isLimited: boolean
  isExempt: boolean
}

export async function getCampaignUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageInfo> {
  // 1. Check if user is admin or rate-limit exempt, and get subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, rate_limit_exempt, subscription_tier')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin' || profile?.rate_limit_exempt) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      resetsAt: null,
      isLimited: false,
      isExempt: true,
    }
  }

  // 2. Determine tier and its campaign limit
  const tier: SubscriptionTier = profile?.subscription_tier ?? 'free'
  const tierLimit = TIER_LIMITS[tier].campaigns

  // 3. Count campaigns since the 1st of the current calendar month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart)

  const used = count ?? 0

  // 4. Reset date is always the 1st of next month
  const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    used,
    limit: tierLimit,
    remaining: Math.max(0, tierLimit - used),
    resetsAt: used >= tierLimit ? resetsAt : null,
    isLimited: used >= tierLimit,
    isExempt: false,
  }
}
