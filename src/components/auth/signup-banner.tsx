<<<<<<<< HEAD:src/components/auth/signup-benefits-banner.tsx
'use client'

import { Star, Check } from 'lucide-react'

export function SignupBenefitsBanner() {
  return (
    <div className="bg-surface border-l-2 border-gold rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-gold fill-gold" />
        <h3 className="text-sm font-semibold text-foreground">You&apos;re one step away</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Create a free account to start generating ads. No credit card required.
      </p>
      <ul className="space-y-1.5">
        {[
          '2 campaigns per month',
          'All 12+ platforms',
          'Built-in compliance checks',
          'Free tier — no credit card',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-foreground/80">
            <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
========
'use client'

import { Star, Check } from 'lucide-react'

export function SignupBanner() {
  return (
    <div className="bg-surface border-l-2 border-gold rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-gold fill-gold" />
        <h3 className="text-sm font-semibold text-foreground">You&apos;re one step away</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Create a free account to start generating ads. No credit card needed.
      </p>
      <ul className="space-y-1.5">
        {[
          '2 campaigns per month',
          'All 12+ platforms',
          'Built-in compliance checks',
          'Free to start',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-foreground/80">
            <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
>>>>>>>> task/13-remove-beta-badges-and-update-welcome-me:src/components/auth/signup-banner.tsx
