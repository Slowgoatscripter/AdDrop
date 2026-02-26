'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface PlanCardProps {
  name: string
  price: number
  annualPrice: number
  billingCycle: 'monthly' | 'annual'
  features: string[]
  highlighted: boolean
  ctaText: string
  ctaAction: (() => void) | null
  disabled: boolean
  platformCount: string
  campaignLimit: string
}

export function PlanCard({
  name,
  price,
  annualPrice,
  billingCycle,
  features,
  highlighted,
  ctaText,
  ctaAction,
  disabled,
  platformCount,
  campaignLimit,
}: PlanCardProps) {
  const displayPrice = billingCycle === 'annual' ? annualPrice : price
  const isAnnual = billingCycle === 'annual'

  return (
    <Card
      className={cn(
        'relative flex flex-col transition-all duration-300',
        highlighted
          ? 'border-2 border-gold shadow-lg shadow-gold/10 scale-[1.02]'
          : 'border border-border hover:border-gold/30'
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gold text-background font-semibold px-3 py-1 text-xs">
            Recommended
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-serif text-cream">{name}</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          {platformCount} &middot; {campaignLimit}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Price display */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-cream">
              {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
            </span>
            {displayPrice > 0 && (
              <span className="text-muted-foreground text-sm">
                /{isAnnual ? 'yr' : 'mo'}
              </span>
            )}
          </div>
          {isAnnual && price > 0 && (
            <p className="text-xs text-gold mt-1">
              Save ${price * 12 - annualPrice}/yr vs monthly
            </p>
          )}
        </div>

        {/* Feature list */}
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <span className="w-2 h-2.5 droplet-shape bg-gold inline-block shrink-0 mt-1.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className={cn(
            'w-full',
            highlighted
              ? 'bg-gold text-background hover:bg-gold-bright font-semibold'
              : ''
          )}
          variant={highlighted ? 'default' : 'outline'}
          size="lg"
          disabled={disabled}
          onClick={ctaAction ?? undefined}
        >
          {ctaText}
        </Button>
      </CardFooter>
    </Card>
  )
}
