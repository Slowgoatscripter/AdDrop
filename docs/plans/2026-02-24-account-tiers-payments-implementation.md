# Account Tiers & Payment Processing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Free/Pro/Enterprise subscription tiers with Stripe billing, feature gating, and a pricing page.

**Architecture:** Stripe Checkout + Customer Portal for payment UX (no custom payment forms). Webhooks sync billing state to Supabase. Tier stored on `profiles` table as denormalized cache. Feature gates enforced server-side at API level. Client shows upgrade prompts for locked features.

**Tech Stack:** Stripe (checkout, webhooks, customer portal), Next.js 15 API routes, Supabase (Postgres + RLS), Tailwind + shadcn/ui for UI.

---

## Task 1: Install Stripe Dependencies & Environment Setup

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `.env.local`

**Step 1: Install Stripe packages**

Run: `npm install stripe @stripe/stripe-js`

**Step 2: Create `.env.example`**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_ANNUAL=
STRIPE_PRICE_ENTERPRISE_MONTHLY=
STRIPE_PRICE_ENTERPRISE_ANNUAL=
```

**Step 3: Add Stripe env vars to `.env.local`**

Add placeholder Stripe keys (user will fill with real values):
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_PRICE_PRO_MONTHLY=price_placeholder
STRIPE_PRICE_PRO_ANNUAL=price_placeholder
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_placeholder
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_placeholder
```

**Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install stripe packages and add env example"
```

> Note: Do NOT commit `.env.local` — it's gitignored.

---

## Task 2: Stripe Server Client Library

**Files:**
- Create: `src/lib/stripe/client.ts`
- Create: `src/lib/stripe/config.ts`

**Step 1: Create Stripe config with tier definitions**

```ts
// src/lib/stripe/config.ts
export type SubscriptionTier = 'free' | 'pro' | 'enterprise'
export type BillingCycle = 'monthly' | 'annual'

export const TIER_LIMITS = {
  free: { campaigns: 2, platforms: 5 },
  pro: { campaigns: 15, platforms: Infinity },
  enterprise: { campaigns: 75, platforms: Infinity },
} as const

export const FREE_PLATFORMS = [
  'instagram',
  'facebook',
  'mlsDescription',
  'googleAds',
  'twitter',
] as const

export const TIER_FEATURES = {
  free: { export: false, share: false, regenerate: false, teamSeats: false },
  pro: { export: true, share: true, regenerate: true, teamSeats: false },
  enterprise: { export: true, share: true, regenerate: true, teamSeats: true },
} as const

