'use client';

import { useEffect, useState } from 'react';
import { PenLine, ShieldCheck, Star, Check, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignGeneratingViewProps {
  propertyAddress?: string;
  platforms?: string[];
}

const STEPS = [
  {
    id: 1,
    label: 'Generating ad copy',
    description: 'Crafting platform-specific headlines, body copy, and calls to action',
    icon: PenLine,
    activeAt: 0,
  },
  {
    id: 2,
    label: 'Running compliance check',
    description: 'Verifying all copy against fair housing guidelines',
    icon: ShieldCheck,
    activeAt: 12,
  },
  {
    id: 3,
    label: 'Scoring quality',
    description: 'Evaluating and refining content for maximum impact',
    icon: Star,
    activeAt: 25,
  },
];

const SKELETON_PLATFORMS = [
  { label: 'Instagram', width: 'w-48' },
  { label: 'Facebook', width: 'w-56' },
  { label: 'Google Ads', width: 'w-40' },
  { label: 'Zillow', width: 'w-44' },
];

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl border bg-card shadow p-5 space-y-3 animate-pulse"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Platform label bar */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
      {/* Headline */}
      <div className="h-4 w-3/4 rounded bg-muted" />
      {/* Body lines */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
        <div className="h-3 w-4/6 rounded bg-muted" />
      </div>
      {/* CTA button placeholder */}
      <div className="h-8 w-28 rounded-md bg-muted mt-1" />
    </div>
  );
}

export default function CampaignGeneratingView({
  propertyAddress,
  platforms,
}: CampaignGeneratingViewProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeStepIndex = STEPS.reduce((acc, step, idx) => {
    return elapsed >= step.activeAt ? idx : acc;
  }, 0);

  const skeletonItems = platforms && platforms.length > 0
    ? platforms.map((p, i) => ({ label: p, width: SKELETON_PLATFORMS[i % SKELETON_PLATFORMS.length].width }))
    : SKELETON_PLATFORMS;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Generating Campaign Kit</h1>
            {propertyAddress && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {propertyAddress}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Usually 15&ndash;30 seconds</span>
          </div>
        </div>

        {/* Progress stepper + tip card */}
        <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Vertical stepper */}
          <div className="rounded-xl border bg-card shadow p-6 space-y-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
              Progress
            </p>
            <ol className="space-y-0">
              {STEPS.map((step, idx) => {
                const isCompleted = idx < activeStepIndex;
                const isActive = idx === activeStepIndex;
                const isPending = idx > activeStepIndex;
                const Icon = step.icon;
                const isLast = idx === STEPS.length - 1;

                return (
                  <li key={step.id} className="relative flex gap-4">
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[15px] top-[32px] w-px',
                          isCompleted ? 'bg-primary h-10' : 'bg-border h-10',
                        )}
                      />
                    )}

                    {/* Step icon */}
                    <div className="shrink-0 mt-1">
                      {isCompleted ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </span>
                      ) : isActive ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted/50">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </span>
                      )}
                    </div>

                    {/* Step text */}
                    <div className={cn('pb-8 pt-0.5', isLast && 'pb-0')}>
                      <p
                        className={cn(
                          'text-sm font-semibold leading-none',
                          isCompleted && 'text-primary',
                          isActive && 'text-foreground',
                          isPending && 'text-muted-foreground',
                        )}
                      >
                        {step.label}
                        {isCompleted && (
                          <span className="ml-2 text-xs font-normal text-primary">Done</span>
                        )}
                        {isActive && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground animate-pulse">
                            In progress...
                          </span>
                        )}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          isPending ? 'text-muted-foreground/60' : 'text-muted-foreground',
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Tip card */}
          <div className="rounded-xl border bg-muted/30 p-6 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                <PenLine className="w-4 h-4 text-primary" />
              </span>
              <p className="text-sm font-semibold text-foreground">Did you know?</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We&apos;re crafting compelling ad copy tailored to each platform&apos;s unique audience
              and character limits &mdash; so your listing stands out whether buyers find it on
              Instagram, Google, or Zillow.
            </p>
            <div className="pt-1 border-t">
              <p className="text-xs text-muted-foreground/70">
                Each campaign includes copy, compliance checks, quality scoring, and platform-specific formatting.
              </p>
            </div>
          </div>
        </div>

        {/* Skeleton platform cards */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Preparing ad cards
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {skeletonItems.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">{item.label}</p>
                <SkeletonCard index={idx} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>AI is working &mdash; this page will update automatically when ready</span>
        </div>
      </div>
    </div>
  );
}
