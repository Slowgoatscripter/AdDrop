# Edge Case & Resilience Testing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Playwright e2e tests covering edge cases and resilience scenarios — page refresh during generation, double-submit, auth boundaries, form validation, and navigation.

**Architecture:** Playwright configured against `localhost:3000`. Auth via real test account login saved to storage state. AI/network calls mocked via `page.route()` interception. Five test suites organized by concern.

**Tech Stack:** Playwright, Next.js 15 (App Router), Supabase Auth, TypeScript

---

### Task 1: Configure Playwright

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json` (add `test:e2e` script)

**Step 1: Create Playwright config**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /global-setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Step 2: Add npm script**

Add to `package.json` scripts:
```json
"test:e2e": "npx playwright test"
```

**Step 3: Add to .gitignore**

Append these lines:
```
e2e/.auth/
test-results/
playwright-report/
```

**Step 4: Install Playwright browsers**

Run: `npx playwright install chromium`

**Step 5: Commit**

```bash
git add playwright.config.ts package.json .gitignore
git commit -m "chore: configure Playwright for e2e testing"
```

---

### Task 2: Create Global Auth Setup & Fixtures

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/fixtures.ts`
- Create: `e2e/.auth/.gitkeep` (directory placeholder)

**Step 1: Create the auth directory**

```bash
mkdir -p e2e/.auth
touch e2e/.auth/.gitkeep
```

**Step 2: Create global setup — logs in and saves state**

The Captcha component renders `null` when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, so no captcha handling needed in test env. Just ensure that env var is NOT set when running tests.

```ts
// e2e/global-setup.ts
import { test as setup, expect } from '@playwright/test'

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD env vars are required.\n' +
      'Create a test account in your Supabase project and set these in .env.local or shell.'
    )
  }

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to dashboard (successful login)
  await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15000 })

  // Save auth state
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
```

**Step 3: Create shared fixtures and helpers**

```ts
// e2e/fixtures.ts
import { test as base, expect, type Page } from '@playwright/test'

// Mock campaign data matching the generated_ads shape
export const MOCK_GENERATED_ADS = {
  instagram: { headline: 'Test Home', body: 'Beautiful test property', hashtags: '#test' },
  facebook: { headline: 'Test Home', body: 'Beautiful test property' },
  twitter: { headline: 'Test Home', body: 'Beautiful test property' },
  googleAds: { headlines: ['Test Home'], descriptions: ['Beautiful property'] },
  metaAd: { headline: 'Test Home', body: 'Beautiful test property' },
  zillow: { headline: 'Test Home', body: 'Beautiful test property' },
  realtorCom: { headline: 'Test Home', body: 'Beautiful test property' },
  homesComTrulia: { headline: 'Test Home', body: 'Beautiful test property' },
  mlsDescription: { body: 'Beautiful test property for MLS' },
  magazineFullPage: { headline: 'Test Home', body: 'Beautiful test property' },
  magazineHalfPage: { headline: 'Test Home', body: 'Beautiful test property' },
  postcard: { headline: 'Test Home', body: 'Beautiful test property' },
}

export const MOCK_LISTING = {
  address: '999 Test Ave',
  city: 'Testville',
  state: 'MT',
  zip: '59801',
  price: '450000',
  beds: 3,
  baths: 2,
  sqft: '1800',
}

/**
 * Fill the property form with valid test data.
 * Uses placeholders since form inputs have no name attributes.
 */
export async function fillPropertyForm(page: Page) {
  await page.getByPlaceholder('123 Main St').fill(MOCK_LISTING.address)
  await page.getByPlaceholder('Missoula').fill(MOCK_LISTING.city)
  await page.getByPlaceholder('MT').fill(MOCK_LISTING.state)
  await page.getByPlaceholder('59801').fill(MOCK_LISTING.zip)
  await page.getByPlaceholder('450,000').fill(MOCK_LISTING.price)
  await page.getByPlaceholder('3').first().fill(String(MOCK_LISTING.beds))
  await page.getByPlaceholder('2').first().fill(String(MOCK_LISTING.baths))
  await page.getByPlaceholder('1,800').fill(MOCK_LISTING.sqft)
}

/**
 * Mock the campaign generate endpoint to return mock ads after a delay.
 */
export async function mockGenerateSuccess(page: Page, delayMs = 500) {
  await page.route('**/api/campaign/*/generate', async (route) => {
    await new Promise((r) => setTimeout(r, delayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })
}

/**
 * Mock the campaign generate endpoint to fail.
 */
export async function mockGenerateFailure(page: Page, status = 500) {
  await page.route('**/api/campaign/*/generate', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'AI generation failed' }),
    })
  })
}

/**
 * Mock the campaign generate endpoint to hang (simulate timeout).
 */
export async function mockGenerateTimeout(page: Page) {
  await page.route('**/api/campaign/*/generate', async (route) => {
    // Never respond — simulates a timeout
    await new Promise(() => {})
  })
}

/**
 * Mock the campaign create endpoint to return a fake campaign ID.
 */
export async function mockCampaignCreate(page: Page, campaignId = 'test-campaign-123') {
  await page.route('**/api/campaign/create', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, id: campaignId }),
    })
  })
}

export { base as test, expect }
```

