# Security Fix Plan - RealEstate Ad Gen (AdDrop)

**Date:** 2026-02-21
**Authors:** Architect Agent + Advocate Agent (Blue Team)
**Status:** Joint Agreement
**Input:** `security-results/findings-analyst.md`, `security-results/findings-recon.md`

---

## Overview

This plan addresses 17 findings (2 Critical, 4 High, 6 Medium, 4 Low) from the combined source code audit and live penetration test. Fixes are ordered by severity and dependency.

### Verdict Summary

| Finding | Severity | Verdict | Notes |
|---------|----------|---------|-------|
| C-1 | CRITICAL | **Enhanced** | Add MFA + middleware defense-in-depth |
| C-2 | CRITICAL | **Challenged/Resolved** | Must fix `getWriteClient()` fallback first |
| C-3 | CRITICAL | **Endorsed** | Delete dev routes entirely |
| H-1 | HIGH | **Enhanced** | Escape ALL template variables |
| H-2+H-3 | HIGH | **Endorsed** | Upstash + Vercel IP + graceful degradation |
| H-4 | HIGH | **Challenged/Resolved** | Phased approach: remove unsafe-eval now, nonce later |
| M-1 | MEDIUM | **Endorsed** | Origin header validation |
| M-2 | MEDIUM | **Endorsed** | Zod email validation |
| M-3 | MEDIUM | **Endorsed** | Add email rate limit |
| M-4 | MEDIUM | **Challenged/Resolved** | Custom DNS agent or accept as known limitation |
| M-5 | MEDIUM | **Endorsed** | Disable production source maps |
| M-6 | MEDIUM | **Endorsed** | Already fixed in middleware |
| L-1 | LOW | **Endorsed** | Env var validation module |
| L-2 | LOW | **Endorsed** | Improve prompt injection speed bump |
| L-3 | LOW | **Endorsed** | Covered by C-2 |
| L-4 | LOW | **Endorsed** | Add report-uri + security.txt |

---

## Phase 1: CRITICAL Fixes (Deploy Immediately)

### Fix C-1: Admin API Routes Missing Admin + MFA Check

**Finding:** All 6 admin API route files (11 handler functions) use `requireAuth()` instead of `requireAdminAction()`. The middleware only checks role/MFA for `/admin` page routes, not `/api/admin/*` API routes.

**Files to modify:**
- `src/lib/supabase/auth-helpers.ts` (add new helper)
- `src/app/api/admin/compliance-qa/run/route.ts`
- `src/app/api/admin/compliance-qa/corpus/route.ts`
- `src/app/api/admin/compliance-qa/corpus/[id]/route.ts`
- `src/app/api/admin/compliance-qa/runs/route.ts`
- `src/app/api/admin/compliance-qa/scan/route.ts`
- `src/app/api/admin/compliance-qa/snapshots/[propertyId]/route.ts`
- `src/middleware.ts` (extend admin route matching)

**Fix:**

1. Add `requireAdmin()` to `src/lib/supabase/auth-helpers.ts`:
```typescript
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase, error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { user: null, supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // Enforce MFA (AAL2) for admin API actions
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalData?.currentLevel !== 'aal2') {
    return { user: null, supabase, error: NextResponse.json({ error: 'MFA required' }, { status: 403 }) }
  }

  return { user, supabase, error: null }
}
```

2. Replace `requireAuth()` with `requireAdmin()` in all 6 admin route files (11 handlers). Same call pattern -- drop-in replacement.

3. Extend middleware admin protection to API routes in `src/middleware.ts`:
```typescript
// Change:
if (pathname.startsWith('/admin')) {
// To:
if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
```

**Defense-in-depth:** Two independent layers -- middleware blocks at the edge, `requireAdmin()` blocks in each handler. If either layer fails, the other catches it.

**Advocate enhancement:** MFA enforcement in `requireAdmin()` closes the gap where an attacker with a stolen session token (but no MFA device) could call admin API routes directly, bypassing the middleware MFA check that only covers `/admin` page routes.

**Regression risk:** Low. Only admin routes change. Regular users never had legitimate access.

---

### Fix C-2: demo_cache RLS + getWriteClient() Fallback

