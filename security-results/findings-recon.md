# Recon Agent - Live Penetration Test Findings

**Date:** 2026-02-21
**Target:** http://host.docker.internal:3000
**Method:** Black-box penetration testing from Docker container

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 2 |
| INFO | 4 |

---

## Findings

### CRITICAL-1: /api/demo/seed Endpoint Accessible Without Authentication

**Category:** A01:2021 - Broken Access Control (OWASP)
**Source:** Recon (live test)
**Evidence:**
```
GET /api/demo/seed HTTP/1.1 -> 200 OK
Response: {"sampleProperties":[...],"rows":{"data":[...],"error":null},"testInsert":"success"}

POST /api/demo/seed HTTP/1.1 -> 200 OK
Response: {"success":true,"seeded":"all"}
```
The endpoint is publicly accessible with no authentication. GET returns all cached demo data including property IDs and view counts. POST triggers a full re-seed of the demo_cache table, including writing a `__test__` row. This was supposed to be dev-only (404 in production) but is fully functional.
**Impact:** Any attacker can:
1. Enumerate all demo property data
2. Trigger database writes (POST seeds data) at will
3. Reset/overwrite demo cache data repeatedly
4. Use the `testInsert` operation as a confirmed write primitive to `demo_cache`
**Affected:** `/api/demo/seed` (GET and POST)

---

### HIGH-1: No Rate Limiting on /api/demo/seed Endpoint

**Category:** A04:2021 - Insecure Design
**Source:** Recon (live test)
**Evidence:**
```
10 rapid sequential requests to /api/demo/seed:
200 200 200 200 200 200 200 200 200 200
```
While `/api/demo` correctly enforces rate limiting (429 after ~30 requests), the `/api/demo/seed` endpoint has NO rate limiting whatsoever. Each request triggers database writes.
**Impact:** An attacker can flood the database with unlimited write operations via the seed endpoint, potentially causing:
- Database resource exhaustion
- Excessive Supabase usage/billing
- Denial of service for the demo feature
**Affected:** `/api/demo/seed`

---

### HIGH-2: CSP Allows Dangerous Script Directives

**Category:** A05:2021 - Security Misconfiguration
**Source:** Recon (live test)
**Evidence:**
```
Content-Security-Policy: ... script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```
The Content Security Policy allows both dangerous inline and eval directives in the script-src, significantly weakening XSS protections. These directives allow injected script tags and dynamic code execution, effectively negating CSP's XSS protection.
**Impact:** If an XSS vulnerability is found anywhere in the application, the CSP will not prevent exploitation.
**Affected:** All pages (CSP is applied globally via middleware)

---

### MEDIUM-1: Inline Source Maps Exposed in Production JavaScript Bundles

**Category:** A05:2021 - Security Misconfiguration
**Source:** Recon (live test)
**Evidence:**
```
463 instances of sourceMappingURL=data:application/json;charset=utf-8;base64,... found in page.js
```
Base64-encoded inline source maps are embedded directly in the JavaScript bundles. These contain original source file paths, source code, and module structure.
**Impact:** An attacker can decode these source maps to:
- View original application source code
- Discover internal file paths (e.g., local development paths)
- Map the application architecture
- Find potential vulnerabilities in business logic
**Affected:** `/_next/static/chunks/app/page.js` (and potentially other bundles)

---

### MEDIUM-2: TRACE HTTP Method Returns 500 Error

**Category:** A05:2021 - Security Misconfiguration
**Source:** Recon (live test)
**Evidence:**
```
TRACE /api/demo HTTP/1.1 -> 500 Internal Server Error
Response: Next.js generic error page HTML
```
The TRACE method is not properly rejected and causes a 500 error instead of a 405 Method Not Allowed.
**Impact:** While the error does not appear to leak sensitive data (returns generic Next.js error page), the TRACE method should be explicitly disabled. In some configurations, TRACE can be used for Cross-Site Tracing (XST) attacks to steal credentials from HTTP headers.
**Affected:** `/api/demo` (likely all routes)

---

### LOW-1: CSP Missing report-uri / report-to Directive

**Category:** A09:2021 - Security Logging and Monitoring Failures
**Source:** Recon (live test)
**Evidence:**
```
CSP header has no report-uri or report-to directive
```
**Impact:** CSP violations are not reported anywhere, making it impossible to detect attempted XSS attacks or CSP bypass attempts in production.
**Affected:** Global CSP header

---

### LOW-2: Missing security.txt

