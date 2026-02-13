import { SupabaseClient } from '@supabase/supabase-js'

export const BETA_CAMPAIGN_LIMIT = 2
export const BETA_WINDOW_DAYS = 7

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
  // 1. Check if user is admin or rate-limit exempt
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, rate_limit_exempt')
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

  // 2. Count campaigns in rolling 7-day window
  const windowStart = new Date(
    Date.now() - BETA_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart)

  const used = count ?? 0

  // 3. Calculate reset date from oldest campaign in window + 7 days
  let resetsAt: Date | null = null
  if (used >= BETA_CAMPAIGN_LIMIT) {
    const { data: oldest } = await supabase
      .from('campaigns')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (oldest) {
      resetsAt = new Date(
        new Date(oldest.created_at).getTime() +
          BETA_WINDOW_DAYS * 24 * 60 * 60 * 1000
      )
    }
  }

  return {
    used,
    limit: BETA_CAMPAIGN_LIMIT,
    remaining: Math.max(0, BETA_CAMPAIGN_LIMIT - used),
    resetsAt,
    isLimited: used >= BETA_CAMPAIGN_LIMIT,
    isExempt: false,
  }
}
