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

export function BetaLimitReached({ resetsAt }: { resetsAt: Date | null }) {
  return (
    <div className="text-center py-12 px-6 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8 text-gold" />
      </div>

      <h2 className="text-xl font-serif text-cream mb-3">
        You&apos;ve hit your beta limit this week.
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
        Want unlimited campaigns? We&apos;re working on premium plans. Stay tuned.
      </p>
    </div>
  )
}