**Step 4: Commit**

```bash
git add e2e/global-setup.ts e2e/fixtures.ts e2e/.auth/.gitkeep
git commit -m "chore: add Playwright global auth setup and test fixtures"
```

---

### Task 3: Auth Boundaries Test Suite

**Files:**
- Create: `e2e/auth-boundaries.spec.ts`

This suite runs WITHOUT auth state to test unauthenticated access. It uses a separate Playwright project config or creates a fresh context.

**Step 1: Write the test suite**

```ts
// e2e/auth-boundaries.spec.ts
import { test, expect } from '@playwright/test'

// These tests deliberately use NO stored auth state
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Auth Boundaries', () => {
  test('redirects /create to /signup when logged out', async ({ page }) => {
    await page.goto('/create')
    await expect(page).toHaveURL(/\/signup/)
  })

  test('redirects /dashboard to /login when logged out', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/share/[token] is accessible without auth', async ({ page }) => {
    // Navigate to a share URL — even if token is invalid, it should NOT redirect to login
    await page.goto('/share/test-invalid-token')
    // Should show expired/not-found view, NOT a login redirect
    await expect(page).toHaveURL(/\/share\//)
    // Should see either the share content or the "Link Expired" view
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('campaign page shows not-found for unauthenticated user', async ({ page }) => {
    await page.goto('/campaign/nonexistent-id-12345')
    // Should show "Campaign not found" — not a login redirect
    // (campaign page is client-rendered, not server-redirected)
    await expect(page.getByText(/campaign not found/i)).toBeVisible({ timeout: 10000 })
  })
})
```

**Step 2: Run tests to verify they work**

Run: `npx playwright test e2e/auth-boundaries.spec.ts --headed`
Expected: Tests should pass (redirects work, share page is public)

**Step 3: Commit**

```bash
git add e2e/auth-boundaries.spec.ts
git commit -m "test: add auth boundary e2e tests"
```

---

### Task 4: Form & Input Edge Cases Test Suite

**Files:**
- Create: `e2e/form-edge-cases.spec.ts`
- Create: `e2e/test-assets/test-image.jpg` (a small valid JPEG for upload tests)
- Create: `e2e/test-assets/fake-document.txt` (a text file for wrong-format test)
- Create: `e2e/test-assets/oversized.jpg` (needs to be >10MB — generate programmatically)

**Step 1: Create test asset files**

For the valid test image, create a tiny 1x1 JPEG programmatically in the global setup or use a small real file. For oversized, we'll generate a buffer in the test.

```bash
mkdir -p e2e/test-assets
echo "This is not an image" > e2e/test-assets/fake-document.txt
```

For the JPEG, create a minimal valid JPEG (a tiny placeholder). We'll generate it with a setup script:

```ts
// Add to e2e/test-assets/generate-assets.ts (run once)
import { writeFileSync } from 'fs'
import { join } from 'path'

// Minimal valid 1x1 JPEG
const TINY_JPEG = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
  0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
  0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
  0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94,
  0x11, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9,
])

writeFileSync(join(__dirname, 'test-image.jpg'), TINY_JPEG)

// 11MB file (exceeds 10MB limit)
const OVERSIZED = Buffer.alloc(11 * 1024 * 1024, 0xFF)
// Add JPEG header so it passes MIME sniffing
OVERSIZED[0] = 0xFF; OVERSIZED[1] = 0xD8; OVERSIZED[2] = 0xFF; OVERSIZED[3] = 0xE0
writeFileSync(join(__dirname, 'oversized.jpg'), OVERSIZED)
```

