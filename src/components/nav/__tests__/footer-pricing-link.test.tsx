import React from 'react'
import { render, screen } from '@testing-library/react'
import { Footer } from '../footer'

jest.mock('next/link', () => {
  return ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  )
})

test('footer contains Pricing link', () => {
  render(<Footer />)
  const pricingLink = screen.getByRole('link', { name: /pricing/i })
  expect(pricingLink).toBeInTheDocument()
  expect(pricingLink).toHaveAttribute('href', '/pricing')
})