/**
 * Maps Stripe Price IDs to tiers. Populated from env vars.
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  const priceToTier: Record<string, SubscriptionTier> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL!]: 'pro',
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!]: 'enterprise',
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!]: 'enterprise',
  }
  return priceToTier[priceId] || 'free'
}

export function getBillingCycleFromPriceId(priceId: string): BillingCycle {
  const annualPrices = [
    process.env.STRIPE_PRICE_PRO_ANNUAL!,
    process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!,
  ]
  return annualPrices.includes(priceId) ? 'annual' : 'monthly'
}
```

**Step 2: Create Stripe server client**

```ts
// src/lib/stripe/client.ts
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-18.acacia',
      typescript: true,
    })
  }
  return stripeInstance
}
```

**Step 3: Commit**

```bash
git add src/lib/stripe/
git commit -m "feat: add Stripe client library and tier config"
```

---

## Task 3: Database Migration — Subscriptions Table & Profile Changes

**Files:**
- Create: `supabase/migrations/20260224_add_subscriptions_and_tiers.sql`

**Step 1: Write the migration**

```sql
-- Add subscription tier to profiles (denormalized cache, updated by webhooks only)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'incomplete')),
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- DO NOT grant update on subscription_tier/stripe_customer_id to authenticated users
-- (matches existing pattern: role column is also not in the GRANT UPDATE list)

-- Add generated_at_tier to campaigns (for downgrade grandfathering)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS generated_at_tier text NOT NULL DEFAULT 'free'
    CHECK (generated_at_tier IN ('free', 'pro', 'enterprise'));

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_price_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create webhook events table (for idempotency)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for subscriptions: users can read their own, service role can write
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- RLS for webhook events: service role only
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events"
  ON public.stripe_webhook_events FOR ALL
  USING (auth.role() = 'service_role');

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
```

**Step 2: Apply the migration**

Run: `npx supabase db push` (or apply via Supabase dashboard if using hosted)

**Step 3: Commit**

```bash
git add supabase/migrations/20260224_add_subscriptions_and_tiers.sql
git commit -m "feat: add subscriptions table, tier columns, and webhook idempotency"
```

---

## Task 4: TypeScript Types for Subscriptions & Tiers

**Files:**
- Create: `src/lib/types/subscription.ts`
- Modify: `src/lib/types/admin.ts` (add tier fields to `Profile`)
- Modify: `src/lib/types/index.ts` (re-export)

**Step 1: Create subscription types**

```ts
// src/lib/types/subscription.ts
import type { SubscriptionTier, BillingCycle } from '@/lib/stripe/config'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  tier: SubscriptionTier
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
  billing_cycle: BillingCycle
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface BillingInfo {
  tier: SubscriptionTier
  status: 'none' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  subscription: Subscription | null
  usage: {
    used: number
    limit: number
    remaining: number
  }
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}
```

**Step 2: Add tier fields to admin Profile type**

In `src/lib/types/admin.ts`, add to the `Profile` interface:
```ts
subscription_tier?: 'free' | 'pro' | 'enterprise'
stripe_customer_id?: string
subscription_status?: string
current_period_end?: string
```

**Step 3: Re-export from barrel**

In `src/lib/types/index.ts`, add:
```ts
export * from './subscription'
```

**Step 4: Commit**

```bash
git add src/lib/types/subscription.ts src/lib/types/admin.ts src/lib/types/index.ts
git commit -m "feat: add subscription and billing TypeScript types"
```

---

## Task 5: Tier-Aware Campaign Limits

**Files:**
- Modify: `src/lib/usage/campaign-limits.ts`

**Step 1: Refactor `getCampaignUsage` to be tier-aware**

Replace the hardcoded beta limits with tier-based lookups. The function signature stays the same for backward compatibility, but internally it reads `profiles.subscription_tier` and uses `TIER_LIMITS` from the Stripe config.

Key changes:
- Replace `BETA_CAMPAIGN_LIMIT` / `BETA_WINDOW_DAYS` with `TIER_LIMITS[tier].campaigns`
- Change window from rolling 7-day to calendar month (1st of current month to now)
- Keep the `rate_limit_exempt` / admin bypass as-is
- `resetsAt` becomes 1st of next month

The `UsageInfo` interface stays the same — downstream consumers (`BetaUsageCard`, `campaign/create`) don't break.

**Step 2: Run existing tests if any**

Run: `npm test -- --testPathPattern=usage` or `npm test -- --testPathPattern=campaign-limits`

**Step 3: Commit**

```bash
git add src/lib/usage/campaign-limits.ts
git commit -m "feat: replace beta campaign limits with tier-aware calendar month limits"
```

---

## Task 6: Tier Gating Helper

**Files:**
- Create: `src/lib/stripe/gate.ts`

**Step 1: Create the gating utility**

```ts
// src/lib/stripe/gate.ts
import { NextResponse } from 'next/server'
import type { SubscriptionTier } from './config'
import { TIER_FEATURES } from './config'

type GatedFeature = keyof typeof TIER_FEATURES.free

/**
 * Check if a user's tier grants access to a specific feature.
 * Returns null if allowed, or a 403 NextResponse if blocked.
 */
export function requireTierFeature(
  tier: SubscriptionTier,
  feature: GatedFeature
): NextResponse | null {
  if (TIER_FEATURES[tier][feature]) {
    return null
  }
  const upgradeMessage = feature === 'teamSeats'
    ? 'Team seats require an Enterprise plan.'
    : 'This feature requires a Pro or Enterprise plan.'

  return NextResponse.json(
    {
      error: upgradeMessage,
      code: 'TIER_RESTRICTED',
      requiredTier: feature === 'teamSeats' ? 'enterprise' : 'pro',
      currentTier: tier,
    },
    { status: 403 }
  )
}

