# Security Audit Findings - Analyst (Source Code Review)

**Date:** 2026-02-20
**Scope:** Full source code audit of RealEstate Ad Gen (AdDrop)
**Methodology:** White-box static analysis

---

## CRITICAL Findings

### CRITICAL-1: Admin API Routes Missing Admin Role Check (Broken Access Control)
**Category:** OWASP A01:2021 - Broken Access Control
**Source:** Analyst (code review)
**Files:**
- `src/app/api/admin/compliance-qa/run/route.ts:37`
- `src/app/api/admin/compliance-qa/corpus/route.ts:6`
- `src/app/api/admin/compliance-qa/corpus/[id]/route.ts:9`
- `src/app/api/admin/compliance-qa/runs/route.ts:6`
- `src/app/api/admin/compliance-qa/scan/route.ts:8`
- `src/app/api/admin/compliance-qa/snapshots/[propertyId]/route.ts:13`
**Evidence:**
All admin API routes use `requireAuth()` (any authenticated user) instead of `requireAdminAction()` (admin role check):
```typescript
// What they use:
const { user, supabase, error } = await requireAuth();
// What they SHOULD use:
await requireAdminAction();
```
The middleware in `src/lib/supabase/middleware.ts:68` only protects page routes starting with `/admin`, but API routes at `/api/admin/*` do NOT match `pathname.startsWith('/admin')` -- they start with `/api/admin`. The middleware admin role check is therefore bypassed for all admin API endpoints.
**Impact:** Any authenticated user (not just admins) can:
- Trigger expensive full-pipeline compliance QA runs (consuming OpenAI API credits)
- Create, modify, and delete compliance test properties
- View all compliance test results and snapshots
- Run compliance scans
This is both a privilege escalation and a potential financial DoS (each full-pipeline run makes multiple OpenAI API calls).
**Affected:** All admin compliance QA API routes (6 route files, 11 handler functions)

### CRITICAL-2: demo_cache Table Has Unrestricted Public Write Access (Data Poisoning)
**Category:** OWASP A01:2021 - Broken Access Control
**Source:** Analyst (code review)
**File:** `supabase/migrations/20260220_create_demo_cache.sql:15-26`
**Evidence:**
```sql
create policy "Anyone can write demo cache"
  on public.demo_cache for insert
  with check (true);

create policy "Anyone can update demo cache"
  on public.demo_cache for update
  using (true)
  with check (true);
```
The RLS policies allow ANY client with the anon key (which is public by design in Supabase) to INSERT and UPDATE rows in `demo_cache`. There is no DELETE policy, but INSERT + UPDATE is sufficient for full cache poisoning.
**Impact:** An attacker can:
1. **Content poisoning:** Insert/update `campaign_result` JSONB with malicious content. React auto-escapes JSX text content, which mitigates direct script execution, but content defacement remains possible.
2. **Content defacement:** Replace demo campaign results with offensive, misleading, or competitor content that all landing page visitors would see.
3. **View count manipulation:** Set `view_count` to a high number to prevent automatic cache refresh, making poisoned data persist indefinitely.
4. **Storage abuse:** Insert arbitrarily large JSONB payloads (no size constraint on the columns) for potential storage DoS.
5. **Demo breakage:** Insert malformed JSONB that causes rendering errors on the landing page.
**Affected:** Landing page demo feature, all unauthenticated visitors

---

## HIGH Findings

### HIGH-1: HTML Injection in Campaign Email Sharing (Stored XSS in Email)
**Category:** OWASP A03:2021 - Injection
**Source:** Analyst (code review)
**File:** `src/app/api/campaign/[id]/email/route.ts:85`
**Evidence:**
```typescript
${message ? `<p style="...">${message}</p>` : ''}
```
The `message` field from the POST body is interpolated directly into HTML email content without sanitization or encoding. An authenticated user can send emails with arbitrary HTML/JavaScript to any email address (up to 10 recipients per request).
**Impact:**
- Phishing attacks: Inject convincing fake login forms, links to malicious sites
- Email client exploitation: Some email clients render JavaScript
- Brand reputation damage: Malicious content sent from the application's verified email domain (`share@addrop.app`)
**Affected:** Email sharing feature, all email recipients

