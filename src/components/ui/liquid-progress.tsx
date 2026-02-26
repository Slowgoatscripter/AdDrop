'use client'

import { cn } from '@/lib/utils'

interface LiquidProgressProps {
  value: number
  className?: string
  variant?: 'gold' | 'teal' | 'auto'
}

export function LiquidProgress({ value, className, variant = 'auto' }: LiquidProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))

  const barColor =
    variant === 'auto'
      ? clamped >= 90
        ? 'bg-destructive'
        : clamped >= 75
          ? 'bg-amber-500'
          : 'bg-gold'
      : variant === 'teal'
        ? 'bg-teal'
        : 'bg-gold'

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
        style={{ width: `${clamped}%` }}
      />
      {clamped > 5 && clamped < 100 && (
        <div
          className="absolute top-0 h-full w-3 opacity-60"
          style={{ left: `calc(${clamped}% - 6px)` }}
        >
          <div className={cn('h-full w-full rounded-full blur-sm', barColor)} />
        </div>
      )}
    </div>
  )
}
