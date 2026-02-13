import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';

/**
 * Welcome card shown to first-time users on the dashboard.
 * Encourages them to create their first campaign.
 */
export function WelcomeCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-gold" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-foreground">
        Welcome to AdDrop!
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Generate professional real estate ad campaigns in seconds.
        Enter a property listing and we&apos;ll create ads for every platform.
      </p>
      <Link
        href="/create"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create Your First Campaign
      </Link>
    </div>
  );
}