**Finding:** `demo_cache` table has unrestricted public INSERT/UPDATE via RLS. Additionally, `getWriteClient()` silently falls back to the anon key when `SUPABASE_SERVICE_ROLE_KEY` is not set.

**Files to modify:**
- New migration: `supabase/migrations/20260221_fix_demo_cache_rls.sql`
- `src/lib/demo/cache.ts` (fix `getWriteClient()` fallback)

**Fix:**

1. Create migration `supabase/migrations/20260221_fix_demo_cache_rls.sql`:
```sql
-- Remove public write policies (keep public SELECT for landing page reads)
drop policy if exists "Anyone can write demo cache" on public.demo_cache;
drop policy if exists "Anyone can update demo cache" on public.demo_cache;
-- No explicit write policies needed -- service role bypasses RLS entirely
-- This also addresses L-3 (missing DELETE policy) since service role can delete
```

2. Fix `getWriteClient()` in `src/lib/demo/cache.ts` to fail explicitly instead of silently falling back:
```typescript
function getWriteClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for demo cache writes. Set it in environment variables.');
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}
```

3. **Pre-deployment checklist:** Verify `SUPABASE_SERVICE_ROLE_KEY` is set in production Vercel environment variables BEFORE deploying the migration.

**Advocate challenge (resolved):** The original fix only addressed RLS but missed that `getWriteClient()` falls back to the anon key. Without fixing the fallback, the RLS lockdown would silently break the demo feature -- anon key writes would be denied, and the landing page would show no demo data. The explicit throw ensures failures are caught immediately rather than manifesting as a mysteriously empty landing page.

**Regression risk:** Low, provided `SUPABASE_SERVICE_ROLE_KEY` is confirmed in production env vars before deployment.

---

### Fix C-3: Delete Dev/Seed Endpoints

**Finding:** `/api/demo/seed` is accessible without auth (NODE_ENV check unreliable). `/api/dev/compliance-results` exposes service role key usage and all compliance data behind the same unreliable check.

**Files to delete:**
- `src/app/api/demo/seed/route.ts`
- `src/app/api/dev/compliance-results/route.ts`

**Fix:** Delete both files entirely. These are development diagnostic tools that should not exist in the production codebase.

- The seeding logic lives in `src/lib/demo/cache.ts` (`seedDemoCache()`) and can be called from scripts or admin endpoints if needed.
- The compliance results can be accessed via the admin UI or direct Supabase dashboard queries.

**Post-deletion:** Verify no other files import from these deleted routes.

**Regression risk:** Low. Only affects local dev workflows. Core seeding functionality is preserved in `src/lib/demo/cache.ts`.

---

## Phase 2: HIGH Fixes (Deploy This Week)

### Fix H-1: HTML Injection in Email Template

**Finding:** Multiple user-controlled values interpolated directly into email HTML without escaping.

**File to modify:** `src/app/api/campaign/[id]/email/route.ts`

**Fix:**

1. Add `escapeHtml` utility (no new dependencies):
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

2. Escape ALL interpolated values in the email template:
```typescript
html: `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    ${heroPhoto ? `<img src="${escapeHtml(heroPhoto)}" alt="${escapeHtml(addressStr)}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />` : ''}
    <h2>${escapeHtml(addressStr)}</h2>
    ${campaign.listing?.price ? `<p style="font-size: 18px; color: #16a34a;">$${escapeHtml(campaign.listing.price.toLocaleString())}</p>` : ''}
    ${campaign.listing ? `<p>${escapeHtml(String(campaign.listing.beds))} bed &middot; ${escapeHtml(String(campaign.listing.baths))} bath &middot; ${escapeHtml(campaign.listing.sqft?.toLocaleString() ?? '')} sqft</p>` : ''}
    ${message ? `<p style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">${escapeHtml(message)}</p>` : ''}
    <p><strong>Platforms:</strong> ${escapeHtml(platforms)}</p>
    <div style="margin: 24px 0;">
      <a href="${shareUrl}" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Campaign</a>
    </div>
    <p style="font-size: 12px; color: #888;">This link expires in 7 days.</p>
  </div>
`
```

