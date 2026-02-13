# Phase 1 Implementation Plan: Core Auth

**Design Doc:** `docs/plans/2026-02-10-user-accounts-design.md`
**Goal:** Users can sign up, log in, recover passwords, and own their data.
**Approach:** Agent team with strict file ownership — no two agents touch the same file.

---

## Prerequisites (Manual — Supabase Dashboard)

Before code deployment:
1. Enable email confirmations (Auth > Settings) — **CRITICAL for enumeration prevention (C5)**
2. Configure Cloudflare Turnstile CAPTCHA (Auth > Settings)
3. Set up SendGrid custom SMTP (Auth > SMTP) — SPF/DKIM/DMARC
4. Set JWT expiry to 900 seconds (Auth > Settings)
5. Add redirect URLs: `/auth/callback` (Auth > URL Configuration)
6. Set password minimum length to 8 (Auth > Settings)

---

## Agent Team Structure

### Agent 1: `database` — Migrations, API Security, Auth Callback

**Owned files:**
- `supabase/migrations/20260210_phase1_user_accounts.sql` (NEW)
- `src/app/api/generate/route.ts` (MODIFY — add auth)
- `src/app/api/export/route.ts` (MODIFY — add auth)
- `src/app/auth/callback/route.ts` (NEW — PKCE handler)
- `src/app/admin/layout.tsx` (MODIFY — fix null assertion I5)
- `src/lib/supabase/auth-helpers.ts` (NEW — shared `requireAuth()` helper)

**Tasks:**

1. **Create migration: `20260210_phase1_user_accounts.sql`**
   - Add columns to profiles: `avatar_url text`, `phone text`, `company text`, `updated_at timestamptz default now()`
   - Add RLS policy: `"Users can update own profile"` for UPDATE using `auth.uid() = id` (C1)
   - Add `handle_updated_at()` trigger function + trigger on profiles (I4)
   - Create `campaigns` table with RLS + explicit `WITH CHECK` (C2):
     ```sql
     campaigns (id uuid PK, user_id uuid FK, name text, listing_data jsonb,
                generated_ads jsonb, platform text, status text, created_at, updated_at)
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id)
     ```

2. **Create shared auth helper: `src/lib/supabase/auth-helpers.ts`**
   - Export `requireAuth()` function that:
     - Creates server Supabase client
     - Calls `getUser()`
     - Returns `{ user, supabase }` or throws/returns 401 response
   - Used by both API routes to avoid duplicating auth logic

3. **Add auth to `/api/generate/route.ts`** (C4)
   - Import `requireAuth()` from auth-helpers
   - At top of POST handler: verify user is authenticated
   - Return 401 if not authenticated
   - Keep all existing logic unchanged

4. **Add auth to `/api/export/route.ts`** (C4)
   - Same pattern as generate route
   - Import `requireAuth()`, verify auth at top of POST
   - Return 401 if not

5. **Create `/auth/callback/route.ts`** (C7)
   - **MUST use middleware-style client** (`createServerClient` with `request.cookies.getAll()` / `response.cookies.set()`)
   - **NOT** the `server.ts` client (which uses `next/headers`)
   - Handle PKCE code exchange: extract `code` from URL searchParams
   - Exchange code via `supabase.auth.exchangeCodeForSession(code)`
   - Read `next` param from URL to determine redirect destination
   - Default redirect to `/dashboard` if no `next` param
   - Handle errors gracefully (expired/invalid tokens → redirect to `/login` with error param)

