'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PlanCard } from './plan-card'
import type { SubscriptionTier, BillingCycle } from '@/lib/stripe/config'

export interface PriceConfig {
  proMonthly: string
  proAnnual: string
  enterpriseMonthly: string
  enterpriseAnnual: string
}

export interface PricingTableProps {
  currentTier?: SubscriptionTier | null
  showToggle?: boolean
  priceConfig: PriceConfig
}

export function PricingTable({
  currentTier = null,
  showToggle = true,
  priceConfig,
}: PricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const router = useRouter()

  const handleCheckout = useCallback(
    async (priceId: string) => {
      if (!priceId || priceId === 'price_placeholder') return

      setLoadingTier(priceId)
      try {
        const res = await fetch('/api/billing/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          // If user is not authenticated, redirect to sign in
          if (res.status === 401) {
            router.push('/auth/sign-in?redirect=/pricing')
            return
          }
          console.error('Checkout error:', data.error)
          return
        }

        const { url } = await res.json()
        if (url) {
          window.location.href = url
        }
      } catch (err) {
        console.error('Checkout request failed:', err)
      } finally {
        setLoadingTier(null)
      }
    },
    [router]
  )

  const getPriceId = (tier: 'pro' | 'enterprise'): string => {
    if (tier === 'pro') {
      return billingCycle === 'annual'
        ? priceConfig.proAnnual
        : priceConfig.proMonthly
    }
    return billingCycle === 'annual'
      ? priceConfig.enterpriseAnnual
      : priceConfig.enterpriseMonthly
  }

  const getCtaText = (tier: SubscriptionTier): string => {
    if (currentTier === tier) return 'Current Plan'
    if (tier === 'free') return 'Get Started'
    if (!currentTier || currentTier === 'free') return 'Upgrade'
    // Downgrade or cross-grade
    const tierOrder = { free: 0, pro: 1, enterprise: 2 }
    return tierOrder[tier] > tierOrder[currentTier] ? 'Upgrade' : 'Downgrade'
  }

  const plans = [
    {
      name: 'Free',
      tier: 'free' as SubscriptionTier,
      price: 0,
      annualPrice: 0,
      platformCount: '5 platforms',
      campaignLimit: '2 campaigns/mo',
      features: [
        'AI-powered ad copy generation',
        '5 platform formats included',
        'Fair housing compliance checking',
        'Basic export (copy & paste)',
      ],
    },
    {
      name: 'Pro',
      tier: 'pro' as SubscriptionTier,
      price: 9,
      annualPrice: 90,
      platformCount: 'All 12+ platforms',
      campaignLimit: '15 campaigns/mo',
      features: [
        'Everything in Free',
        'All 12+ platform formats',
        'PDF, CSV, JSON, & ZIP export',
        'Shareable campaign links',
        'Regenerate individual platforms',
        'Priority generation queue',
      ],
    },
    {
      name: 'Enterprise',
      tier: 'enterprise' as SubscriptionTier,
      price: 29,
      annualPrice: 290,
      platformCount: 'All 12+ platforms',
      campaignLimit: '75 campaigns/mo',
      features: [
        'Everything in Pro',
        '75 campaigns per month',
        'Team seats (coming soon)',
        'Dedicated support',
        'Custom branding (coming soon)',
      ],
    },
  ]

  return (
    <div className="w-full">
      {/* Billing cycle toggle */}
      {showToggle && (
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              billingCycle === 'monthly'
                ? 'bg-surface text-cream'
                : 'text-muted-foreground hover:text-cream'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors relative',
              billingCycle === 'annual'
                ? 'bg-surface text-cream'
                : 'text-muted-foreground hover:text-cream'
            )}
          >
            Annual
            <Badge className="absolute -top-2.5 -right-16 bg-gold/15 text-gold border border-gold/25 text-[10px] px-1.5 whitespace-nowrap">
              Save 2 months
            </Badge>
          </button>
        </div>
      )}

      {/* Plan cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.tier
          const priceId =
            plan.tier === 'free' ? '' : getPriceId(plan.tier as 'pro' | 'enterprise')

          return (
            <PlanCard
              key={plan.tier}
              name={plan.name}
              price={plan.price}
              annualPrice={plan.annualPrice}
              billingCycle={billingCycle}
              features={plan.features}
              highlighted={plan.tier === 'pro'}
              ctaText={
                loadingTier === priceId
                  ? 'Redirecting...'
                  : getCtaText(plan.tier)
              }
              ctaAction={
                isCurrent || plan.tier === 'free'
                  ? null
                  : () => handleCheckout(priceId)
              }
              disabled={isCurrent || loadingTier !== null}
              platformCount={plan.platformCount}
              campaignLimit={plan.campaignLimit}
            />
          )
        })}
      </div>
    </div>
  )
}