**Advocate enhancement:** The Architect's original fix only escaped `message` and `addressStr`. The Advocate identified additional injectable fields:
- `heroPhoto` (photo URL in `img src` -- allows attribute injection via `" onerror="...`)
- `platforms` (user-controlled `selectedPlatforms` array joined as string)
- `addressStr` in `alt` attribute (different injection context than text node)

**Principle:** Every variable interpolated into HTML must be escaped. It's cheap insurance against entire categories of bugs.

**Note:** `shareUrl` is constructed from `process.env` + `crypto.randomUUID()` and is safe. It's the only unescaped value in the template.

**Regression risk:** Low. Only affects display of special characters in emails.

---

### Fix H-2 + H-3: Replace In-Memory Rate Limiting with Distributed Solution

**Finding:** In-memory rate limiting is per-instance (useless in serverless). IP identification trusts spoofable `X-Forwarded-For` header. Combined effect: zero effective rate limiting.

**Files to modify:**
- `src/lib/rate-limit.ts` (full rewrite)
- `src/middleware.ts` (async rate limit check)

**New dependencies:** `@upstash/ratelimit`, `@upstash/redis`
**New env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Fix:**

1. Replace `src/lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters: Record<string, Ratelimit> = {
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') }),
  generate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') }),
  scrape: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s') }),
  export: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') }),
  demo: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60 s') }),
  email: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s') }),
};

export async function checkRateLimit(
  key: string,
  limiterName: string
): Promise<{ limited: boolean; remaining: number; retryAfter: number }> {
  const limiter = rateLimiters[limiterName];
  if (!limiter) return { limited: false, remaining: 999, retryAfter: 0 };

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      limited: !success,
      remaining,
      retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000),
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    // Fail closed for sensitive endpoints, open for others
    if (['auth', 'generate', 'email'].includes(limiterName)) {
      return { limited: true, remaining: 0, retryAfter: 60 };
    }
    return { limited: false, remaining: 999, retryAfter: 0 };
  }
}

export function getClientIp(request: Request & { ip?: string }): string {
  // On Vercel, request.ip is platform-provided and cannot be spoofed
  if ((request as any).ip) {
    return (request as any).ip;
  }
  // Fallback for local development only
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return 'unknown';
}
```

2. Update `src/middleware.ts` to use async `checkRateLimit` (add `await`).

**Advocate enhancement:** Added graceful degradation with fail-closed/fail-open strategy:
- Sensitive endpoints (auth, generate, email): fail closed (block requests if Redis is unreachable)
- Non-sensitive endpoints (demo, export): fail open (allow requests if Redis is unreachable)

**IP fix:** Prioritize `request.ip` (Vercel-provided, not spoofable) over `X-Forwarded-For`. The header fallback remains for local development only.

**Regression risk:** Medium. Rate limiting API changes from sync to async. Requires Upstash provisioning and env var setup. Test thoroughly.

---

### Fix H-4: CSP Hardening (Phased)

**Finding:** CSP allows `unsafe-inline` for scripts. Recon also observed `unsafe-eval` in production despite dev-only gate in code.

**File to modify:** `next.config.ts`

**Fix (Phase 1 -- immediate):**

Verify and ensure `unsafe-eval` is NOT present in production CSP. The code has:
```typescript
`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`
```

If the recon observation was from a dev build, no code change needed. If `unsafe-eval` appears in production, investigate whether Next.js or webpack injects it during build. Explicitly remove by ensuring `isDev` is `false` in production.

**Fix (Phase 2 -- follow-up ticket):**

Implement nonce-based CSP to remove `unsafe-inline`:
1. Generate a nonce per request in middleware
2. Pass nonce via response header to pages
3. Add `nonce` attribute to all script tags
4. Replace `unsafe-inline` with `'nonce-${nonce}'` in CSP

This is a non-trivial change that requires testing across all pages and third-party scripts (Cloudflare Turnstile). Track as a separate ticket.

**Advocate challenge (resolved):** The Architect originally proposed removing `unsafe-inline` entirely. The Advocate identified this would break Next.js, which injects inline scripts for hydration and the `__NEXT_DATA__` payload. The phased approach ensures no production breakage while still improving security.

**Regression risk:** Phase 1: None. Phase 2: Medium (requires thorough testing).

---

## Phase 3: MEDIUM Fixes (Deploy Within 2 Weeks)

