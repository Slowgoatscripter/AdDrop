'use client'

import Link from 'next/link'
import type { UsageInfo } from '@/lib/usage/campaign-limits'
import type { SubscriptionTier } from '@/lib/stripe/config'
import { useFeedbackOptional } from '@/components/feedback/feedback-provider'

const TIER_BADGE_STYLES: Record<SubscriptionTier, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-gold/10 text-gold',
  enterprise: 'bg-purple-500/10 text-purple-400',
}

const TIER_ACCENT: Record<SubscriptionTier, string> = {
  free: 'border-l-muted-foreground',
  pro: 'border-l-gold',
  enterprise: 'border-l-purple-400',
}

const TIER_BAR_COLOR: Record<SubscriptionTier, string> = {
  free: 'bg-muted-foreground',
  pro: 'bg-gold',
  enterprise: 'bg-purple-400',
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

function formatResetDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function TierUsageCard({
  usage,
  tier,
}: {
  usage: UsageInfo
  tier: SubscriptionTier
}) {
  const feedback = useFeedbackOptional()

  // Exempt users (admins or overridden) see unlimited state
  if (usage.isExempt) {
    return (
      <div className={`border-l-2 ${TIER_ACCENT[tier]} bg-surface rounded-lg p-5`}>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm font-bold ${TIER_BADGE_STYLES[tier]}`}
          >
            {TIER_LABEL[tier]}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-gold/70 font-bold">
            Admin (unlimited)
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Rate limit removed by admin. Create as many campaigns as you need.
        </p>
      </div>
    )
  }

  const progressPercent = Math.min(100, (usage.used / usage.limit) * 100)

  return (
    <div className={`border-l-2 ${TIER_ACCENT[tier]} bg-surface rounded-lg p-5`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm font-bold ${TIER_BADGE_STYLES[tier]}`}
        >
          {TIER_LABEL[tier]}
        </span>
        <span className="text-xs text-muted-foreground">
          {usage.used} of {usage.limit} used this month
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-background rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${TIER_BAR_COLOR[tier]} rounded-full transition-all duration-500`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status text */}
      {usage.isLimited ? (
        <div>
          <p className="text-sm text-cream">
            You&apos;ve reached your {TIER_LABEL[tier]} plan limit this month.
          </p>
          {usage.resetsAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Resets on{' '}
              <span className={tier === 'free' ? 'text-muted-foreground font-medium' : 'text-gold'}>
                {formatResetDate(usage.resetsAt)}
              </span>
              .
            </p>
          )}
          {tier === 'free' ? (
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold/90 transition-colors"
              >
                Upgrade to Pro
              </Link>
              <span className="text-xs text-muted-foreground">
                Unlock all platforms and more campaigns
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              You can still edit and export your existing campaigns.
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-cream">
            You have{' '}
            <span className={`font-medium ${tier === 'free' ? 'text-muted-foreground' : 'text-gold'}`}>
              {usage.remaining}
            </span>{' '}
            campaign{usage.remaining !== 1 ? 's' : ''} remaining this month.
          </p>
          {tier === 'free' ? (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Unlock all platforms and features.{' '}
                <Link
                  href="/pricing"
                  className="text-gold hover:text-gold-bright underline-offset-4 hover:underline"
                >
                  Upgrade to Pro
                </Link>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Resets monthly. Enjoying AdDrop?{' '}
              {feedback ? (
                <button
                  onClick={feedback.open}
                  className="text-gold hover:text-gold-bright underline-offset-4 hover:underline cursor-pointer"
                >
                  We&apos;d love your feedback.
                </button>
              ) : (
                <>We&apos;d love your feedback.</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
