import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PricingTable } from '@/components/pricing/pricing-table'
import { AppHeader } from '@/components/nav/app-header'
import { CTAFooter } from '@/components/landing/cta-footer'
import { Footer } from '@/components/nav/footer'
import type { SubscriptionTier } from '@/lib/stripe/config'

export const metadata: Metadata = {
  title: 'Pricing - AdDrop',
  description:
    'Simple, transparent pricing for AdDrop. Start free, upgrade when you need more platforms, campaigns, and premium features.',
}

const trustPoints = [
  'Fair housing compliance included',
  'No credit card for Free tier',
  'Cancel anytime',
]

const pricingFaqs = [
  {
    question: 'Can I change plans anytime?',
    answer:
      'Yes. Upgrade instantly, downgrade at period end. Manage everything from Settings \u2192 Billing.',
  },
  {
    question: 'What happens when I hit my campaign limit?',
    answer:
      "You'll see a notice. Campaigns reset on the 1st of each month, or upgrade for more.",
  },
  {
    question: 'Do I need a credit card to start?',
    answer: 'No. The Free tier requires no payment information.',
  },
  {
    question: 'Is my payment information secure?',
    answer:
      'All payments are processed by Stripe. We never see or store your card details.',
  },
  {
    question: "What's included in fair housing compliance?",
    answer:
      'Every plan includes automated compliance scanning that checks your ad copy against federal Fair Housing Act guidelines.',
  },
]

export default async function PricingPage() {
  // Try to get the current user's tier (optional, don't require auth)
  let currentTier: SubscriptionTier | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()
      currentTier = (profile?.subscription_tier as SubscriptionTier) ?? 'free'
    }
  } catch {
    // Not logged in or error — show pricing without current plan indicator
  }

  // Read price IDs from server env vars and pass to client component
  const priceConfig = {
    proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    proAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
    enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
    enterpriseAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? '',
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'AdDrop',
    description:
      'AI-powered real estate ad generator for agents and brokerages.',
    brand: { '@type': 'Brand', name: 'AdDrop' },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description:
          'AI ad generation for 5 platforms, 2 campaigns per month',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '9',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          billingDuration: 'P1M',
        },
        description:
          'All 12+ platforms, 15 campaigns per month, premium exports',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise',
        price: '29',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          billingDuration: 'P1M',
        },
        description:
          '75 campaigns per month, team seats, dedicated support',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <AppHeader variant="landing" />
      <main className="min-h-screen pt-24 md:pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl md:text-5xl text-cream mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free. Upgrade when you need more platforms, campaigns, and
              premium features.
            </p>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-gold/40 flex items-center justify-center">
                  <Check className="w-3 h-3 text-gold" />
                </div>
                <span className="text-cream/80 text-sm">{point}</span>
              </div>
            ))}
          </div>

          <PricingTable currentTier={currentTier} priceConfig={priceConfig} />

          {/* FAQ section */}
          <section id="faq" className="mt-20 max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl text-center text-cream mb-10">
              Frequently Asked Questions
            </h2>
            <div className="border-t border-gold/10">
              {pricingFaqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group border-b border-gold/10"
                >
                  <summary className="flex items-center justify-between w-full py-5 cursor-pointer list-none text-left [&::-webkit-details-marker]:hidden">
                    <span className="text-cream font-medium text-lg group-hover:text-gold transition-colors duration-200">
                      {faq.question}
                    </span>
                    <svg
                      className="w-5 h-5 shrink-0 ml-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-gold"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Inline link to FAQ for visitors who scroll past cards */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include fair housing compliance checking.{' '}
              <a
                href="#faq"
                className="text-gold hover:text-gold-bright underline underline-offset-4"
              >
                Questions?
              </a>
            </p>
          </div>
        </div>
      </main>

      <CTAFooter
        headline="Ready to Upgrade Your Marketing?"
        ctaText="Get Started Free"
        ctaHref="/create"
      />
      <Footer />
    </>
  )
}
