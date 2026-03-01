import type { SubscriptionTier, BillingCycle } from '@/lib/stripe/config'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  tier: SubscriptionTier
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
  billing_cycle: BillingCycle
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface BillingInfo {
  tier: SubscriptionTier
  status: 'none' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  subscription: Subscription | null
  usage: {
    used: number
    limit: number
    remaining: number
  }
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}
