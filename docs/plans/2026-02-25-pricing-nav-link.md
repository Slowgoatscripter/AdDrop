# Pricing Navigation Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Pricing" link to the site navigation so users can easily discover the existing `/pricing` page from the landing page, mobile drawer, and footer.

**Architecture:** The landing page header (`AppHeader` with `variant="landing"`) currently only shows logo + auth buttons. We add a "Pricing" link inline on desktop and inside the mobile drawer. The footer gets a "Pricing" link alongside the existing legal links. The pricing page itself gets an `AppHeader` so users can navigate away. All existing `/pricing` CTAs (tier-usage-card, upgrade-prompt, locked-platform-overlay, billing page) already point to `/pricing` and need no changes.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion, Lucide icons, Jest + React Testing Library

---

### Task 1: Add "Pricing" link to landing page desktop header

**Files:**
- Modify: `src/components/nav/app-header.tsx:181-197` (landing anonymous section)

**Step 1: Write the failing test**

Create the test file:

```tsx
// src/components/nav/__tests__/app-header-pricing-link.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppHeader } from '../app-header'

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

jest.mock('next/link', () => {
  return ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  )
})

jest.mock('framer-motion', () => ({
  motion: {
    header: ({ children, ...props }: { children: React.ReactNode }) => <header {...props}>{children}</header>,
    span: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}))

jest.mock('@/components/feedback/feedback-provider', () => ({
  useFeedbackOptional: () => null,
}))

test('landing variant shows Pricing link in desktop nav', () => {
  render(<AppHeader variant="landing" />)
  const pricingLink = screen.getByRole('link', { name: /pricing/i })
  expect(pricingLink).toBeInTheDocument()
  expect(pricingLink).toHaveAttribute('href', '/pricing')
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/nav/__tests__/app-header-pricing-link.test.tsx --no-cache`
Expected: FAIL — no link with name "pricing" found

**Step 3: Add "Pricing" link to the landing desktop nav**

In `src/components/nav/app-header.tsx`, find the `{/* Landing anonymous: Log In + Sign Up */}` section (around line 182). Add a "Pricing" link **before** the Log In link, inside the same `<>` fragment:

```tsx
{/* Landing nav: Pricing link (always visible) */}
{variant === 'landing' && (
  <Link
    href="/pricing"
    className="text-sm text-cream/80 hover:text-gold transition-colors min-h-[44px] flex items-center px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
  >
    Pricing
  </Link>
)}
```

Place this immediately **before** the `{variant === 'landing' && !user && (` block (line 182), so the Pricing link shows for both anonymous and authenticated users on the landing page.

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/nav/__tests__/app-header-pricing-link.test.tsx --no-cache`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/nav/__tests__/app-header-pricing-link.test.tsx src/components/nav/app-header.tsx
git commit -m "feat: add Pricing link to landing page desktop header"
```

---

### Task 2: Add "Pricing" link to mobile drawer (landing variant)

**Files:**
- Modify: `src/components/nav/mobile-drawer.tsx:221-248` (landing anonymous section)

**Step 1: Write the failing test**

```tsx
// src/components/nav/__tests__/mobile-drawer-pricing-link.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MobileDrawer } from '../mobile-drawer'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/link', () => {
  return ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  )
})

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: { children: React.ReactNode }) => <aside {...props}>{children}</aside>,
  },
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: () => Promise.resolve() },
  }),
}))

test('landing drawer shows Pricing link for anonymous users', () => {
  render(<MobileDrawer open={true} onClose={jest.fn()} variant="landing" />)
  const pricingLink = screen.getByRole('link', { name: /pricing/i })
  expect(pricingLink).toBeInTheDocument()
  expect(pricingLink).toHaveAttribute('href', '/pricing')
})

test('landing drawer shows Pricing link for authenticated users', () => {
  render(
    <MobileDrawer
      open={true}
      onClose={jest.fn()}
      variant="landing"
      user={{ displayName: 'Test', email: 'test@test.com', role: 'user' }}
    />
  )
  const pricingLink = screen.getByRole('link', { name: /pricing/i })
  expect(pricingLink).toBeInTheDocument()
  expect(pricingLink).toHaveAttribute('href', '/pricing')
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/nav/__tests__/mobile-drawer-pricing-link.test.tsx --no-cache`
Expected: FAIL — no link with name "pricing" found

