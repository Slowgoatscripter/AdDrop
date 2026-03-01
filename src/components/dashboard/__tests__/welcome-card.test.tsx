import { render, screen } from '@testing-library/react'
import { WelcomeCard } from '../welcome-card'

describe('WelcomeCard', () => {
  test('heading says "Welcome to AdDrop" without "Beta"', () => {
    render(<WelcomeCard />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Welcome to AdDrop')
    expect(heading).not.toHaveTextContent('Beta')
  })

  test('benefits list says "per month" not "per week"', () => {
    render(<WelcomeCard />)
    expect(screen.getByText(/2 ad campaigns per month/)).toBeInTheDocument()
    expect(screen.queryByText(/per week/)).not.toBeInTheDocument()
  })
})