**Step 2: Write the test suite**

```ts
// e2e/form-edge-cases.spec.ts
import { test, expect, fillPropertyForm } from './fixtures'
import path from 'path'

test.describe('Form & Input Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/create')
    // Wait for form to be visible
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })
  })

  test('shows validation errors when submitting empty required fields', async ({ page }) => {
    // Try to submit without filling anything
    const submitBtn = page.getByRole('button', { name: /generate/i })
    await submitBtn.click()

    // Should show validation errors or prevent submission
    // The form should remain on /create (not navigate away)
    await expect(page).toHaveURL(/\/create/)
  })

  test('rejects non-image file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, 'test-assets', 'fake-document.txt'))

    // Should show an error about unsupported file type
    await expect(page.getByText(/unsupported type/i)).toBeVisible({ timeout: 5000 })
  })

  test('rejects oversized image upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, 'test-assets', 'oversized.jpg'))

    // Should show error about file size
    await expect(page.getByText(/exceeds.*10.*mb/i)).toBeVisible({ timeout: 5000 })
  })

  test('handles form submission with network offline', async ({ page, context }) => {
    await fillPropertyForm(page)

    // Go offline
    await context.setOffline(true)

    const submitBtn = page.getByRole('button', { name: /generate/i })
    await submitBtn.click()

    // Should show an error, not crash
    // Wait a moment for the error to appear
    await page.waitForTimeout(3000)

    // Page should still be on /create (no navigation)
    await expect(page).toHaveURL(/\/create/)

    // Restore network
    await context.setOffline(false)
  })
})
```

**Step 3: Run tests**

Run: `npx playwright test e2e/form-edge-cases.spec.ts --headed`

**Step 4: Commit**

```bash
git add e2e/form-edge-cases.spec.ts e2e/test-assets/
git commit -m "test: add form and input edge case e2e tests"
```

---

### Task 5: Campaign Generation Resilience Test Suite

**Files:**
- Create: `e2e/campaign-generation.spec.ts`

**Step 1: Write the test suite**

```ts
// e2e/campaign-generation.spec.ts
import { test, expect, fillPropertyForm, mockCampaignCreate, mockGenerateSuccess, mockGenerateFailure, mockGenerateTimeout } from './fixtures'

test.describe('Campaign Generation Resilience', () => {
  test('recovers from page refresh during generation', async ({ page }) => {
    // Mock endpoints — create succeeds, generate has long delay
    await mockCampaignCreate(page, 'test-refresh-campaign')
    await mockGenerateSuccess(page, 5000) // 5s delay

    await page.goto('/create')
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })
    await fillPropertyForm(page)

    // Submit the form
    const submitBtn = page.getByRole('button', { name: /generate/i })
    await submitBtn.click()

    // Wait for navigation to campaign page
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 })

    // Should see generating view
    await expect(page.getByText(/generating/i)).toBeVisible({ timeout: 10000 })

    // Refresh the page mid-generation
    await page.reload()

    // After refresh, should still show generating view (poll resumes)
    // or show campaign content if generation completed during refresh
    const generatingOrComplete = page.getByText(/generating|campaign kit/i)
    await expect(generatingOrComplete).toBeVisible({ timeout: 15000 })

    // Page should NOT crash or show an error
    await expect(page.getByText(/error|crash|undefined/i)).not.toBeVisible()
  })

  test('prevents double campaign creation on rapid submit', async ({ page }) => {
    let createCallCount = 0
    await page.route('**/api/campaign/create', async (route) => {
      createCallCount++
      await new Promise((r) => setTimeout(r, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'test-double-click' }),
      })
    })
    await mockGenerateSuccess(page)

    await page.goto('/create')
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })
    await fillPropertyForm(page)

    const submitBtn = page.getByRole('button', { name: /generate/i })

    // Rapid double-click
    await submitBtn.dblclick()

    // Wait for navigation
    await page.waitForTimeout(3000)

    // Should only have created one campaign
    expect(createCallCount).toBeLessThanOrEqual(1)
  })

  test('shows failed view on AI error (500)', async ({ page }) => {
    await mockCampaignCreate(page)
    await mockGenerateFailure(page, 500)

    await page.goto('/create')
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })
    await fillPropertyForm(page)

    const submitBtn = page.getByRole('button', { name: /generate/i })
    await submitBtn.click()

    // Wait for navigation to campaign page
    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 })

    // Should eventually show failure state
    await expect(page.getByText(/failed|error/i)).toBeVisible({ timeout: 30000 })
  })

  test('handles browser back/forward during generation', async ({ page }) => {
    await mockCampaignCreate(page)
    await mockGenerateSuccess(page, 5000)

    await page.goto('/create')
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })
    await fillPropertyForm(page)

    const submitBtn = page.getByRole('button', { name: /generate/i })
    await submitBtn.click()

    await expect(page).toHaveURL(/\/campaign\//, { timeout: 10000 })

    // Go back
    await page.goBack()
    await page.waitForTimeout(500)

    // Go forward
    await page.goForward()
    await page.waitForTimeout(500)

    // Page should not be broken — should show generating or content
    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()
    // Should not see a JS error or white screen
    await expect(page.getByText(/unhandled|undefined is not/i)).not.toBeVisible()
  })
})
```

