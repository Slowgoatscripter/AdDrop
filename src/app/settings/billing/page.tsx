'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, ExternalLink, AlertTriangle, Crown, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBillingInfo } from './actions'
import type { BillingInfo } from '@/lib/types/subscription'

const TIER_COLORS = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-gold/15 text-gold border-gold/30',
  enterprise: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
} as const

const TIER_LABELS = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
} as const

const TIER_ICONS = {
  free: Zap,
  pro: Crown,
  enterprise: Crown,
} as const

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessToast(true)
      const timer = setTimeout(() => setSuccessToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    async function load() {
      try {
        const info = await getBillingInfo()
        setBilling(info)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing info.')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to open billing portal.')
        setPortalLoading(false)
      }
    } catch {
      setError('Failed to open billing portal.')
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (error && !billing) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!billing) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Unable to load billing information. Please sign in.</p>
      </div>
    )
  }

  const TierIcon = TIER_ICONS[billing.tier]
  const usagePercent = billing.usage.limit === Infinity
    ? 0
    : Math.min(100, Math.round((billing.usage.used / billing.usage.limit) * 100))
  const isUnlimited = billing.usage.limit === Infinity

  return (
    <div className="space-y-8">
      {/* Success toast */}
      {successToast && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
          Subscription updated successfully!
        </div>
      )}

      {/* Past due warning */}
      {billing.status === 'past_due' && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">Payment failed</p>
            <p className="text-sm text-amber-400/80 mt-0.5">
              Please update your payment method to keep your subscription active.
            </p>
          </div>
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="shrink-0 px-3 py-1.5 rounded-md bg-amber-500 text-background text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {portalLoading ? 'Opening...' : 'Update payment'}
          </button>
        </div>
      )}

      {/* Cancellation notice */}
      {billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
        <div className="rounded-md bg-muted border border-border px-4 py-3 text-sm text-muted-foreground">
          Your subscription will end on{' '}
          <span className="text-foreground font-medium">
            {new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          . You can reactivate anytime before then.
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <Badge className={TIER_COLORS[billing.tier]}>
              <TierIcon className="w-3 h-3 mr-1" />
              {TIER_LABELS[billing.tier]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {billing.subscription && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Billing cycle</p>
                <p className="text-foreground font-medium capitalize">
                  {billing.subscription.billing_cycle}
                </p>
              </div>
              {billing.currentPeriodEnd && !billing.cancelAtPeriodEnd && (
                <div>
                  <p className="text-muted-foreground">Renews on</p>
                  <p className="text-foreground font-medium">
                    {new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2">
            {billing.tier === 'free' ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
              >
                <Crown className="w-4 h-4" />
                Upgrade your plan
              </Link>
            ) : (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink className="w-4 h-4" />
                {portalLoading ? 'Opening...' : 'Manage subscription'}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Campaigns this month</span>
            <span className="text-foreground font-medium">
              {isUnlimited
                ? `${billing.usage.used} used (unlimited)`
                : `${billing.usage.used} of ${billing.usage.limit}`}
            </span>
          </div>

          {!isUnlimited && (
            <>
              {/* Progress bar */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent >= 90
                      ? 'bg-destructive'
                      : usagePercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-gold'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {billing.usage.remaining === 0
                  ? 'You have reached your monthly limit.'
                  : `${billing.usage.remaining} campaign${billing.usage.remaining === 1 ? '' : 's'} remaining this month.`}
              </p>

              {billing.usage.remaining === 0 && billing.tier === 'free' && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold/90 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Upgrade for more campaigns
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
