'use server'

import { createClient } from '@/lib/supabase/server'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import type { BillingInfo } from '@/lib/types/subscription'

export async function getBillingInfo(): Promise<BillingInfo | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get profile with tier info
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id, subscription_status, current_period_end')
    .eq('id', user.id)
    .single()

  // Get subscription details if exists
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // Get usage
  const usage = await getCampaignUsage(supabase, user.id)

  return {
    tier: profile?.subscription_tier || 'free',
    status: profile?.subscription_status || 'none',
    subscription: subscription || null,
    usage: {
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
    },
    currentPeriodEnd: profile?.current_period_end || null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
  }
}