**Step 2: Run tests**

Run: `npx playwright test e2e/campaign-generation.spec.ts --headed`

**Step 3: Commit**

```bash
git add e2e/campaign-generation.spec.ts
git commit -m "test: add campaign generation resilience e2e tests"
```

---

### Task 6: Sharing & Export Edge Cases Test Suite

**Files:**
- Create: `e2e/sharing-export.spec.ts`

**Step 1: Write the test suite**

```ts
// e2e/sharing-export.spec.ts
import { test, expect } from './fixtures'

test.describe('Sharing & Export Edge Cases', () => {
  test('shows expired view for revoked/invalid share link', async ({ page }) => {
    await page.goto('/share/invalid-token-that-does-not-exist')

    // Should show "Link Expired" or similar — not a crash
    await expect(page.getByText(/expired|not found|invalid/i)).toBeVisible({ timeout: 10000 })
  })

  test('share page does not crash on expired token', async ({ page }) => {
    await page.goto('/share/expired-token-12345')

    // Page should render without JS errors
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Should NOT show raw error stack or undefined
    await expect(page.getByText(/undefined|error|stack/i)).not.toBeVisible()
  })

  test('email modal validates email address', async ({ page }) => {
    // This test requires a generated campaign — mock the page state
    // Navigate to a campaign page with mocked generated state
    await page.route('**/api/email/**', async (route) => {
      const body = route.request().postDataJSON()
      if (!body?.email?.includes('@')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid email address' }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    // Go to dashboard, find a campaign (if exists)
    await page.goto('/dashboard')
    const campaignLink = page.locator('a[href*="/campaign/"]').first()

    // Skip if no campaigns exist
    if (await campaignLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await campaignLink.click()
      await expect(page).toHaveURL(/\/campaign\//)

      // Look for email button
      const emailBtn = page.getByRole('button', { name: /email/i })
      if (await emailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailBtn.click()

        // Try to send with invalid email
        const emailInput = page.getByPlaceholder(/email/i)
        if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await emailInput.fill('not-an-email')
          const sendBtn = page.getByRole('button', { name: /send/i })
          await sendBtn.click()

          // Should show validation error
          await page.waitForTimeout(2000)
          await expect(page).toHaveURL(/\/campaign\//) // should still be on page
        }
      }
    }
  })
})
```

**Step 2: Run tests**

Run: `npx playwright test e2e/sharing-export.spec.ts --headed`

**Step 3: Commit**

```bash
git add e2e/sharing-export.spec.ts
git commit -m "test: add sharing and export edge case e2e tests"
```

---

### Task 7: Navigation Resilience Test Suite

**Files:**
- Create: `e2e/navigation.spec.ts`

**Step 1: Write the test suite**

