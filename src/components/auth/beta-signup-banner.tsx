'use client';

import { Info } from 'lucide-react';

/**
 * Beta signup banner shown on the signup page when a user is redirected
 * from a protected route (e.g., /create). Informs users about beta status.
 */
export function BetaSignupBanner() {
  return (
    <div className="mb-6 rounded-lg border border-gold/30 bg-gold/5 p-4 flex items-start gap-3">
      <Info className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-foreground">
          Welcome to the AdDrop Beta
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Create an account to start generating real estate ad campaigns.
          During beta, you get 2 free campaigns per week.
        </p>
      </div>
    </div>
  );
}
