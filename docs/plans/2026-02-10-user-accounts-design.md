# User Accounts Architecture Design

**Date:** 2026-02-10
**Status:** Approved with Changes (Design Review 2026-02-10)
**Scope:** Secure user accounts with authentication, account recovery, and MFA

---

## Executive Summary

This design adds full user account management to AdDrop, building on the existing Supabase Auth foundation. The approach maximizes Supabase-native features to minimize custom code while ensuring security for real estate professionals who may not be technically sophisticated.

**Core principle:** Supabase provides 80% of what we need out-of-box. We build the remaining 20% (UI, custom backup codes, rate limiting, account deletion grace period).

---

## Architecture Overview

### Auth Methods (Priority Order)

| Method | Phase | Rationale |
|--------|-------|-----------|
| Email + Password | Phase 1 | Foundation. Already partially implemented. |
| Password Recovery | Phase 1 | Non-negotiable for any production auth. |
| Email Confirmation | Phase 1 | Supabase default. Prevents fake accounts. |
| CAPTCHA (Cloudflare Turnstile) | Phase 1 | Blocks automated attacks on signup/login/reset. |
| TOTP MFA (mandatory for admins) | Phase 2 | Required for admin access. Opt-in for regular users. |
| OAuth (Google) | Phase 3 | Social login for reduced friction. |
| OAuth (Apple, Microsoft) | Phase 3 | Additional professional-oriented providers. |

### New Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/signup` | Page | User registration form |
| `/forgot-password` | Page | Email input for password reset |
| `/reset-password` | Page | New password entry (after email link) |
| `/auth/callback` | API Route | PKCE token exchange — MUST use middleware-style client with request/response cookies, NOT next/headers (C7) |
| `/dashboard` | Page | User home after login (campaigns, saved ads) |
| `/settings/account` | Page | Profile, email change, account deletion |
| `/settings/security` | Page | MFA enrollment, active sessions, backup codes |

### Database Changes

#### Extended Profiles Table (migration)
```sql
-- Add fields to existing profiles table
alter table public.profiles
  add column avatar_url text,
  add column phone text,
  add column company text,
  add column updated_at timestamptz default now();

-- REVIEW FIX C1: Users need to update their own profile for Phase 2
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- REVIEW FIX I4: Auto-update updated_at on profile changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();
```

#### New Tables

```sql
-- Per-user campaigns (links ad generations to users)
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  listing_data jsonb not null,
  generated_ads jsonb,
  platform text,
  status text default 'draft' check (status in ('draft', 'generated', 'exported')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.campaigns enable row level security;
create policy "Users own their campaigns" on public.campaigns
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Account deletion with 30-day grace period (GDPR)
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  requested_at timestamptz default now(),
  scheduled_deletion_at timestamptz default (now() + interval '30 days'),
  reason text,
  status text default 'pending' check (status in ('pending', 'cancelled', 'completed')),
  completed_at timestamptz
);
alter table public.account_deletion_requests enable row level security;
create policy "Users see own deletion requests" on public.account_deletion_requests
  for select using (auth.uid() = user_id);

-- MFA backup codes (hashed, server-side only)
create table public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
alter table public.mfa_backup_codes enable row level security;
-- No user-facing policies: accessed only via service_role on server

-- Audit log for sensitive actions
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  action text not null,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz default now()
);
alter table public.audit_log enable row level security;
create policy "Admins read audit log" on public.audit_log
  for select using (public.is_admin());
```

---

## Account Recovery Strategy

### 1. Password Reset
- `resetPasswordForEmail()` sends email with PKCE token
- `/auth/callback` exchanges token, redirects to `/reset-password`
- User sets new password, all other sessions are globally revoked
- Generic success message prevents email enumeration
- 60-second cooldown between requests (Supabase-enforced)

### 2. Account Lockout
- Supabase's built-in IP-based rate limiting (1800/hr on token endpoint)
- CAPTCHA (Turnstile) on login/signup/reset forms adds friction for bots
- Password reset bypasses lockout (email proves identity)
- No custom lockout table needed in Phase 1 — Supabase + CAPTCHA is sufficient

### 3. Email Change
- Requires re-authentication first
- Dual confirmation enabled (old email + new email must both confirm)
- Profile table synced via `onAuthStateChange` or database trigger

### 4. Account Deletion
- Re-authentication required
- 30-day grace period with cancellation option
- Scheduled function processes deletions after grace period
- GDPR-compliant: data export as JSON/ZIP before deletion (I6)
- Cascading deletes handle cleanup (profiles, campaigns, backup codes)
- Deletion processor uses atomic UPDATE...RETURNING to prevent race conditions (I7)
- Pre-delete step must clean up Supabase Storage objects (avatars, images) (M1)

