import type { CampaignUsage } from '@/lib/usage/campaign-limits';

interface BetaUsageCardProps {
  usage: CampaignUsage;
}

/**
 * Card showing the user's beta campaign usage (e.g., "1 of 2 this week").
 */
export function BetaUsageCard({ usage }: BetaUsageCardProps) {
  if (usage.isExempt) return null;

  const percentage = Math.min((usage.used / usage.limit) * 100, 100);
  const resetDate = new Date(usage.resetsAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Beta Usage
        </span>
        <span className="text-xs text-muted-foreground">
          Resets {resetDate}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usage.isLimited ? 'bg-destructive' : 'bg-gold'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {usage.used} / {usage.limit}
        </span>
      </div>
    </div>
  );
}
