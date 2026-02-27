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
