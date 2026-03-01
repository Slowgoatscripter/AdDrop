import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppHeader } from '../app-header'

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
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
