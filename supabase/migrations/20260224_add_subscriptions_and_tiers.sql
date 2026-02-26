-- Add subscription/billing columns to profiles, campaigns, and create
-- subscriptions + webhook idempotency tables for Stripe integration.

-- 1. Extend profiles with subscription-related columns (denormalized cache)
--    These are updated ONLY by Stripe webhooks (service role), never by
--    authenticated users directly. They are intentionally excluded from the
--    GRANT UPDATE list defined in 20260210_phase1_user_accounts.sql.
alter table public.profiles
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'enterprise')),
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text default 'none'
    check (subscription_status in ('none', 'active', 'past_due', 'canceled', 'incomplete')),
  add column if not exists current_period_end timestamptz;

-- 2. Add generated_at_tier to campaigns for downgrade grandfathering.
--    Campaigns created on a paid tier retain that tier's features after downgrade.
alter table public.campaigns
  add column if not exists generated_at_tier text not null default 'free'
    check (generated_at_tier in ('free', 'pro', 'enterprise'));

-- 3. Subscriptions table — canonical Stripe subscription records
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  tier text not null check (tier in ('free', 'pro', 'enterprise')),
  status text not null check (status in ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read their own subscriptions
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Service role can manage all subscriptions (webhook writes)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Auto-update subscriptions updated_at (reuses existing handle_updated_at trigger fn)
create trigger on_subscription_updated
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- 4. Webhook events table — idempotency guard for Stripe webhooks
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- Service role only — no authenticated user access
create policy "Service role can manage webhook events"
  on public.stripe_webhook_events for all
  using (auth.role() = 'service_role');

-- 5. Indexes for fast lookups
create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);

create index if not exists idx_subscriptions_stripe_subscription_id
  on public.subscriptions(stripe_subscription_id);

create index if not exists idx_profiles_stripe_customer_id
  on public.profiles(stripe_customer_id);