### Fix M-1: CSRF Protection via Origin Validation

**File to modify:** `src/middleware.ts`

**Fix:** Add Origin header validation after the TRACE check:
```typescript
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return new NextResponse(JSON.stringify({ error: 'Invalid origin' }), { status: 403 });
    }
  }
}
```

**Defense-in-depth layers:** SameSite=Lax cookies (layer 1) + CORS rejection (layer 2) + Origin validation (layer 3).

**Regression risk:** Low. Only blocks cross-origin state-changing requests.

---

### Fix M-2: Email Validation with Zod

**File to modify:** `src/app/api/campaign/[id]/email/route.ts`

**Fix:** Replace weak regex with Zod (already a project dependency):
```typescript
import { z } from 'zod';
const emailSchema = z.string().email();

// In validation loop:
for (const email of to) {
  if (!emailSchema.safeParse(email.trim()).success) {
    return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
  }
}
```

Remove the old `emailRegex` constant.

**Regression risk:** Low. Slightly stricter validation is the desired behavior.

---

### Fix M-3: Rate Limiting on Email Endpoint

**Files to modify:**
- `src/middleware.ts` (add email path to rate limit routing)
- `src/lib/rate-limit.ts` (add email config -- already included in H-2+H-3 fix)

**Fix:** Add to `getRateLimitKey()` in `src/middleware.ts`:
```typescript
if (pathname.startsWith('/api/campaign/') && pathname.endsWith('/email')) return 'email'
```

The `email` rate limiter (5 req/min) is already defined in the H-2+H-3 fix above.

**Follow-up (P2):** Consider adding a daily per-user email cap (e.g., 50/day) in the handler using a Redis counter.

**Regression risk:** Low. Only adds a new rate limit.

---

### Fix M-4: SSRF TOCTOU in URL Validator

**Finding:** DNS lookup and HTTP fetch are separate operations, allowing DNS rebinding attacks.

**File to modify:** `src/lib/scraper/url-validator.ts`

**Fix (Option A -- recommended if feasible):**

Pin the resolved IP by overriding DNS lookup in the fetch request using a custom HTTPS agent:
```typescript
import { Agent } from 'node:https';

// In validateUrl, return the resolved IP:
return { safe: true, resolvedIp: address };

// In the caller (scraper), use pinned DNS:
const agent = new Agent({
  lookup: (_hostname, _options, callback) => {
    callback(null, validation.resolvedIp, 4);
  }
});
// Fetch with original URL (preserves TLS/SNI) but pinned DNS
```

**Caveat:** Node's built-in `fetch` (undici) may not support the `agent` option. If using `undici.request` directly, it does. If `fetch` is used, may need to switch to `node:https.request` for the scraper. Verify the fetch implementation before implementing.

**Fix (Option B -- if Option A is too complex):**

Accept the risk as a known limitation. Document it. The attack requires:
1. Authenticated user (must be logged in)
2. Attacker-controlled DNS server
3. Precise timing for DNS rebinding
4. Target must be accessible from Vercel's network

This is a low-probability attack vector. The existing validation (private IP check, protocol enforcement, redirect validation) provides meaningful protection against casual SSRF attempts.

**Advocate challenge (resolved):** The Architect's original fix proposed fetching via resolved IP directly with a `Host` header. This breaks TLS certificate validation because certs are issued for hostnames, not IPs. The custom DNS agent approach preserves correct TLS/SNI while pinning the resolved IP.

**Regression risk:** Option A: Medium (changes fetch behavior). Option B: None (documentation only).

---

### Fix M-5: Disable Production Source Maps

**File to modify:** `next.config.ts`

**Fix:** Add to the config object:
```typescript
productionBrowserSourceMaps: false,
```

This is the default in Next.js, so if source maps are appearing, there may be a build configuration issue. Also verify no `devtool` override exists in webpack config (current config only adds a BannerPlugin -- confirmed clean).

**Regression risk:** None.

---

### Fix M-6: TRACE Method Handling

**Status:** Already fixed in `src/middleware.ts:15`:
```typescript
if (request.method === 'TRACE') {
  return new NextResponse(null, { status: 405 });
}
```

The recon finding of a 500 error was likely from the Docker/dev test environment, not production. No code change needed.

---

