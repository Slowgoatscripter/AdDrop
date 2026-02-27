import { render, screen } from '@testing-library/react'
import { SignupBanner } from '../signup-banner'

describe('SignupBanner', () => {
  test('renders "Create a free account" without "beta"', () => {
    render(<SignupBanner />)
    expect(screen.getByText(/Create a free account/)).toBeInTheDocument()
    expect(screen.queryByText(/beta/i)).not.toBeInTheDocument()
  })

  test('benefits list says "per month" and "Free to start"', () => {
    render(<SignupBanner />)
    expect(screen.getByText(/2 campaigns per month/)).toBeInTheDocument()
    expect(screen.getByText(/Free to start/)).toBeInTheDocument()
    expect(screen.queryByText(/per week/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Free during beta/)).not.toBeInTheDocument()
  })
})