**Step 3: Add "Pricing" link to mobile drawer**

In `src/components/nav/mobile-drawer.tsx`, add a Pricing link that shows for **all** landing drawer users (anonymous and authenticated). Add this block right before the `{/* Landing anonymous: CTA + auth links */}` section (around line 221), inside the `{/* Navigation links */}` div:

```tsx
{/* Landing: Pricing link (always visible) */}
{variant === 'landing' && (
  <div className="px-4 py-1">
    <Link
      href="/pricing"
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 text-sm text-cream/80 hover:text-cream hover:bg-surface transition-colors min-h-[44px]"
    >
      Pricing
    </Link>
  </div>
)}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/nav/__tests__/mobile-drawer-pricing-link.test.tsx --no-cache`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/nav/__tests__/mobile-drawer-pricing-link.test.tsx src/components/nav/mobile-drawer.tsx
git commit -m "feat: add Pricing link to mobile navigation drawer"
```

---

### Task 3: Add "Pricing" link to footer

**Files:**
- Modify: `src/components/nav/footer.tsx:11-15` (nav links section)

**Step 1: Write the failing test**

```tsx
// src/components/nav/__tests__/footer-pricing-link.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Footer } from '../footer'

jest.mock('next/link', () => {
  return ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  )
})

jest.mock('@/components/ui/droplet-icon', () => ({
  DropletIcon: () => <span data-testid="droplet-icon" />,
}))