/**
 * Get user's tier from their profile. Defaults to 'free'.
 */
export async function getUserTier(
  supabase: any,
  userId: string
): Promise<SubscriptionTier> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()
  return data?.subscription_tier || 'free'
}
```

**Step 2: Commit**

```bash
git add src/lib/stripe/gate.ts
git commit -m "feat: add tier feature gating helper"
```

---

## Task 7: Middleware — Exclude Webhooks from CSRF

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Add webhook exclusion before CSRF check**

In `src/middleware.ts`, the CSRF origin validation runs at lines 21-29 for mutating methods. Add a check to skip CSRF for `/api/webhooks/` routes — these use their own signature verification.

Find the CSRF block and add before it:
```ts
// Skip CSRF for webhook routes (verified via provider signatures, e.g., Stripe)
const isWebhookRoute = pathname.startsWith('/api/webhooks/')
```

Then wrap the existing CSRF check with `if (!isWebhookRoute) { ... }`.

Also ensure `/api/webhooks/stripe` is NOT in the rate-limited paths array (lines 5-11). It currently isn't, but verify.

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "fix: exclude webhook routes from CSRF validation"
```

---

## Task 8: Stripe Webhook Endpoint

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

**Step 1: Implement the webhook handler**

This is the most critical route. It must:
1. Use `export const runtime = 'nodejs'` (not edge — needs raw body)
2. Read raw body via `request.text()`
3. Verify signature via `stripe.webhooks.constructEvent()`
4. Check idempotency via `stripe_webhook_events` table
5. Handle events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
6. Update both `subscriptions` table and `profiles.subscription_tier` in each handler
7. Return 200 on success, 400 on signature failure

Key implementation details:
- Use Supabase service role client (not user client) since webhooks have no user session
- On `checkout.session.completed`: create subscription row, update profile tier + stripe_customer_id
- On `customer.subscription.updated`: update subscription row + profile tier (handles upgrades/downgrades)
- On `customer.subscription.deleted`: delete subscription row, set profile tier to 'free', status to 'canceled'
- On `invoice.payment_failed`: update subscription status to 'past_due', update profile subscription_status (but do NOT downgrade tier — user keeps access during retry period)
- Insert `event.id` into `stripe_webhook_events` at start; skip if already exists

**Step 2: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: add Stripe webhook endpoint with signature verification and idempotency"
```

---

## Task 9: Checkout & Customer Portal API Routes

**Files:**
- Create: `src/app/api/billing/create-checkout/route.ts`
- Create: `src/app/api/billing/create-portal/route.ts`

**Step 1: Create checkout session route**

Pattern: `requireAuth()` → look up or create Stripe customer → create Checkout session → return URL.

```ts
// POST /api/billing/create-checkout
// Body: { priceId: string }
// Returns: { url: string }
```

Key details:
- If user already has `stripe_customer_id` on their profile, use it. Otherwise create a new Stripe customer with their email and save the ID.
- Set `success_url` to `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`
- Set `cancel_url` to `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
- Set `metadata.userId` on the checkout session so the webhook can link it back
- Set `subscription_data.metadata.userId` as well (webhooks receive subscription metadata)
- Set `allow_promotion_codes: false` (for now — easily toggled later)

**Step 2: Create portal session route**

Pattern: `requireAuth()` → get `stripe_customer_id` from profile → create portal session → return URL.

```ts
// POST /api/billing/create-portal
// Returns: { url: string }
```

Key detail: If user has no `stripe_customer_id`, return 400 with "No active subscription."

**Step 3: Commit**

```bash
git add src/app/api/billing/
git commit -m "feat: add Stripe checkout and customer portal API routes"
```

---

## Task 10: Gate Existing API Routes

