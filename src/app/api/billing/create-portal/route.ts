import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { getStripe } from '@/lib/stripe/client'

export async function POST() {
  try {
    const { user, supabase, error } = await requireAuth()
    if (error) return error

    // Get user's stripe_customer_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user!.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Create Stripe Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal session error:', err)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
