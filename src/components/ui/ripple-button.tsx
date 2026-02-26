'use client'

import * as React from 'react'
import { Button, type ButtonProps } from './button'
import { cn } from '@/lib/utils'

export const RippleButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = Date.now()
      setRipples((prev) => [...prev, { x, y, id }])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
      onClick?.(e)
    }

    return (
      <Button
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        onClick={handleClick}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute w-4 h-4 rounded-full bg-gold-light/30 animate-ripple pointer-events-none"
            style={{ left: ripple.x - 8, top: ripple.y - 8 }}
          />
        ))}
        {children}
      </Button>
    )
  }
)
RippleButton.displayName = 'RippleButton'