**Files:**
- Modify: `src/app/api/export/route.ts`
- Modify: `src/app/api/export/bundle/route.ts`
- Modify: `src/app/api/campaign/[id]/share/route.ts`
- Modify: `src/app/api/regenerate-platform/route.ts`
- Modify: `src/app/api/campaign/create/route.ts`

**Step 1: Gate export routes**

In both `export/route.ts` and `export/bundle/route.ts`:
- After `requireAuth()` + ownership check, add:
```ts
import { getUserTier, requireTierFeature } from '@/lib/stripe/gate'

const tier = await getUserTier(supabase, user!.id)
const gateError = requireTierFeature(tier, 'export')
if (gateError) return gateError
```
- Exception: The bundle route's share-token path (public access) should NOT be gated — only the authenticated path.

**Step 2: Gate share route**

In `campaign/[id]/share/route.ts`, add the same pattern with `requireTierFeature(tier, 'share')`.

**Step 3: Gate regeneration route**

In `regenerate-platform/route.ts`, add `requireTierFeature(tier, 'regenerate')`.

**Step 4: Update campaign creation to record tier**

In `campaign/create/route.ts`:
- Get user tier via `getUserTier()`
- Add `generated_at_tier: tier` to the campaign insert object
- The usage check already happens via `getCampaignUsage()` which is now tier-aware (Task 5)

**Step 5: Commit**

```bash
git add src/app/api/export/ src/app/api/campaign/ src/app/api/regenerate-platform/
git commit -m "feat: add tier-based feature gating to export, share, and regeneration routes"
```

---

## Task 11: Settings Billing Page

**Files:**
- Create: `src/app/settings/billing/page.tsx`
- Create: `src/app/settings/billing/actions.ts`
- Modify: `src/app/settings/settings-nav.tsx`

**Step 1: Add Billing to settings nav**

In `settings-nav.tsx`, add to the nav items array:
```ts
{ href: '/settings/billing', label: 'Billing', icon: CreditCard }
```
Import `CreditCard` from `lucide-react`.

**Step 2: Create billing page**

Server component that:
- Fetches profile (tier, subscription_status, current_period_end, stripe_customer_id)
- Fetches current month campaign usage via `getCampaignUsage()`
- Fetches subscription details from `subscriptions` table if exists
- Renders:
  - Current plan badge (Free / Pro / Enterprise)
  - Usage bar (campaigns used / limit this month)
  - Billing cycle + renewal date (if subscribed)
  - `past_due` warning banner if `subscription_status === 'past_due'` with "Update Payment Method" button
  - "Manage Subscription" button → calls `create-portal` API → redirects to Stripe
  - "Change Plan" link → `/pricing`
  - Cancel pending notice if `cancel_at_period_end` is true

Follow the pattern from `src/app/settings/account/page.tsx` — client component with `useEffect`/`useState`, server actions for data fetching.

**Step 3: Create billing server actions**

```ts
// src/app/settings/billing/actions.ts
'use server'

export async function getBillingInfo() {
  // Get profile, subscription, and usage data
  // Return BillingInfo object
}
```

**Step 4: Commit**

```bash
git add src/app/settings/billing/ src/app/settings/settings-nav.tsx
git commit -m "feat: add billing settings page with plan info and usage display"
```

---

## Task 12: Pricing Page

**Files:**
- Create: `src/app/pricing/page.tsx`
- Create: `src/components/pricing/pricing-table.tsx`
- Create: `src/components/pricing/plan-card.tsx`

**Step 1: Create the pricing page**

Public page (no auth required). Displays:
- 3-column tier comparison (Free / Pro / Enterprise)
- Monthly/annual toggle with "Save 2 months" badge on annual
- Feature comparison rows matching the tier table from the design doc
- CTA buttons: "Current Plan" (if logged in and on that tier), "Get Started" (Free), "Upgrade" (Pro/Enterprise)
- Upgrade buttons call `/api/billing/create-checkout` with the selected price ID

If user is logged in, fetch their current tier to highlight it. If not logged in, CTAs go to `/signup`.

**Step 2: Create `PricingTable` component**

