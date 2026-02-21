'use client';

import { useEffect, useState } from 'react';
import { PenLine, ShieldCheck, AlertTriangle, CheckCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoPipelineProps {
  violationCount: number;
  onComplete: () => void;
}

const STEP_ACTIVE_AT = [0, 1.5, 2.5, 3.5]; // seconds

function getSteps(violationCount: number) {
  return [
    {
      id: 1,
      label: 'Generating ad copy for 3 platforms...',
      icon: PenLine,
      activeAt: STEP_ACTIVE_AT[0],
    },
    {
      id: 2,
      label: 'Scanning for Fair Housing compliance...',
      icon: ShieldCheck,
      activeAt: STEP_ACTIVE_AT[1],
    },
    {
      id: 3,
      label: `Found ${violationCount} violation${violationCount !== 1 ? 's' : ''} — auto-fixing...`,
      icon: AlertTriangle,
      activeAt: STEP_ACTIVE_AT[2],
    },
    {
      id: 4,
      label: 'All clear — Fair Housing Compliant',
      icon: CheckCircle,
      activeAt: STEP_ACTIVE_AT[3],
    },
  ];
}

export function DemoPipeline({ violationCount, onComplete }: DemoPipelineProps) {
  // elapsed in tenths of a second (increments every 100ms)
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);

  const steps = getSteps(violationCount);

  // elapsed is in units of 0.1s; compare against step.activeAt (seconds)
  const activeStepIndex = steps.reduce((acc, step, idx) => {
    return elapsed / 10 >= step.activeAt ? idx : acc;
  }, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!completed && elapsed / 10 >= 4.5) {
      setCompleted(true);
      onComplete();
    }
  }, [elapsed, completed, onComplete]);

  return (
    <div className="bg-surface/50 border border-gold/10 rounded-xl p-6">
      <ol className="space-y-0">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStepIndex || (idx === steps.length - 1 && elapsed / 10 >= 4.5);
          const isActive = idx === activeStepIndex && !isCompleted;
          const isPending = !isCompleted && !isActive;
          const isLast = idx === steps.length - 1;
          const Icon = step.icon;

          return (
            <li key={step.id} className="relative flex gap-4">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[15px] top-[34px] w-px h-10',
                    isCompleted ? 'bg-gold' : 'bg-gold/20',
                  )}
                />
              )}

              {/* Step icon */}
              <div className="shrink-0 mt-1">
                {isCompleted ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold">
                    <Check className="w-4 h-4 text-background" />
                  </span>
                ) : isActive ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gold bg-gold/10">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/20 bg-surface">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </span>
                )}
              </div>

              {/* Step text */}
              <div className={cn('pb-8 pt-0.5', isLast && 'pb-0')}>
                <p
                  className={cn(
                    'text-sm font-medium leading-none',
                    isCompleted && 'text-gold',
                    isActive && 'text-cream',
                    isPending && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                  {isActive && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground animate-pulse">
                      In progress...
                    </span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
