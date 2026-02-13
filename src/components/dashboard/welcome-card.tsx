import Link from 'next/link'
import { Check } from 'lucide-react'

const benefits = [
  '2 ad campaigns per week',
  '12+ platforms per campaign',
  'Fair housing compliance built in',
  'Export-ready assets',
]

export function WelcomeCard() {
  return (
    <div className="border-l-2 border-l-gold bg-surface rounded-lg p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-serif text-cream mb-4">
        Welcome to AdDrop Beta
      </h2>
      <p className="text-muted-foreground mb-5">
        You&apos;re in. Here&apos;s what you get:
      </p>

      <ul className="space-y-2.5 mb-6">
        {benefits.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-cream">
            <Check className="w-4 h-4 text-gold flex-shrink-0" />
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/create"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gold/60 text-gold font-medium hover:bg-gold hover:text-background transition-colors"
      >
        Create Your First Ad &rarr;
      </Link>

      <p className="text-xs text-muted-foreground mt-4">
        Typically ready in a few minutes, depending on listing complexity.
      </p>
    </div>
  )
}
