import React from 'react'
import { render, screen } from '@testing-library/react'

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

jest.mock('@/components/pricing/pricing-table', () => ({
  PricingTable: () => <div data-testid="pricing-table">Mock Pricing Table</div>,
}))

test('pricing page exports default function', async () => {
  const mod = await import('../../pricing/page')
  expect(mod.default).toBeDefined()
  expect(typeof mod.default).toBe('function')
})

test('pricing page renders with navigation header and footer', async () => {
  const PricingPage = (await import('../../pricing/page')).default
  // PricingPage is an async server component — call it to get JSX
  const jsx = await PricingPage()
  render(jsx)

  // Should have the AppHeader (landing variant renders with "Main navigation" aria-label)
  expect(screen.getByRole('banner', { name: /main navigation/i })).toBeInTheDocument()

  // Should have the Footer (footer element)
  expect(screen.getByRole('contentinfo')).toBeInTheDocument()
})