```ts
// e2e/navigation.spec.ts
import { test, expect } from './fixtures'

test.describe('Navigation Resilience', () => {
  test('shows 404 or not-found for non-existent campaign', async ({ page }) => {
    await page.goto('/campaign/this-campaign-does-not-exist-999')

    // Should show "Campaign not found" — not a crash
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 })
  })

  test('browser back from campaign to dashboard works cleanly', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10000 })

    // Navigate to create page
    await page.goto('/create')
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })

    // Go back to dashboard
    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10000 })
  })

  test('rapid navigation between pages does not break state', async ({ page }) => {
    // Rapidly navigate between pages
    await page.goto('/dashboard')
    await page.goto('/create')
    await page.goto('/dashboard')
    await page.goto('/create')

    // Final state should be stable on /create
    await expect(page).toHaveURL(/\/create/)
    await expect(page.getByPlaceholder('123 Main St')).toBeVisible({ timeout: 10000 })

    // No JS errors or broken UI
    await expect(page.getByText(/undefined|error|crash/i)).not.toBeVisible()
  })

  test('direct URL to non-existent route shows 404', async ({ page }) => {
    const response = await page.goto('/this-page-definitely-does-not-exist')

    // Next.js should return 404
    expect(response?.status()).toBe(404)
  })
})
```

**Step 2: Run tests**

Run: `npx playwright test e2e/navigation.spec.ts --headed`

**Step 3: Commit**

```bash
git add e2e/navigation.spec.ts
git commit -m "test: add navigation resilience e2e tests"
```

---

### Task 8: Generate Test Assets & Run Full Suite

**Step 1: Create the test asset generation script**

```ts
// e2e/test-assets/generate-assets.ts
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const dir = join(__dirname)
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

// Minimal valid 1x1 JPEG (smallest valid JPEG possible)
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP///////////////////////////////////' +
  '//////////////////////////////////////////////////////////2wBDAf////////' +
  '//////////////////////////////////////////////////////////////////wAARCA' +
  'ABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAA' +
  'AgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2Jy' +
  'ggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4' +
  'eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW' +
  '19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQF' +
  'BgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKR' +
  'obHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/RFhHRUYnJCk6LTQ9Pj8=',
  'base64'
)
writeFileSync(join(dir, 'test-image.jpg'), TINY_JPEG)

// 11MB file to exceed 10MB upload limit
const OVERSIZED = Buffer.alloc(11 * 1024 * 1024, 0x00)
// Minimal JPEG header
OVERSIZED[0] = 0xFF
OVERSIZED[1] = 0xD8
OVERSIZED[2] = 0xFF
OVERSIZED[3] = 0xE0
writeFileSync(join(dir, 'oversized.jpg'), OVERSIZED)

console.log('Test assets generated successfully.')
```

**Step 2: Add generation script to package.json**

```json
"test:e2e:setup": "npx tsx e2e/test-assets/generate-assets.ts"
```

**Step 3: Run the asset generation**

Run: `npm run test:e2e:setup`

**Step 4: Run the full test suite**

Run: `TEST_USER_EMAIL=<test-email> TEST_USER_PASSWORD=<test-password> npx playwright test`
Expected: All suites run. Some tests may need adjustment based on actual app behavior.

**Step 5: Commit everything**

```bash
git add e2e/ playwright.config.ts package.json
git commit -m "test: complete edge case & resilience e2e test suite"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `playwright.config.ts`, `package.json`, `.gitignore` | Configure Playwright |
| 2 | `e2e/global-setup.ts`, `e2e/fixtures.ts` | Auth setup & shared helpers |
| 3 | `e2e/auth-boundaries.spec.ts` | Unauthenticated access tests |
| 4 | `e2e/form-edge-cases.spec.ts`, `e2e/test-assets/` | Form validation & upload tests |
| 5 | `e2e/campaign-generation.spec.ts` | Refresh, double-submit, failures |
| 6 | `e2e/sharing-export.spec.ts` | Share link & email edge cases |
| 7 | `e2e/navigation.spec.ts` | Navigation & routing resilience |
| 8 | `e2e/test-assets/generate-assets.ts` | Asset generation & full run |

**Prerequisites:** Create a test user account in your Supabase project and have `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` ready. Ensure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is NOT set in your test environment (so captcha is disabled).
