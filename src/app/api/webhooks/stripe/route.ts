import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getTierFromPriceId, getBillingCycleFromPriceId } from '@/lib/stripe/config'

export const runtime = 'nodejs'

function getServiceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ---------------------------------------------------------------------------
// Handler: checkout.session.completed
// ---------------------------------------------------------------------------
async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session

  const userId = session.metadata?.userId
  if (!userId) {
    console.error('checkout.session.completed: missing metadata.userId')
    return
  }

  const subscriptionId = session.subscription as string
  if (!subscriptionId) {
    console.error('checkout.session.completed: missing subscription id')
    return
  }

  // Retrieve the full subscription object from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  if (!priceId) {
    console.error('checkout.session.completed: no price id on subscription')
    return
  }

  const tier = getTierFromPriceId(priceId)
  const billingCycle = getBillingCycleFromPriceId(priceId)
  const customerId = subscription.customer as string
  // In Stripe API 2026-01-28, period dates are on SubscriptionItem, not Subscription
  const periodStart = new Date(firstItem.current_period_start * 1000).toISOString()
  const periodEnd = new Date(firstItem.current_period_end * 1000).toISOString()

  // Upsert subscription record
  const { error: subError } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier,
      status: subscription.status,
      billing_cycle: billingCycle,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' }
  )

  if (subError) {
    console.error('checkout.session.completed: subscriptions upsert failed', subError)
    throw subError
  }

  // Update profile with denormalized subscription cache
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      stripe_customer_id: customerId,
      subscription_status: subscription.status,
      current_period_end: periodEnd,
    })
    .eq('id', userId)

  if (profileError) {
    console.error('checkout.session.completed: profiles update failed', profileError)
    throw profileError
  }
}

// ---------------------------------------------------------------------------
// Handler: customer.subscription.updated
// ---------------------------------------------------------------------------
async function handleSubscriptionUpdated(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event
) {
  const subscription = event.data.object as Stripe.Subscription

  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  if (!priceId) {
    console.error('customer.subscription.updated: no price id')
    return
  }

  const tier = getTierFromPriceId(priceId)
  const billingCycle = getBillingCycleFromPriceId(priceId)
  // In Stripe API 2026-01-28, period dates are on SubscriptionItem, not Subscription
  const periodStart = new Date(firstItem.current_period_start * 1000).toISOString()
  const periodEnd = new Date(firstItem.current_period_end * 1000).toISOString()

  // Update subscription record
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      stripe_price_id: priceId,
      tier,
      status: subscription.status,
      billing_cycle: billingCycle,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (subError) {
    console.error('customer.subscription.updated: subscriptions update failed', subError)
    throw subError
  }

  // Find the user_id from the subscriptions table
  const { data: subRecord, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (lookupError || !subRecord) {
    console.error('customer.subscription.updated: could not find subscription record', lookupError)
    throw lookupError || new Error('Subscription record not found')
  }

  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      current_period_end: periodEnd,
    })
    .eq('id', subRecord.user_id)

  if (profileError) {
    console.error('customer.subscription.updated: profiles update failed', profileError)
    throw profileError
  }
}

// ---------------------------------------------------------------------------
// Handler: customer.subscription.deleted
// ---------------------------------------------------------------------------
async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  event: Stripe.Event
) {
  const subscription = event.data.object as Stripe.Subscription

  // Find the user before updating the subscription record
  const { data: subRecord, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (lookupError || !subRecord) {
    console.error('customer.subscription.deleted: subscription record not found', lookupError)
    return
  }

  // Update subscription record to canceled
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (subError) {
    console.error('customer.subscription.deleted: subscriptions update failed', subError)
    throw subError
  }

  // Downgrade profile to free tier
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
    })
    .eq('id', subRecord.user_id)

  if (profileError) {
    console.error('customer.subscription.deleted: profiles update failed', profileError)
    throw profileError
  }
}

// ---------------------------------------------------------------------------
// Handler: invoice.payment_failed
// ---------------------------------------------------------------------------
async function handlePaymentFailed(
  supabase: SupabaseClient,
  event: Stripe.Event
) {
  const invoice = event.data.object as Stripe.Invoice

  // In Stripe API 2026-01-28, subscription is under invoice.parent.subscription_details
  const subscriptionRef = invoice.parent?.subscription_details?.subscription
  const subscriptionId = typeof subscriptionRef === 'string'
    ? subscriptionRef
    : subscriptionRef?.id ?? null
  if (!subscriptionId) {
    console.error('invoice.payment_failed: no subscription id on invoice')
    return
  }

  // Update subscription status to past_due
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)

  if (subError) {
    console.error('invoice.payment_failed: subscriptions update failed', subError)
    throw subError
  }

  // Find the user
  const { data: subRecord, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (lookupError || !subRecord) {
    console.error('invoice.payment_failed: subscription record not found', lookupError)
    return
  }

  // Update profile status to past_due — do NOT downgrade tier
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('id', subRecord.user_id)

  if (profileError) {
    console.error('invoice.payment_failed: profiles update failed', profileError)
    throw profileError
  }
}

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency check
  const supabase = getServiceSupabase()
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .single()

  if (existingEvent) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, supabase, event)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripe, supabase, event)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event)
        break
    }

    // Record event for idempotency
    await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
    })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
