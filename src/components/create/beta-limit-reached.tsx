'use client';

import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BetaLimitReachedProps {
  resetsAt: Date;
}

/**
 * Shown on the create page when a beta user has reached their
 * weekly campaign limit.
 */
export function BetaLimitReached({ resetsAt }: BetaLimitReachedProps) {
  const resetDate = new Date(resetsAt);
  const formattedDate = resetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="text-center py-12 space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
          <Clock className="w-8 h-8 text-gold" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-foreground">
        Weekly Limit Reached
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        You&apos;ve used all your free campaigns for this week.
        Your limit resets on <span className="text-foreground font-medium">{formattedDate}</span>.
      </p>
      <p className="text-xs text-muted-foreground">
        During beta, each account gets 2 campaigns per week.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