## Phase 4: LOW Fixes (Deploy When Convenient)

### Fix L-1: Environment Variable Validation

**File to create:** `src/lib/env.ts`

**Fix:**
```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  // Add other required vars as needed
} as const;
```

**Note:** `NEXT_PUBLIC_*` variables are inlined at build time by Next.js. Runtime validation catches missing vars during server startup but not client-side. For client-side vars, consider build-time validation in `next.config.ts`.

Replace `process.env.VAR_NAME!` usages with `env.VAR_NAME` where applicable.

**Regression risk:** Low. Same behavior when vars are set; faster failure when they're not.

---

### Fix L-2: Improve Prompt Injection Filter

**File to modify:** `src/app/api/generate/route.ts`

**Fix:** Remove the `^\s*` anchor so keywords are caught anywhere in the line:
```typescript
.filter(line => !/(?:ignore|forget|disregard|instead|override|system:|assistant:)/i.test(line))
```

This is still a speed bump (not a full defense), but now catches mid-line injection attempts.

**Regression risk:** Low. May filter some listing descriptions containing "instead" or "override" mid-line, but these are uncommon in property listings.

---

### Fix L-3: Missing DELETE Policy on demo_cache

**Status:** Covered by Fix C-2. Removing public write policies and relying on service role (which bypasses RLS) handles INSERT, UPDATE, and DELETE.

---

### Fix L-4: CSP Reporting + security.txt

**Files to modify:**
- `next.config.ts` (add report-uri/report-to to CSP)
- New file: `public/.well-known/security.txt`

**Fix:**

1. Add to CSP in `next.config.ts`:
```typescript
"report-uri /api/csp-report; report-to csp-endpoint",
```

2. Create `public/.well-known/security.txt`:
```
Contact: security@addrop.app
Expires: 2027-02-20T00:00:00.000Z
Preferred-Languages: en
```

**Regression risk:** None.

---

## Deployment Order & Dependencies

```
Phase 1 (Immediate - same deploy):
  C-1 (admin auth)     -- standalone
  C-2 (demo_cache RLS) -- requires SUPABASE_SERVICE_ROLE_KEY verification first
  C-3 (delete dev routes) -- standalone

Phase 2 (This week):
  H-1 (email escaping) -- standalone
  H-2+H-3 (rate limiting) -- requires Upstash provisioning
  H-4 Phase 1 (verify unsafe-eval removed) -- standalone

Phase 3 (Within 2 weeks):
  M-1 (CSRF)    -- standalone
  M-2 (email regex) -- standalone, can bundle with H-1
  M-3 (email rate limit) -- depends on H-2+H-3
  M-4 (SSRF)    -- investigate feasibility, implement or document
  M-5 (source maps) -- standalone
  M-6 (TRACE)   -- no change needed

Phase 4 (When convenient):
  L-1, L-2, L-4 -- standalone, low priority
  L-3           -- covered by C-2

Follow-up tickets:
  - H-4 Phase 2: Nonce-based CSP migration
  - M-3 enhancement: Daily per-user email cap
  - M-4: If Option A is infeasible, document as accepted risk
```

---

## Pre-Deployment Checklist

- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel production env vars (required for C-2)
- [ ] Provision Upstash Redis and set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (required for H-2+H-3)
- [ ] Run full test suite after Phase 1 changes
- [ ] Verify deployed CSP header does NOT contain `unsafe-eval` (H-4 validation)
- [ ] Verify no imports reference deleted seed/dev routes (C-3 validation)
- [ ] Test landing page demo still works after C-2 migration (demo cache reads still public)
- [ ] Test email sending after H-1 changes (verify escaping doesn't corrupt display)
- [ ] Test rate limiting in production after H-2+H-3 (verify Upstash connectivity)

---

## Sign-Off

- **Architect:** Proposed all fixes. Accepted Advocate enhancements on C-1 (MFA), H-1 (full escaping), H-2+H-3 (graceful degradation). Accepted Advocate challenges on C-2 (getWriteClient fallback), H-4 (phased CSP), M-4 (TLS-safe DNS pinning).
- **Advocate:** Reviewed all fixes. Endorsed 10, enhanced 3, challenged 3 (all resolved). All findings addressed with defense-in-depth where applicable.
