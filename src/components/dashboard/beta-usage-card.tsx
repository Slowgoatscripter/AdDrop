'use client'

import type { UsageInfo } from '@/lib/usage/campaign-limits'
import { useFeedbackOptional } from '@/components/feedback/feedback-provider'

function formatResetDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function BetaUsageCard({ usage }: { usage: UsageInfo }) {
  const feedback = useFeedbackOptional()

  // Exempt users (admins or overridden) see unlimited state
  if (usage.isExempt) {
    return (
      <div className="border-l-2 border-l-gold bg-surface rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-widest bg-gold/10 text-gold px-1.5 py-0.5 rounded-sm font-bold">
            Beta
          </span>
          <span className="text-[10px] uppercase tracking-widest text-gold/70 font-bold">
            Unlimited
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
    <div className="border-l-2 border-l-gold bg-surface rounded-lg p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest bg-gold/10 text-gold px-1.5 py-0.5 rounded-sm font-bold">
          Beta
        </span>
        <span className="text-xs text-muted-foreground">
          {usage.used} of {usage.limit} used
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-background rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status text */}
      {usage.isLimited ? (
        <div>
          <p className="text-sm text-cream">
            You&apos;ve used both campaigns this week.
          </p>
          {usage.resetsAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Next campaign available{' '}
              <span className="text-gold">
                {formatResetDate(usage.resetsAt)}
              </span>
              .
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            In the meantime, you can edit your existing campaigns or export
            them.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-cream">
            You have{' '}
            <span className="text-gold font-medium">{usage.remaining}</span>{' '}
            campaign{usage.remaining !== 1 ? 's' : ''} remaining this week.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Resets every 7 days. Enjoying AdDrop?{' '}
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
        </div>
      )}
    </div>
  )
}
