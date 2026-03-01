# Account Tiers & Payment Processing Design

**Status:** Approved with Changes (review applied)
**Date:** 2026-02-24
**Payment Provider:** Stripe

---

## 1. Tier Structure

| | **Free** | **Pro** ($9/mo or $90/yr) | **Enterprise** ($29/mo or $290/yr) |
|---|---|---|---|
| Campaigns | 2/month | 15/month | 75/month |
| Ad Platforms | 5 (Instagram, Facebook, MLS, Google Ads, X) | All 12+ | All 12+ |
| PDF Export & Zip Bundles | No | Yes | Yes |
| Shareable Campaign Links | No | Yes | Yes |
| Campaign Regeneration | No | Yes | Yes |
| Photo Uploads | Yes | Yes | Yes |
| Team Seats | No | No | Phase 2 |

Campaign limits reset on the **1st of each calendar month** for predictability.

Annual billing saves 2 months (pay for 10, get 12).

**Future add-ons (not built now):** Credit packs for users who exceed their campaign cap. Team seats (Enterprise) — deferred to Phase 2 with its own design doc.

---

## 2. Stripe Integration Architecture

### Products & Prices

Create 4 Stripe Price objects:
- Pro Monthly: $9/mo
- Pro Annual: $90/yr
- Enterprise Monthly: $29/mo
- Enterprise Annual: $290/yr

### Checkout Flow

Users click "Upgrade" and are redirected to **Stripe Checkout** (hosted by Stripe). No custom payment form — more secure, less code, PCI compliant out of the box.

### Subscription Management

Users manage their subscription through **Stripe Customer Portal** (hosted by Stripe): cancel, switch plans, update payment method. Accessed from the Settings > Billing page.

### Webhook Sync

Stripe sends events to `/api/webhooks/stripe`. This route must use `export const runtime = 'nodejs'` (not edge) to access the raw request body for signature verification.

**Security requirements:**
- Verify webhook signatures using `STRIPE_WEBHOOK_SECRET` via `stripe.webhooks.constructEvent()`
- Store processed `event.id` values to prevent duplicate processing (idempotency)
- Handle out-of-order events by checking `event.created` timestamps against current state

**Events handled:**
- `checkout.session.completed` — Create subscription record, update user tier
- `customer.subscription.updated` — Plan changes (upgrades/downgrades)
- `customer.subscription.deleted` — Cancellation, downgrade to Free
- `invoice.payment_failed` — Mark subscription as `past_due`; maintain full access during Stripe's retry period (~3 weeks). Only downgrade to Free on `customer.subscription.deleted` after all retries exhaust.

**Key principle:** Stripe is the source of truth for billing state. Our database mirrors it via webhooks. Feature gating checks happen server-side only.

**Environment variables required:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_ENTERPRISE_MONTHLY`, `STRIPE_PRICE_ENTERPRISE_ANNUAL`

### Data Flow

```
User clicks Upgrade → Stripe Checkout → Payment succeeds
    → Stripe fires webhook → /api/webhooks/stripe updates Supabase
    → User's tier changes → Features unlock immediately