Reusable component (will also be used on the landing page). Props: `currentTier?: SubscriptionTier`, `billingCycle: 'monthly' | 'annual'`.

**Step 3: Create `PlanCard` component**

Individual tier card. Props: tier name, price, features list, CTA text, highlighted (boolean), disabled (boolean).

Follow existing UI patterns from `src/components/ui/` (shadcn Card, Button). Use the `gold` color from the existing theme for the recommended/highlighted plan.

**Step 4: Commit**

```bash
git add src/app/pricing/ src/components/pricing/
git commit -m "feat: add pricing page with tier comparison and Stripe checkout integration"
```

---

## Task 13: Landing Page Pricing Section

**Files:**
- Create: `src/components/landing/pricing-section.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create landing page pricing section**

Wraps the `PricingTable` component from Task 12 with landing page styling (section heading, background, animations consistent with other landing sections like `FeaturesGrid`).

**Step 2: Add to landing page**

In `src/app/page.tsx`, import `PricingSection` and insert it between `WhoItsFor` and `FAQ`:
```tsx
<WhoItsFor />
<PricingSection />
<FAQ />
```

**Step 3: Update CTA footer**

The `CTAFooter` component currently shows beta messaging. Update it to reference the pricing tiers instead of "free during beta."

**Step 4: Commit**

```bash
git add src/components/landing/pricing-section.tsx src/app/page.tsx
git commit -m "feat: add pricing section to landing page"
```

---

## Task 14: Dashboard Updates

**Files:**
- Modify: `src/components/dashboard/beta-usage-card.tsx` (rename/refactor to tier-aware)
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Refactor BetaUsageCard to TierUsageCard**

Replace the beta-specific messaging with tier-aware display:
- Show current tier name (Free / Pro / Enterprise) with a badge
- Show campaigns used / limit this month (same progress bar pattern)
- Show "Upgrade" CTA for Free users
- Show renewal date for paid users
- Keep the exempt display for admin/exempt users

The `UsageInfo` interface is unchanged so the data flow stays the same.

**Step 2: Update dashboard page**

- Replace `<BetaUsageCard>` with the new `<TierUsageCard>` component
- Update the footer text from beta messaging to tier-appropriate messaging
- Pass tier info from the profile fetch that already happens in `Promise.all`

**Step 3: Commit**

```bash
git add src/components/dashboard/ src/app/dashboard/page.tsx
git commit -m "feat: replace beta usage card with tier-aware plan display on dashboard"
```

---

## Task 15: Campaign Page — Platform Gating UI

**Files:**
- Modify: Campaign display components (the components that render individual platform ad cards)

**Step 1: Identify platform card rendering**

The campaign page renders ad cards for each platform. For Free users, platforms not in `FREE_PLATFORMS` should show as locked — blurred/dimmed with an "Upgrade to Pro" overlay.

Key consideration: Check `generated_at_tier` on the campaign. If the campaign was generated while on Pro/Enterprise, show ALL platforms regardless of current tier (grandfathering).

**Step 2: Add platform gating logic**

```ts
import { FREE_PLATFORMS } from '@/lib/stripe/config'

const isLocked = userTier === 'free'
  && campaign.generated_at_tier === 'free'
  && !FREE_PLATFORMS.includes(platformId)
