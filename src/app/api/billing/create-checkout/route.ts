import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const { priceId } = body

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'priceId is required and must be a string' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Look up user's stripe_customer_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user!.id)
      .single()

    let stripeCustomerId = profile?.stripe_customer_id

    // If no customer ID exists, create a Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user!.email,
        metadata: { userId: user!.id },
      })
      stripeCustomerId = customer.id

      // Save customer ID using service role client (user client lacks write access to this column)
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await serviceSupabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user!.id)
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId: user!.id },
      subscription_data: {
        metadata: { userId: user!.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