```

---

## 3. Database Changes

### New `subscriptions` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | Subscription owner |
| stripe_customer_id | text | Stripe Customer ID |
| stripe_subscription_id | text | Stripe Subscription ID |
| stripe_price_id | text | Current Stripe Price ID |
| tier | enum ('free', 'pro', 'enterprise') | Current tier |
| status | text | Stripe subscription status (active, past_due, canceled, etc.) |
| billing_cycle | enum ('monthly', 'annual') | Current billing cycle |
| current_period_start | timestamptz | |
| current_period_end | timestamptz | |
| cancel_at_period_end | boolean | Whether cancellation is pending |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `team_members` table — DEFERRED TO PHASE 2

The team members system (Enterprise seats) requires its own design doc covering: invitation flow, acceptance flow, member limits, ownership transfer, shared campaign pool mechanics, and multi-team rules. Not in scope for Phase 1.

### `campaigns` table changes

Add column: `generated_at_tier` (enum: 'free', 'pro', 'enterprise', default 'free'). Recorded at campaign creation time. When a user downgrades, campaigns generated while on a paid tier retain full platform visibility and export access. Only new campaigns are gated by the current tier.

### `profiles` table changes

Add column: `tier` (enum: 'free', 'pro', 'enterprise', default 'free'). This is a denormalized cache of the subscription tier for fast lookups. Updated by webhooks only — must NOT be added to the authenticated user `GRANT UPDATE` list (same protection pattern as `role` column).

---

## 4. Feature Gating & Enforcement

### Server-Side Gates

All gating is enforced at the API level. The client shows upgrade prompts but never controls access.

| Gate | Check Location | Behavior |
|------|---------------|----------|
| Campaign limit | `/api/campaign/create` | Count campaigns this month vs tier limit. Return 403 + upgrade message. |
| Platform access | Campaign UI (client-side display) | All platforms generated server-side always. Free users only see/access 5 platforms in UI. Upgrading instantly reveals already-generated content. |
| PDF/Zip export | `/api/export/*` | Check tier. Free users get 403 + upgrade prompt. |
| Share links | `/api/campaign/[id]/share` | Check tier. Free users get 403 + upgrade prompt. |
| Regeneration | `/api/regenerate-platform` | Check tier. Free users get 403 + upgrade prompt. |
| Team seats | Deferred to Phase 2 | Not in scope for this phase. |

### Client-Side UX

Free users see locked features with "Upgrade to Pro" badges. Locked platforms show a blurred preview with an upgrade CTA. This drives conversion by showing what they're missing.

---

## 5. New Routes & Pages

| Route | Purpose |
|-------|---------|
| `/pricing` | Public pricing comparison page with monthly/annual toggle |
| `/settings/billing` | Current plan, usage stats, renewal date, "Manage Subscription" button |
| `/api/stripe/checkout` | Creates Stripe Checkout session and returns redirect URL |
| `/api/stripe/portal` | Creates Stripe Customer Portal session and returns redirect URL |
| `/api/webhooks/stripe` | Receives Stripe webhook events, updates Supabase |

### Pricing Page

- Clean 3-column tier comparison
- Monthly/annual toggle with "Save 2 months" badge
- CTAs: Free (current plan), Pro (Upgrade), Enterprise (Upgrade)
- Linked from: landing page, dashboard upgrade prompts, settings

### Billing Settings

- Shows current tier, billing cycle, next renewal date
- Campaign usage bar (e.g., "8 of 15 campaigns used this month")
- "Manage Subscription" → Stripe Customer Portal
- "Change Plan" → Pricing page
- **Past-due state:** Warning banner when subscription is `past_due` with "Update Payment Method" CTA linking to Stripe Customer Portal. User retains full access during Stripe's retry period.

---

## 6. Admin Visibility

- Admin user list shows each user's tier and subscription status
- Admins can manually override tiers (extends existing `rate_limit_exempt` pattern)
- Admin dashboard shows aggregate tier distribution metrics

---

## 7. Migration Strategy

### Existing Users

All existing users start on the **Free** tier. The current beta usage cap system (`campaign-limits.ts`) is replaced by the new tier-based limits. Existing `rate_limit_exempt` users and admins continue to bypass limits.

### Rollout

1. Deploy Stripe integration + database changes
2. Deploy feature gating (behind a feature check)
3. Deploy pricing page + upgrade flows
4. Announce via email to existing users

---

## 8. Downgrade Behavior

When a user downgrades (cancellation or payment failure after retries):
- **Existing campaigns** generated while on a paid tier retain full platform visibility and export access (tracked via `generated_at_tier` on campaigns table)
- **Existing share links** continue working until their `share_expires_at` expiry
- **New campaigns** and actions are gated by the current (Free) tier
- Downgrade only occurs on `customer.subscription.deleted` — NOT on `invoice.payment_failed`

---

## 9. What's NOT In Scope

- Credit/top-up packs (future add-on)
- Team seats / Enterprise team management (Phase 2 — separate design doc)
- White-label / custom branding
- API access for Enterprise
- Usage-based billing
- Promo codes / coupons (can add via Stripe dashboard later — `allow_promotion_codes: true` is one line)
- Free trial period for Pro/Enterprise (users already have a permanent Free tier)
- In-app payment failure notifications (Stripe sends email; in-app can be Phase 2)

---

## Market Research Context

Competitor pricing at time of design:
- ListingAI: $14-$36/mo
- Saleswise: $39/mo (single tier)
- Zeely AI: ~$30/mo

AdDrop's $9/$29 pricing undercuts competitors while offering unique multi-platform + compliance value. Goal is user acquisition over margin at this stage.

Sources:
- [ListingAI Pricing](https://www.listingai.co/pricing)
- [Saleswise](https://www.saleswise.ai/)
- [Zeely AI](https://zeely.ai/blog/creative-real-estate-ads/)