### 5. Session Management
- JWT expiry: 15 minutes (short-lived, auto-refreshed)
- Refresh token rotation with 10-second reuse window (theft detection)
- Inactivity timeout: 7 days
- Maximum session: 30 days
- "Sign out everywhere" available in settings

### 6. MFA Recovery
- Primary: TOTP via authenticator app
- Backup: Encourage secondary TOTP on different device (Supabase-native)
- Fallback: Custom backup codes (8 one-time codes, hashed with bcrypt)
- Last resort: Admin can disable MFA after out-of-band identity verification
- Persistent warning if no backup method is configured

---

## Security Architecture

### Defense Layers

| Layer | Mechanism |
|-------|-----------|
| Bot prevention | Cloudflare Turnstile CAPTCHA on auth forms |
| Rate limiting | Supabase built-in + Upstash Redis for custom limits |
| Password strength | Min 8 chars, HaveIBeenPwned check (Pro plan) |
| Session security | Short JWT (15min), refresh rotation, global revocation |
| MFA | Mandatory TOTP for admins, optional for users, with backup codes |
| Email enumeration | Generic responses on all auth endpoints + email confirmations ENABLED (C5) |
| Error sanitization | All auth errors mapped to generic messages — never expose Supabase error text (C6) |
| RLS | All user data behind `auth.uid() = user_id` policies |
| Audit trail | Sensitive actions logged to audit_log table |

### Custom Rate Limits (via Upstash Redis)

| Action | Limit | Window |
|--------|-------|--------|
| Password reset | 3 requests | 1 hour |
| Login attempts | 5 attempts | 15 min |
| Email change | 2 requests | 1 hour |
| Account deletion | 1 request | 24 hours |
| Backup code verification | 5 attempts | 1 hour |

### Middleware Changes
- Current: Protects `/admin/*` only, queries profiles table on every request
- New: Also protect `/dashboard/*` and `/settings/*` for authenticated users
- New: Redirect authenticated non-admin users from `/login` to `/dashboard` (I2)
- Optimization (Phase 2): Cache role in `app_metadata` JWT claims to eliminate profiles query per request. Use `set_claim()` function on role change instead.
- Phase 2 JWT claims migration sequence (I3): (1) create `set_claim()` function → (2) backfill ALL existing users → (3) add trigger for new signups/role changes → (4) THEN switch middleware

### Admin MFA Middleware Logic (Phase 2) — C3
Admin routes must handle four states:
1. Not authenticated → redirect to `/login`
2. Authenticated admin, MFA not enrolled → redirect to `/settings/security` (must be accessible at AAL1)
3. Authenticated admin, MFA enrolled but not verified this session → redirect to MFA challenge
4. Authenticated admin, AAL2 verified → allow through

**Critical:** `/settings/security` MUST be accessible without AAL2 to avoid chicken-and-egg lockout.

---

## Supabase Dashboard Configuration Required

| Setting | Value | Location |
|---------|-------|----------|
| Email confirmations | **CRITICAL: Enable BEFORE signup goes live** — prevents email enumeration (C5) | Auth > Settings |
| Secure email change | Enabled (dual confirmation) | Auth > Settings |
| Password min length | 8 | Auth > Settings |
| CAPTCHA | Cloudflare Turnstile | Auth > Settings |
| Custom SMTP (SendGrid) | Required for production | Auth > SMTP |
| JWT expiry | 900 (15 min) | Auth > Settings |
| Site URL | Production domain | Auth > URL Configuration |
| Redirect URLs | `/auth/callback`, `/reset-password` | Auth > URL Configuration |
| Google OAuth | Enable + configure (Phase 3) | Auth > Providers |

---

## Implementation Phases

### Phase 1: Core Auth (P0 — Must Have)
**Goal:** Users can sign up, log in, recover passwords, and own their data.

| Task | Files |
|------|-------|
| Create `/auth/callback` API route (PKCE handler) | `src/app/auth/callback/route.ts` |
| Create `/signup` page | `src/app/signup/page.tsx` |
| Add "Forgot password?" to login page | `src/app/login/page.tsx` |
| Create `/forgot-password` page | `src/app/forgot-password/page.tsx` |
| Create `/reset-password` page | `src/app/reset-password/page.tsx` |
| Add CAPTCHA to auth forms | Auth form components |
| Create campaigns table migration | `supabase/migrations/` |
| Create user dashboard | `src/app/dashboard/page.tsx` |
| Extend middleware for user routes | `src/lib/supabase/middleware.ts` |
| Add auth to API routes (`/api/generate`, `/api/export`) | `src/app/api/*/route.ts` |
| Sanitize auth error messages (generic responses only) | All auth form components |
| Add RLS policy: users can update own profile | `supabase/migrations/` |
| Configure Supabase dashboard settings (email confirmations ON first!) | Dashboard (manual) |
| Set up custom SMTP (SendGrid + SPF/DKIM/DMARC) | Dashboard (manual) |

