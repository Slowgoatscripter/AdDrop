'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FREE_PLATFORMS, type SubscriptionTier } from '@/lib/stripe/config';
import type { ReactNode } from 'react';

interface LockedPlatformOverlayProps {
  platformId: string;
  userTier: SubscriptionTier;
  generatedAtTier?: SubscriptionTier;
  children: ReactNode;
}

/**
 * Wraps a platform card and overlays a lock screen when the platform
 * is gated for the current user.
 *
 * Gating rule: Free-tier users viewing campaigns generated while on
 * the Free tier see non-free platforms as locked. Campaigns generated
 * on Pro/Enterprise are grandfathered — all platforms stay visible.
 */
export function LockedPlatformOverlay({
  platformId,
  userTier,
  generatedAtTier,
  children,
}: LockedPlatformOverlayProps) {
  const isLocked =
    userTier === 'free' &&
    generatedAtTier === 'free' &&
    !FREE_PLATFORMS.includes(platformId as (typeof FREE_PLATFORMS)[number]);

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred teaser content */}
      <div className="opacity-40 blur-[2px] pointer-events-none select-none">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
        <Lock className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          Upgrade to Pro to unlock
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          This platform is available on Pro and Enterprise plans
        </p>
        <Button asChild size="sm">
          <Link href="/pricing">View Plans</Link>
        </Button>
      </div>
    </div>
  );
}