```

If `isLocked`, render the card with:
- `opacity-50 blur-sm pointer-events-none` on the content
- An overlay div with lock icon + "Upgrade to Pro to unlock all platforms" + CTA button

**Step 3: Commit**

```bash
git add src/components/campaign/
git commit -m "feat: add platform gating UI with upgrade prompts for free users"
```

---

## Task 16: Upgrade Prompts on Gated Features

**Files:**
- Create: `src/components/ui/upgrade-prompt.tsx`
- Modify: Export/share/regeneration UI components as needed

**Step 1: Create reusable upgrade prompt component**

```tsx
// A small inline prompt that replaces disabled feature buttons
// Props: feature name, required tier, current tier
// Shows: lock icon + "Upgrade to Pro" text + link to /pricing
```

**Step 2: Add upgrade prompts to gated UI features**

For each gated feature button in the campaign UI:
- **Export/Download buttons**: Show `<UpgradePrompt feature="export" />` if tier is free
- **Share button**: Show `<UpgradePrompt feature="share" />` if tier is free
- **Regenerate button**: Show `<UpgradePrompt feature="regenerate" />` if tier is free

The buttons should still be visible but disabled with the upgrade prompt alongside.

**Step 3: Commit**

```bash
git add src/components/ui/upgrade-prompt.tsx src/components/campaign/
git commit -m "feat: add upgrade prompts for gated features"
```

---

## Task 17: Admin — Tier Column & Override

**Files:**
- Modify: `src/components/admin/users-table.tsx`
- Modify: `src/app/admin/users/page.tsx` (if needed for data fetching)
- Create: `src/app/admin/users/actions.ts` (add `overrideUserTier` action if not exists)

**Step 1: Add Tier column to admin users table**

In `users-table.tsx`:
- Add a "Tier" column header after "Role" (or "Rate Limit")
- Display `profile.subscription_tier` as a colored badge (Free=gray, Pro=gold, Enterprise=purple)
- Add an admin override select dropdown (Free/Pro/Enterprise) that calls a `overrideUserTier()` server action
- Follow the existing pattern of the role select and `toggleRateLimitExempt` toggle

**Step 2: Create override server action**

```ts
// Uses requireAdminAction() pattern (with MFA enforcement)
// Updates profiles.subscription_tier directly (admin bypass)
export async function overrideUserTier(userId: string, tier: SubscriptionTier) {
  await requireAdminAction()
  // Update using service role client
}
```

**Step 3: Commit**

```bash
git add src/components/admin/ src/app/admin/
git commit -m "feat: add tier column and admin override to users table"
```

---

## Task 18: Integration Testing & Cleanup

**Files:**
- Various test files
- Modify: `src/app/dashboard/page.tsx` (any remaining beta references)

**Step 1: Test the full checkout flow manually**

Using Stripe test mode:
1. Sign up as a new user → verify Free tier
2. Go to `/pricing` → click Upgrade to Pro
3. Complete Stripe test checkout (card: `4242 4242 4242 4242`)
4. Verify redirect back to `/settings/billing` with Pro tier active
5. Check campaign limit is now 15
6. Create a campaign → verify `generated_at_tier: 'pro'`
7. Verify all platforms visible, export/share/regeneration work
8. Go to Stripe Customer Portal → cancel subscription
9. Verify downgrade to Free, existing campaigns retain Pro content

**Step 2: Test webhook handling**

Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

Trigger test events:
- `stripe trigger checkout.session.completed`
- `stripe trigger customer.subscription.updated`
- `stripe trigger invoice.payment_failed`

**Step 3: Clean up remaining beta references**

Search codebase for "beta" references and update:
- Dashboard footer text
- Any "Beta" badges or labels
- Landing page copy referencing "free during beta"

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete account tiers and Stripe payment integration"
```

---

## Task Dependency Order

```
Task 1 (packages + env)
  → Task 2 (Stripe client + config)
    → Task 3 (database migration)
      → Task 4 (TypeScript types)
        → Task 5 (tier-aware limits) ─────────────────┐
        → Task 6 (gating helper) ─────────────────────┤
        → Task 7 (middleware CSRF fix) ────────────────┤
          → Task 8 (webhook endpoint) ─────────────────┤
          → Task 9 (checkout + portal routes) ─────────┤
            → Task 10 (gate existing API routes) ──────┤
            → Task 11 (billing settings page) ─────────┤
            → Task 12 (pricing page) ──────────────────┤
              → Task 13 (landing page pricing) ────────┤
            → Task 14 (dashboard updates) ─────────────┤
            → Task 15 (platform gating UI) ────────────┤
            → Task 16 (upgrade prompts) ───────────────┤
            → Task 17 (admin tier column) ─────────────┤
              → Task 18 (integration testing) ─────────┘
```

Tasks 5-7 can run in parallel. Tasks 10-17 can mostly run in parallel after Tasks 8-9 are complete.