### Phase 2: Admin MFA + Profile Management (P1 — Should Have)
**Goal:** Mandatory MFA for admins, profile management for all users.

| Task | Files |
|------|-------|
| TOTP MFA enrollment UI | `src/app/settings/security/page.tsx` |
| Mandatory MFA enforcement for admins in middleware | `src/lib/supabase/middleware.ts` |
| MFA backup codes generation and verification | Settings security + server actions |
| MFA backup codes table migration | `supabase/migrations/` |
| Create `/settings/account` page | `src/app/settings/account/page.tsx` |
| Email change flow with dual confirmation | Settings account page |
| Profile editing (name, company, avatar) | Settings account page |
| Optimize middleware (role in JWT claims) | Middleware + Supabase function |

### Phase 3: Security Hardening + OAuth (P2 — Nice to Have)
**Goal:** Social login, account deletion, and advanced session management.

| Task | Files |
|------|-------|
| Add Google OAuth provider | Login + signup pages |
| Account deletion with grace period | Settings account + server actions |
| Account deletion requests table migration | `supabase/migrations/` |
| Active sessions view + "sign out everywhere" | Settings security page |
| Audit log table + logging | `supabase/migrations/` + server actions |
| Additional OAuth providers (Apple, Microsoft) | Auth forms |
| Custom rate limiting with Upstash Redis | Middleware + API routes |

---

## Migration Path (No Breaking Changes)

1. All new routes are additive — no existing routes change behavior
2. Login page gets new links ("Forgot password?", "Sign up") but keeps working as-is
3. Middleware gains new protected routes but existing `/admin/*` protection unchanged
4. Profiles table gets new columns (nullable, no breaking change)
5. New tables are independent with proper RLS
6. Existing admin functionality untouched throughout all phases
7. Fix admin layout null assertion (`user!.id` → `user?.id` with redirect fallback) (I5)

---

## Dependencies

| Dependency | Purpose | Phase |
|------------|---------|-------|
| SendGrid | Production email delivery (SMTP) | 1 |
| Cloudflare Turnstile | CAPTCHA | 1 |
| `@upstash/ratelimit` + `@upstash/redis` | Custom rate limiting | 3 |
| Supabase Pro plan (optional) | HaveIBeenPwned password check | 3 |

---

## Decisions Made

1. **Email provider:** SendGrid for transactional emails
2. **OAuth:** No OAuth in Phase 1 or 2 — moved to Phase 3. Email+password first.
3. **Admin MFA:** Mandatory. Admins must enroll TOTP before accessing `/admin/*`. Enforced in middleware via AAL2 check. Moved to Phase 2.
4. **User data:** Campaigns + generated ads for now. Schema is flexible (JSONB) for future additions.
5. **Tiers:** Future consideration. Not designed into Phase 1-3. Account creation is all-access for now; tier system will be a separate design when ready.

---

## Design Review Summary (2026-02-10)

**Verdict: APPROVED WITH CHANGES**

All critical items (C1-C7) have been incorporated into this design doc above. See the full review record below.

### Critical Issues (All Resolved)
- **C1** — Added RLS policy for users to update own profile
- **C2** — Added explicit `WITH CHECK` to campaigns RLS
- **C3** — Documented 4-state MFA middleware logic with AAL1 enrollment access
- **C4** — Added "auth to API routes" as Phase 1 task (pre-existing vulnerability)
- **C5** — Marked email confirmations as critical prerequisite, must be ON before signup
- **C6** — Added error sanitization as Phase 1 task
- **C7** — Specified middleware-style client for `/auth/callback` (not next/headers)

### Important Issues (Tracked for Implementation)
- **I1** — CAPTCHA must be Supabase project-level (server-enforced), not just client
- **I2** — Redirect authenticated users from `/login` to `/dashboard`
- **I3** — JWT claims migration must follow strict sequence (function → backfill → trigger → switch)
- **I4** — Added `updated_at` trigger for profiles table
- **I5** — Fix admin layout `user!.id` null assertion
- **I6** — Data export as JSON/ZIP before account deletion
- **I7** — Atomic deletion processing to prevent race conditions

### Minor Items (Later Phases)
- **M1** — Storage object cleanup before user deletion
- **M2** — SendGrid SPF/DKIM/DMARC setup documented as prerequisite
- **M3** — Admin access to user campaigns (design decision to document)
- **M4** — Post-migration smoke test suite
- **M5** — Standardize migration file naming (timestamp-prefixed)