### HIGH-2: In-Memory Rate Limiting Ineffective in Serverless Environment
**Category:** OWASP A04:2021 - Insecure Design
**Source:** Analyst (code review)
**File:** `src/lib/rate-limit.ts:19`
**Evidence:**
```typescript
const store = new Map<string, RateLimitEntry>()
```
Rate limiting uses an in-memory `Map` that is local to each serverless function instance. In Vercel's serverless environment:
- Each instance has its own rate limit store
- Instances are ephemeral and can be cold-started at any time
- An attacker making parallel requests will be distributed across multiple instances, each with its own counter
**Impact:** Rate limits are trivially bypassable. An attacker can:
- Bypass demo API rate limits (30/min) by making concurrent requests
- Bypass auth page rate limits (10/min) for credential stuffing
- Bypass generate API rate limits (20/min) to abuse OpenAI credits
- Bypass scrape rate limits (20/min) for mass scraping
**Affected:** All rate-limited endpoints (auth, generate, scrape, export, demo)

### HIGH-3: NODE_ENV Check is Unreliable for Access Control
**Category:** OWASP A04:2021 - Insecure Design
**Source:** Analyst (code review)
**Files:**
- `src/app/api/demo/seed/route.ts:14,63`
- `src/app/api/dev/compliance-results/route.ts:5`
**Evidence:**
```typescript
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```
These routes rely on `NODE_ENV` to restrict access to development only. While Vercel sets `NODE_ENV=production` by default, this is:
- Not a security boundary -- it is a build optimization flag
- Can be accidentally set to 'development' in deployment configs
- The dev compliance-results route (`/api/dev/compliance-results`) exposes the `SUPABASE_SERVICE_ROLE_KEY` usage and all compliance test run data
**Impact:** If NODE_ENV is misconfigured in production:
- `/api/demo/seed` GET exposes sample property data and tests anon write access, POST triggers expensive seeding (multiple OpenAI API calls)
- `/api/dev/compliance-results` exposes all compliance test runs using service role key (bypasses all RLS)
**Affected:** Dev/seed endpoints

### HIGH-4: X-Forwarded-For Header Spoofable for Rate Limit Bypass
**Category:** OWASP A07:2021 - Identification and Authentication Failures
**Source:** Analyst (code review)
**File:** `src/lib/rate-limit.ts:76-80`
**Evidence:**
```typescript
export function getClientIp(request: Request & { ip?: string }): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return (request as { ip?: string }).ip || 'unknown'
}
```
The function trusts the `x-forwarded-for` header directly. An attacker can set arbitrary `X-Forwarded-For` values to get a different rate limit bucket for each request.
**Impact:** Complete rate limit bypass by rotating fake IP addresses in the header. Combined with HIGH-2 (in-memory rate limiting), rate limiting is completely ineffective.
**Affected:** All rate-limited endpoints

---

## MEDIUM Findings

### MEDIUM-1: Missing CSRF Protection on State-Changing API Routes
**Category:** OWASP A01:2021 - Broken Access Control
**Source:** Analyst (code review)
**Files:** All POST/PUT/DELETE API routes
**Evidence:** No CSRF token validation is present on any API route. While SameSite cookies and CORS provide some protection in modern browsers, there is no explicit CSRF mitigation. Next.js API routes do not include CSRF protection by default.
**Impact:** An attacker could craft a malicious page that triggers state-changing actions (generating campaigns, sending emails, creating share links) when visited by an authenticated user.
**Affected:** All authenticated API routes

