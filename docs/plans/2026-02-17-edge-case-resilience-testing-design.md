# Edge Case & Resilience Testing Design

**Date:** 2026-02-17
**Status:** Approved

## Overview

Automated edge case and resilience testing for the RealEstate Ad Gen app using Playwright. Tests simulate real-user chaos: page refreshes during generation, double-submits, invalid inputs, auth boundary violations, and broken navigation flows.

## Architecture

- **Framework:** Playwright (already installed, not yet configured)
- **Target:** `http://localhost:3000` (Next.js dev server)
- **Auth:** Test account credentials — `globalSetup` logs in once, saves browser state for reuse
- **AI Mocking:** `page.route()` intercepts `/api/campaign/[id]/generate` — returns fake data, simulates delays/timeouts/failures
- **Runner:** `npx playwright test` via `npm run test:e2e` script

## Test Suites

### Suite 1: Campaign Generation Resilience (`e2e/campaign-generation.spec.ts`)

| Test | Expected |
|------|----------|
| Page refresh during generation | Poll resumes, shows generating view |
| Browser back + forward during generation | Does not break state |
| Double-click "Generate" | No duplicate campaigns created |
| AI timeout | Shows failed view with error message |
| AI error (500) | Shows failed view gracefully |

### Suite 2: Form & Input Edge Cases (`e2e/form-edge-cases.spec.ts`)

| Test | Expected |
|------|----------|
| Submit with required fields empty | Validation errors shown |
| Paste invalid data in MLS input | Rejected gracefully |
| Upload oversized image | Error shown |
| Upload wrong format (.txt) | Rejected |
| Upload then rapidly delete photo | No ghost state |
| Submit form while offline | Error shown, no crash |

### Suite 3: Sharing & Export Edge Cases (`e2e/sharing-export.spec.ts`)

| Test | Expected |
|------|----------|
| Share campaign still generating | Blocked or appropriate state |
| Download ZIP while generating | Blocked |
| Email with invalid address | Validation error |
| Access revoked share link | 404/expired page |
| Copy All with nothing generated | Handled gracefully |

### Suite 4: Auth Boundaries (`e2e/auth-boundaries.spec.ts`)

| Test | Expected |
|------|----------|
| `/create` while logged out | Redirect to `/signup` |
| `/campaign/[id]` while logged out | Redirect to login |
| Another user's campaign by ID | 403 or redirect |
| `/dashboard` while logged out | Redirect |
| `/share/[token]` while logged out | Works (public page) |

### Suite 5: Navigation Resilience (`e2e/navigation.spec.ts`)

| Test | Expected |
|------|----------|
| Deep-link to non-existent campaign | 404 page |
| Browser back from campaign to create | Clean navigation |
| Rapid page navigation | No broken state |

## File Structure

```
e2e/
  campaign-generation.spec.ts
  form-edge-cases.spec.ts
  sharing-export.spec.ts
  auth-boundaries.spec.ts
  navigation.spec.ts
  global-setup.ts
  fixtures.ts
playwright.config.ts
```

## Out of Scope

- Visual regression testing (screenshots/snapshots)
- Load/performance testing
- Real OpenAI API calls
- Mobile device testing