**Category:** A05:2021 - Security Misconfiguration
**Source:** Recon (live test)
**Evidence:**
```
GET /.well-known/security.txt -> 404 Not Found
```
**Impact:** No standardized way for security researchers to report vulnerabilities. RFC 9116 recommends providing a security.txt file with contact information.
**Affected:** `/.well-known/security.txt`

---

### INFO-1: Rate Limiting Correctly Enforced on /api/demo

**Category:** Positive Finding
**Source:** Recon (live test)
**Evidence:**
```
35 rapid requests to /api/demo:
200(x29) 429(x6)
```
Rate limiting kicks in at approximately 30 requests per minute as configured, returning 429 Too Many Requests.
**Affected:** `/api/demo`

---

### INFO-2: Security Headers Well Configured

**Category:** Positive Finding
**Source:** Recon (live test)
**Evidence:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-DNS-Prefetch-Control: off
```
All major security headers are present and properly configured. No `Server` or `X-Powered-By` headers leak server information.
**Affected:** All responses

---

### INFO-3: CORS Properly Restrictive

**Category:** Positive Finding
**Source:** Recon (live test)
**Evidence:**
```
Request: curl -H "Origin: http://evil.com" -I /api/demo
Response: No Access-Control-Allow-Origin header returned
```
The application does not reflect arbitrary origins. No CORS headers are returned for unknown origins, preventing cross-origin data theft.
**Affected:** All API endpoints

---

### INFO-4: Protected Routes Properly Redirect to Login

**Category:** Positive Finding
**Source:** Recon (live test)
**Evidence:**
```
/admin -> 307 -> /login
/dashboard -> 307 -> /login
/settings -> 307 -> /login
/create -> 307 -> /login
/campaign -> 307 -> /login
/mfa-challenge -> 307 -> /login

/api/generate POST -> {"error":"Authentication required"}
/api/demo/refresh POST -> {"error":"Authentication required"}
```
All authenticated routes properly redirect to login. API endpoints requiring auth return 401 even with fake Bearer tokens.
**Affected:** All protected routes

---

## Port Scan Results

```
PORT     STATE SERVICE
135/tcp  open  msrpc (Windows RPC)
445/tcp  open  microsoft-ds (SMB)
3000/tcp open  Next.js application
```
Only expected services are exposed. SMB ports (135, 445) are from the Windows host, not the application.

---

## Endpoint Map

| Path | Method | Status | Auth Required | Notes |
|------|--------|--------|---------------|-------|
| / | GET | 200 | No | Landing page |
| /login | GET | 200 | No | Login page |
| /signup | GET | 200 | No | Signup page |
| /forgot-password | GET | 200 | No | Password reset |
| /reset-password | GET | 200 | No | Password reset |
| /terms | GET | 200 | No | Terms of service |
| /privacy | GET | 200 | No | Privacy policy |
| /robots.txt | GET | 200 | No | Standard |
| /sitemap.xml | GET | 200 | No | Standard |
| /admin | GET | 307 | Yes | Redirects to /login |
| /dashboard | GET | 307 | Yes | Redirects to /login |
| /settings | GET | 307 | Yes | Redirects to /login |
| /create | GET | 307 | Yes | Redirects to /login |
| /campaign | GET | 307 | Yes | Redirects to /login |
| /mfa-challenge | GET | 307 | Yes | Redirects to /login |
| /api/demo | GET | 200 | No | Rate limited (30/min) |
| /api/demo/seed | GET | 200 | **NO** | **CRITICAL - should require auth** |
| /api/demo/seed | POST | 200 | **NO** | **CRITICAL - seeds DB with no auth** |
| /api/demo/refresh | POST | 401 | Yes | Properly protected |
| /api/generate | POST | 401 | Yes | Properly protected |

---

## Supabase Exposure

- **Project ref:** `qunrofzwejafqzssmkpa` (exposed in CSP header img-src directive)
- **Anon key:** NOT found in client-side JavaScript bundles (good)
- **Direct API access:** Could not be tested without the anon key

---

## Recommendations (Priority Order)

1. **CRITICAL:** Disable or authenticate `/api/demo/seed` - add auth check or return 404 in production
2. **HIGH:** Add rate limiting to `/api/demo/seed` while it exists
3. **HIGH:** Replace dangerous CSP script directives with nonce-based script loading
4. **MEDIUM:** Disable inline source maps in production builds (`productionBrowserSourceMaps: false` in next.config)
5. **MEDIUM:** Return 405 for TRACE method instead of 500
6. **LOW:** Add `report-uri` or `report-to` directive to CSP
7. **LOW:** Add `/.well-known/security.txt`