### MEDIUM-2: Email Recipient Validation Uses Weak Regex
**Category:** OWASP A03:2021 - Injection
**Source:** Analyst (code review)
**File:** `src/app/api/campaign/[id]/email/route.ts:8`
**Evidence:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```
This regex is overly permissive and allows malformed email addresses. Combined with HIGH-1, attackers can target a wide range of addresses.
**Impact:** Low direct impact, but the email feature could be abused for spam since the validation is weak and there is no rate limiting on the email endpoint specifically (only general auth rate limiting on auth pages).
**Affected:** Email sharing feature

### MEDIUM-3: CSP Allows 'unsafe-inline' for Scripts
**Category:** OWASP A05:2021 - Security Misconfiguration
**Source:** Analyst (code review)
**File:** `next.config.ts:26`
**Evidence:**
```typescript
script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com
```
The Content Security Policy allows `unsafe-inline` for scripts in production. This weakens XSS protection since inline scripts (injected via any XSS vector) will be allowed to execute.
**Impact:** If an XSS vulnerability is found, the CSP will not be a defense-in-depth layer. Use nonces or hashes instead of `unsafe-inline`.
**Affected:** All pages

### MEDIUM-4: No Rate Limiting on Email Send Endpoint
**Category:** OWASP A04:2021 - Insecure Design
**Source:** Analyst (code review)
**File:** `src/app/api/campaign/[id]/email/route.ts`
**Evidence:** The email endpoint at `/api/campaign/[id]/email` has no rate limiting. The middleware rate limiting only covers specific paths (`/api/generate`, `/api/scrape`, `/api/export`, auth pages) but not `/api/campaign/*/email`.
**Impact:** An authenticated user can send unlimited emails (10 recipients per request) through the application's email service, potentially:
- Burning through Resend API credits
- Getting the sending domain blacklisted for spam
- Using the feature for email harassment
**Affected:** Email sharing feature, Resend API credits, domain reputation

### MEDIUM-5: SSRF Time-of-Check-Time-of-Use (TOCTOU) in URL Validator
**Category:** OWASP A10:2021 - Server-Side Request Forgery
**Source:** Analyst (code review)
**File:** `src/lib/scraper/url-validator.ts:77`
**Evidence:**
```typescript
const { address } = await lookup(hostname)
if (isPrivateIp(address)) {
  return { safe: false, error: 'URL resolves to a private/reserved IP address' }
}
// ... later, a separate fetch happens using the original hostname
```
The DNS lookup and the actual HTTP request are separate operations. An attacker with control over a DNS server could return a public IP during validation and then switch to a private IP (e.g., 169.254.169.254) for the actual request (DNS rebinding attack).
**Impact:** Potential SSRF to internal services or cloud metadata endpoints, though this requires attacker-controlled DNS and is somewhat mitigated by the fact that scraping requires authentication.
**Affected:** Scrape and MLS lookup features

---

## LOW Findings

### LOW-1: Non-Null Assertions on Environment Variables
**Category:** OWASP A05:2021 - Security Misconfiguration
**Source:** Analyst (code review)
**Files:** Multiple (17+ occurrences)
**Evidence:**
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```
Non-null assertions (`!`) on environment variables throughout the codebase. If these variables are not set, the application will throw runtime errors with potentially confusing error messages instead of failing gracefully at startup.
**Impact:** Operational issues, confusing error messages in production. No direct security impact unless error messages are exposed to users.
**Affected:** Multiple files across the codebase

### LOW-2: Prompt Injection Filtering is Easily Bypassed
**Category:** OWASP A03:2021 - Injection
**Source:** Analyst (code review)
**File:** `src/app/api/generate/route.ts:77-81`
**Evidence:**
```typescript
listing.description = listing.description
  .split('\n')
  .filter(line => !/^\s*(ignore|forget|disregard|instead|override|system:|assistant:)/i.test(line))
  .join('\n')
  .slice(0, 5000);
```
The prompt injection filter only checks for lines STARTING with certain keywords. Trivially bypassed by:
- Putting injection text mid-line
- Using Unicode homoglyphs
- Using zero-width characters
- Encoding tricks
The code comment correctly states "speed bump, not a full defense."
**Impact:** Low -- AI prompt injection in a marketing text generator has limited security impact (no data access, no system commands). Worst case is generating off-brand or inappropriate ad copy.
**Affected:** Campaign generation

### LOW-3: Missing DELETE Policy on demo_cache Prevents Cleanup
**Category:** OWASP A04:2021 - Insecure Design
**Source:** Analyst (code review)
**File:** `supabase/migrations/20260220_create_demo_cache.sql`
**Evidence:** No DELETE policy exists on the `demo_cache` table. While this prevents anonymous deletion, it also means only service role can clean up poisoned data (or legitimate data). The application code never deletes from this table either.
**Impact:** Operational -- poisoned or stale data cannot be easily cleaned up without service role access.
**Affected:** Demo cache maintenance

---

## INFO Findings

### INFO-1: Dependency Vulnerabilities (Development/Build Tools)
**Category:** OWASP A06:2021 - Vulnerable and Outdated Components
**Source:** Analyst (npm audit)
**Evidence:** `npm audit` reports 36 vulnerabilities (1 moderate, 35 high). All are in development/build dependencies:
- `ajv <6.14.0` - ReDoS (moderate) -- eslint dependency
- `minimatch <10.2.1` - ReDoS (high) -- eslint, jest, glob dependencies
All vulnerabilities are in devDependencies (eslint, jest, typescript-eslint) and are NOT shipped to production in the `standalone` build output.
**Impact:** No production impact. Development environment could be affected by ReDoS in eslint/jest when processing maliciously crafted file paths, which is not a realistic attack vector.
**Affected:** Development environment only

### INFO-2: Secrets Properly Excluded from Version Control
**Category:** Secret Management
**Source:** Analyst (code review)
**Evidence:** `.gitignore` includes `.env*` pattern. No `.env` files found in git history. Secrets (`OPENAI_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are only referenced via `process.env` and exist only in `.env.local` (not committed). `SUPABASE_SERVICE_ROLE_KEY` is not present in `.env.local` -- it would need to be set separately in production environment variables.
**Impact:** None -- proper secret management observed.
**Affected:** N/A

### INFO-3: Unsafe HTML Rendering Usage is Safe (Static Content Only)
**Category:** OWASP A03:2021 - Injection
**Source:** Analyst (code review)
**Files:**
- `src/app/layout.tsx:98` -- Static JSON-LD structured data (hardcoded, no user input)
- `src/app/page.tsx:58` -- Static FAQ JSON-LD (hardcoded, no user input)
**Evidence:** Both uses of raw HTML injection in script tags render static, developer-defined content via `JSON.stringify()`. No user-controlled data flows into these.
**Impact:** None.

### INFO-4: Good Security Practices Observed
**Source:** Analyst (code review)
**Positive findings:**
- **Security headers:** Comprehensive headers in `next.config.ts` (HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy, Referrer-Policy)
- **SSRF protection:** URL validation with private IP blocking, redirect following with validation, protocol downgrade prevention
- **Input validation:** Zod schema validation on `/api/generate` with field-level constraints
- **Auth architecture:** Supabase auth with `getUser()` (server-side verification, not just `getSession()`)
- **Profile role escalation prevention:** Column-level grants on `profiles` table prevent users from changing their own `role` field
- **MFA enforcement for admin pages:** Admin page routes require AAL2
- **UUID validation:** Campaign ID parameters validated with regex before database queries
- **TRACE method blocked:** Middleware blocks TRACE requests
- **Ownership verification:** Campaign operations verify `user_id` matches authenticated user
- **Photo URL allowlisting:** Export photo route validates against allowed domains
- **poweredByHeader disabled:** `next.config.ts` disables the X-Powered-By header

---

## Summary

| Severity | Count | Key Concern |
|----------|-------|-------------|
| CRITICAL | 2 | Admin API missing role check; demo_cache public write |
| HIGH | 4 | Email HTML injection; in-memory rate limiting; NODE_ENV as auth; IP spoofing |
| MEDIUM | 5 | No CSRF; weak email regex; unsafe-inline CSP; no email rate limit; SSRF TOCTOU |
| LOW | 3 | Env var assertions; prompt injection bypass; no DELETE policy |
| INFO | 4 | Dev-only dep vulns; good secret management; safe HTML rendering; positive practices |

## Priority Remediation

1. **CRITICAL-1:** Change all admin API routes from `requireAuth()` to `requireAdminAction()`. This is a one-line fix per route handler.
2. **CRITICAL-2:** Restrict `demo_cache` RLS to service role only for writes. Remove public INSERT/UPDATE policies. The application code already has a `getWriteClient()` that uses service role when available.
3. **HIGH-1:** HTML-encode the `message` field before interpolating into email HTML. Use a library like `he` or built-in escaping.
4. **HIGH-2:** Replace in-memory rate limiting with a distributed solution (Redis, Vercel KV, or Upstash).
5. **HIGH-3:** Remove or add proper auth to dev/seed endpoints. Never rely on NODE_ENV for access control.
6. **HIGH-4:** Use Vercel's provided IP (`request.ip`) as the primary source, fall back to X-Forwarded-For only when behind a trusted proxy.