test('footer contains Pricing link', () => {
  render(<Footer />)
  const pricingLink = screen.getByRole('link', { name: /pricing/i })
  expect(pricingLink).toBeInTheDocument()
  expect(pricingLink).toHaveAttribute('href', '/pricing')
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/nav/__tests__/footer-pricing-link.test.tsx --no-cache`
Expected: FAIL — no link with name "pricing" found

**Step 3: Add "Pricing" link to footer**

In `src/components/nav/footer.tsx`, add a Pricing link to the `<nav>` element. Insert it as the **first** link (before Terms), since it's the most commercially important:

Change the `<nav>` block from:

```tsx
<nav className="flex items-center gap-4">
  <Link href="/terms" className="hover:text-teal-light transition-colors">Terms</Link>
  <Link href="/privacy" className="hover:text-teal-light transition-colors">Privacy</Link>
  <Link href="/cookies" className="hover:text-teal-light transition-colors">Cookies</Link>
  <Link href="/disclaimer" className="hover:text-teal-light transition-colors">Disclaimer</Link>
</nav>
```

To:

```tsx
<nav className="flex items-center gap-4">
  <Link href="/pricing" className="hover:text-teal-light transition-colors">Pricing</Link>
  <Link href="/terms" className="hover:text-teal-light transition-colors">Terms</Link>
  <Link href="/privacy" className="hover:text-teal-light transition-colors">Privacy</Link>
  <Link href="/cookies" className="hover:text-teal-light transition-colors">Cookies</Link>
  <Link href="/disclaimer" className="hover:text-teal-light transition-colors">Disclaimer</Link>
</nav>
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/nav/__tests__/footer-pricing-link.test.tsx --no-cache`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/nav/__tests__/footer-pricing-link.test.tsx src/components/nav/footer.tsx
git commit -m "feat: add Pricing link to site footer"
```

---

### Task 4: Add AppHeader + Footer to the pricing page

**Files:**
- Modify: `src/app/pricing/page.tsx`

The pricing page currently renders bare `<main>` with no header or footer. Users arriving from navigation need a way to navigate back. Wrap the existing content with `AppHeader` (landing variant) and `Footer`.

**Step 1: Write the failing test**

```tsx
// src/app/pricing/__tests__/pricing-page-nav.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'

// We test that the pricing page module imports AppHeader and Footer.
// Since the pricing page is a server component, we test the rendered structure indirectly.
// Instead, we write a simpler integration check:

jest.mock('next/navigation', () => ({
  usePathname: () => '/pricing',
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/link', () => {
  return ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  )
})

jest.mock('framer-motion', () => ({
  motion: {
    header: ({ children, ...props }: { children: React.ReactNode }) => <header {...props}>{children}</header>,
    span: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}))

jest.mock('@/components/feedback/feedback-provider', () => ({
  useFeedbackOptional: () => null,
}))

jest.mock('@/components/ui/droplet-icon', () => ({
  DropletIcon: () => <span data-testid="droplet-icon" />,
}))

jest.mock('@/components/pricing/pricing-table', () => ({
  PricingTable: () => <div data-testid="pricing-table">Mock Pricing Table</div>,
}))

// For server component testing, we import and render directly
// Note: This requires the component to be refactored or we test the imports exist
test('pricing page exports default function', async () => {
  const mod = await import('../../pricing/page')
  expect(mod.default).toBeDefined()
  expect(typeof mod.default).toBe('function')
})
```

**Step 2: Run test to verify it passes (baseline — just verifying the module loads)**

Run: `npx jest src/app/pricing/__tests__/pricing-page-nav.test.tsx --no-cache`
Expected: PASS (this is a baseline test to verify setup)

**Step 3: Add AppHeader and Footer to pricing page**

In `src/app/pricing/page.tsx`, add imports and wrap the existing `<main>` with the header and footer:

Change the imports from:

```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PricingTable } from '@/components/pricing/pricing-table'
import type { SubscriptionTier } from '@/lib/stripe/config'
```

To:

```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PricingTable } from '@/components/pricing/pricing-table'
import { AppHeader } from '@/components/nav/app-header'
import { Footer } from '@/components/nav/footer'
import type { SubscriptionTier } from '@/lib/stripe/config'
```

Change the return JSX from:

```tsx
return (
  <main className="min-h-screen py-20 px-6">
    ...
  </main>
)
```

To:

```tsx
return (
  <>
    <AppHeader variant="landing" />
    <main className="min-h-screen pt-24 pb-20 px-6">
      ...
    </main>
    <Footer />
  </>
)
```

Note: Changed `py-20` to `pt-24 pb-20` because the landing header is `fixed` and we need extra top padding to prevent content from hiding behind it.

**Step 4: Verify build compiles**

Run: `npx next build --no-lint 2>&1 | head -30` (or check for TypeScript errors)
Expected: No TypeScript errors related to pricing page

**Step 5: Commit**

```bash
git add src/app/pricing/page.tsx src/app/pricing/__tests__/pricing-page-nav.test.tsx
git commit -m "feat: add navigation header and footer to pricing page"
```

---

### Task 5: Run full test suite and verify no regressions

**Files:**
- No files modified — verification only

**Step 1: Run all nav-related tests**

Run: `npx jest src/components/nav/ --no-cache --verbose`
Expected: All tests PASS

**Step 2: Run full test suite**

Run: `npx jest --no-cache`
Expected: All existing tests PASS, no regressions

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: verify pricing nav link integration, no regressions"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/nav/app-header.tsx` | Add "Pricing" link to landing desktop nav |
| `src/components/nav/mobile-drawer.tsx` | Add "Pricing" link to landing mobile drawer |
| `src/components/nav/footer.tsx` | Add "Pricing" link to footer nav |
| `src/app/pricing/page.tsx` | Add `AppHeader` + `Footer` to pricing page |
| `src/components/nav/__tests__/app-header-pricing-link.test.tsx` | New test |
| `src/components/nav/__tests__/mobile-drawer-pricing-link.test.tsx` | New test |
| `src/components/nav/__tests__/footer-pricing-link.test.tsx` | New test |
| `src/app/pricing/__tests__/pricing-page-nav.test.tsx` | New test |

## What We're NOT Changing (and Why)

- **Landing hero CTA** (`hero.tsx`): "Drop Your First Ad" is a creation CTA, not a pricing CTA. Redirecting to `/pricing` would hurt conversion — users who click this want to create, not read prices.
- **Landing CTA footer** (`cta-footer.tsx`): Same reasoning — "Drop Your First Ad — Free" is an action CTA.
- **Mobile CTA bar** (`mobile-cta-bar.tsx`): Same — action CTAs for signup/create flow.
- **Existing `/pricing` links** in `tier-usage-card.tsx`, `upgrade-prompt.tsx`, `locked-platform-overlay.tsx`, `billing/page.tsx`: Already correctly point to `/pricing`. No changes needed.
- **App-section nav** (`appLinks` in `nav-links.ts`): Adding Pricing to the authenticated app nav would clutter it. Authenticated users reach pricing via upgrade prompts and settings/billing. The nav should stay focused: Dashboard, Create, Settings.

> **Planner** `opus` · 2026-02-26T00:35:48.963Z