6. **Fix admin layout null assertion** (I5)
   - Change `user!.id` to `user?.id` with redirect fallback
   - If no user (shouldn't happen due to middleware, but defensive): redirect to `/login`

---

### Agent 2: `auth-pages` — Auth UI Pages + Error Sanitization

**Owned files:**
- `src/app/login/page.tsx` (MODIFY — add links, sanitize errors)
- `src/app/signup/page.tsx` (NEW)
- `src/app/forgot-password/page.tsx` (NEW)
- `src/app/reset-password/page.tsx` (NEW)
- `src/lib/auth/sanitize-error.ts` (NEW — error message sanitizer)
- `src/components/auth/captcha.tsx` (NEW — Turnstile CAPTCHA component)

**Tasks:**

1. **Create error sanitizer: `src/lib/auth/sanitize-error.ts`** (C6)
   - Export `sanitizeAuthError(error: AuthError | Error | string): string`
   - Maps known Supabase error messages to generic user-facing messages:
     - `"Invalid login credentials"` → `"Invalid email or password"`
     - `"User already registered"` → `"Unable to create account. Please try again or sign in."`
     - `"Email not confirmed"` → `"Please check your email to confirm your account"`
     - Any unknown auth error → `"Something went wrong. Please try again."`
   - Never expose raw Supabase error text to the user

2. **Create CAPTCHA component: `src/components/auth/captcha.tsx`**
   - Client component wrapping Cloudflare Turnstile
   - Props: `onVerify(token: string)`, `onError()`, `onExpire()`
   - Renders the Turnstile widget (uses sitekey from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`)
   - Returns captcha token for passing to Supabase auth calls
   - Note: actual enforcement is server-side via Supabase dashboard config

3. **Update login page: `src/app/login/page.tsx`**
   - Add "Forgot password?" link below password field → links to `/forgot-password`
   - Add "Don't have an account? Sign up" link below submit → links to `/signup`
   - Replace `setError(error.message)` with `setError(sanitizeAuthError(error))` (C6)
   - Change post-login redirect for non-admin users: `router.push('/')` → `router.push('/dashboard')`
   - Add CAPTCHA component, pass token to `signInWithPassword({ captchaToken })`
   - Keep existing styling patterns (Tailwind, gold accent, bg-background)

4. **Create signup page: `src/app/signup/page.tsx`**
   - Client component matching login page style
   - Fields: email, password, confirm password (display_name optional)
   - Client-side validation: passwords match, min 8 chars
   - Call `supabase.auth.signUp({ email, password, options: { data: { display_name }, captchaToken } })`
   - On success: show "Check your email to confirm your account" message (NOT auto-redirect)
   - Use `sanitizeAuthError()` for all error display
   - Link to "Already have an account? Sign in" → `/login`
   - Include CAPTCHA component

5. **Create forgot-password page: `src/app/forgot-password/page.tsx`**
   - Client component
   - Single field: email
   - Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback?next=/reset-password', captchaToken })`
   - **Always** show generic success: "If an account with that email exists, we've sent a reset link" (enumeration prevention)
   - Show "Back to sign in" link → `/login`
   - Include CAPTCHA component
   - Include "Check your spam folder" helper text

6. **Create reset-password page: `src/app/reset-password/page.tsx`**
   - Client component
   - Fields: new password, confirm password
   - This page is reached AFTER `/auth/callback` exchanges the PKCE token (session already active)
   - Call `supabase.auth.updateUser({ password })` to set new password
   - After success: call `supabase.auth.signOut({ scope: 'global' })` to kill all sessions
   - Then redirect to `/login` with success message: "Password reset successful. Please sign in."
   - Handle error case: if no active session (token expired/invalid), show error with link back to `/forgot-password`
   - Password strength indicator (simple: length + character variety)

---

### Agent 3: `middleware` — Middleware Extension + User Dashboard

**Owned files:**
- `src/lib/supabase/middleware.ts` (MODIFY — extend for user routes)
- `src/app/dashboard/page.tsx` (NEW)
- `src/app/dashboard/layout.tsx` (NEW — dashboard layout with user nav)

**Tasks:**

1. **Extend middleware: `src/lib/supabase/middleware.ts`**
   - Add protection for `/dashboard/*` and `/settings/*` — require authenticated user (any role)
   - If not authenticated on these routes → redirect to `/login`
   - Update login page redirect (I2): if authenticated non-admin visits `/login`, redirect to `/dashboard`
   - Keep existing admin route protection UNCHANGED
   - Redirect authenticated users away from `/signup` and `/forgot-password` too
   - Route logic order:
     1. Admin routes → require auth + admin role (existing)
     2. User routes (`/dashboard/*`, `/settings/*`) → require auth (new)
     3. Auth pages (`/login`, `/signup`, `/forgot-password`) → redirect if already authenticated (updated)

2. **Create dashboard layout: `src/app/dashboard/layout.tsx`**
   - Server component
   - Get user + profile from Supabase server client
   - Simple header with: user name/email, role badge, sign-out button
   - Navigation: Dashboard, Settings (future)
   - Use existing style patterns from admin layout (Tailwind, sidebar concept but simpler)
   - Use `user?.id` (optional chaining, not `user!.id`)

3. **Create dashboard page: `src/app/dashboard/page.tsx`**
   - Server component
   - Query user's campaigns from Supabase (will be empty initially — that's fine)
   - Show welcome message with user's display_name or email
   - "Create New Campaign" CTA button (links to main ad generation flow `/`)
   - List existing campaigns (empty state: "No campaigns yet. Create your first ad!")
   - Campaign cards showing: name, platform, status, created date
   - Use existing Tailwind patterns

---

## File Ownership Matrix

| File | Owner | Action |
|------|-------|--------|
| `supabase/migrations/20260210_phase1_user_accounts.sql` | database | CREATE |
| `src/lib/supabase/auth-helpers.ts` | database | CREATE |
| `src/app/api/generate/route.ts` | database | MODIFY |
| `src/app/api/export/route.ts` | database | MODIFY |
| `src/app/auth/callback/route.ts` | database | CREATE |
| `src/app/admin/layout.tsx` | database | MODIFY |
| `src/lib/auth/sanitize-error.ts` | auth-pages | CREATE |
| `src/components/auth/captcha.tsx` | auth-pages | CREATE |
| `src/app/login/page.tsx` | auth-pages | MODIFY |
| `src/app/signup/page.tsx` | auth-pages | CREATE |
| `src/app/forgot-password/page.tsx` | auth-pages | CREATE |
| `src/app/reset-password/page.tsx` | auth-pages | CREATE |
| `src/lib/supabase/middleware.ts` | middleware | MODIFY |
| `src/app/dashboard/page.tsx` | middleware | CREATE |
| `src/app/dashboard/layout.tsx` | middleware | CREATE |

**Zero file conflicts.** Each file has exactly one owner.

---

## Dependency Order

```
database (tasks 1-2) ──┐
                        ├──→ auth-pages (can start immediately, uses auth-helpers when ready)
middleware (task 1)  ───┘    middleware (tasks 2-3, can start immediately)
```

All three agents can start in parallel. The `auth-helpers.ts` created by `database` is imported by API routes (also owned by database), so no cross-agent dependency. Auth pages import `sanitize-error.ts` which they own. Dashboard imports from supabase/server which already exists.

---

## Verification Checklist (Post-Build)

- [ ] `npm run build` passes with no errors
- [ ] Existing login flow still works (admin → /admin)
- [ ] `/signup` renders and form submits (email confirmation sent)
- [ ] `/forgot-password` shows generic success for any email
- [ ] `/auth/callback` exchanges PKCE tokens correctly
- [ ] `/reset-password` allows setting new password
- [ ] `/dashboard` shows for authenticated users
- [ ] `/dashboard` redirects to `/login` for unauthenticated users
- [ ] `/api/generate` returns 401 for unauthenticated requests
- [ ] `/api/export` returns 401 for unauthenticated requests
- [ ] Admin layout doesn't crash if profile query fails
- [ ] Middleware redirects authenticated users away from auth pages
- [ ] Error messages are sanitized (no raw Supabase errors shown)
- [ ] Migration applies cleanly (profiles extended, campaigns created)
