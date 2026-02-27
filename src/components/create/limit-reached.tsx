<<<<<<<< HEAD:src/components/create/plan-limit-reached.tsx
import Link from 'next/link'
import { Clock } from 'lucide-react'

function formatResetDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function PlanLimitReached({ resetsAt }: { resetsAt: Date | null }) {
  return (
    <div className="text-center py-12 px-6 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8 text-gold" />
      </div>

      <h2 className="text-xl font-serif text-cream mb-3">
        You&apos;ve reached your plan limit this month.
      </h2>

      {resetsAt && (
        <p className="text-muted-foreground mb-6">
          Your next campaign slot opens on{' '}
          <span className="text-gold font-medium">
            {formatResetDateTime(resetsAt)}
          </span>
          .
        </p>
      )}

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gold/60 text-gold font-medium hover:bg-gold hover:text-background transition-colors"
      >
        View Your Campaigns
      </Link>

      <p className="text-xs text-muted-foreground mt-8">
        Want more campaigns?{' '}
        <Link href="/pricing" className="text-gold hover:underline">
          Upgrade to Pro
        </Link>{' '}
        for 15 campaigns/month and all platforms.
      </p>
    </div>
  )
}
========
import Link from 'next/link'
import { Clock } from 'lucide-react'

function formatResetDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function LimitReached({ resetsAt }: { resetsAt: Date | null }) {
  return (
    <div className="text-center py-12 px-6 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8 text-gold" />
      </div>

      <h2 className="text-xl font-serif text-cream mb-3">
        You&apos;ve reached your plan limit this month.
      </h2>

      {resetsAt && (
        <p className="text-muted-foreground mb-6">
          Your next campaign slot opens on{' '}
          <span className="text-gold font-medium">
            {formatResetDateTime(resetsAt)}
          </span>
          .
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
        >
          Need More Campaigns?
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gold/60 text-gold font-medium hover:bg-gold hover:text-background transition-colors"
        >
          View Your Campaigns
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Upgrade your plan for more campaigns, or wait for your limit to reset.
      </p>
    </div>
  )
}
>>>>>>>> task/13-remove-beta-badges-and-update-welcome-me:src/components/create/limit-reached.tsx
