import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PricingTable } from '@/components/pricing/pricing-table'
import type { SubscriptionTier } from '@/lib/stripe/config'

export const metadata: Metadata = {
  title: 'Pricing - AdDrop',
  description:
    'Simple, transparent pricing. Start free, upgrade when you need more.',
}

export default async function PricingPage() {
  // Try to get the current user's tier (optional, don't require auth)
  let currentTier: SubscriptionTier | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()
      currentTier = (profile?.subscription_tier as SubscriptionTier) ?? 'free'
    }
  } catch {
    // Not logged in or error — show pricing without current plan indicator
  }

  // Read price IDs from server env vars and pass to client component
  const priceConfig = {
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    proAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
    enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
    enterpriseAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? '',
  }

  return (
    <main className="min-h-screen py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl text-cream mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free. Upgrade when you need more platforms, campaigns, and
            premium features.
          </p>
        </div>

        <PricingTable
          currentTier={currentTier}
          priceConfig={priceConfig}
        />

        {/* FAQ / extra info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include fair housing compliance checking.{' '}
            <a href="/faq" className="text-gold hover:text-gold-bright underline underline-offset-4">
              Questions?
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
