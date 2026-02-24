# Account Tiers & Payment Processing Design

**Status:** Approved
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
| Team Seats | No | No | Yes |

Annual billing saves 2 months (pay for 10, get 12).

**Future add-on (not built now):** Credit packs for users who exceed their campaign cap.

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

Stripe sends events to `/api/webhooks/stripe`. We handle:
- `checkout.session.completed` — Create subscription record, update user tier
- `customer.subscription.updated` — Plan changes (upgrades/downgrades)
- `customer.subscription.deleted` — Cancellation, downgrade to Free
- `invoice.payment_failed` — Mark subscription as past due; after final retry failure, downgrade to Free

**Key principle:** Stripe is the source of truth for billing state. Our database mirrors it via webhooks. Feature gating checks happen server-side only.

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

### New `team_members` table (Enterprise)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| team_owner_id | uuid (FK → profiles) | Enterprise account owner |
| member_id | uuid (FK → profiles) | Invited team member |
| role | enum ('member', 'admin') | Role within the team |
| invited_at | timestamptz | |
| accepted_at | timestamptz | |

Team members inherit the owner's tier for feature access. Their campaigns count against the team's shared pool (75/month).

### `profiles` table changes

Add column: `tier` (enum: 'free', 'pro', 'enterprise', default 'free'). This is a denormalized cache of the subscription tier for fast lookups. Updated by webhooks.

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
| Team seats | Team management UI + API | Only Enterprise tier can invite/manage team members. |

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

## 8. What's NOT In Scope

- Credit/top-up packs (future add-on)
- White-label / custom branding
- API access for Enterprise
- Usage-based billing
- Promo codes / coupons (can add via Stripe dashboard later without code changes)
- Free trial period for Pro/Enterprise (users already have a permanent Free tier)

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
