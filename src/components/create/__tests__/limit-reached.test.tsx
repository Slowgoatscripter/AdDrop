import { render, screen } from '@testing-library/react'
import { LimitReached } from '../limit-reached'

describe('LimitReached', () => {
  test('heading says "plan limit this month" not "beta limit this week"', () => {
    render(<LimitReached resetsAt={null} />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('plan limit this month')
    expect(heading).not.toHaveTextContent('beta')
    expect(heading).not.toHaveTextContent('week')
  })

  test('shows pricing CTA link', () => {
    render(<LimitReached resetsAt={null} />)
    expect(screen.getByRole('link', { name: /Need More Campaigns/i })).toHaveAttribute('href', '/pricing')
  })

  test('footer text mentions upgrade, not "premium plans"', () => {
    render(<LimitReached resetsAt={null} />)
    expect(screen.getByText(/Upgrade your plan/)).toBeInTheDocument()
    expect(screen.queryByText(/premium plans/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Stay tuned/)).not.toBeInTheDocument()
  })

  test('shows reset date when provided', () => {
    const date = new Date('2026-03-01T14:30:00.000Z')
    render(<LimitReached resetsAt={date} />)
    expect(screen.getByText(/Your next campaign slot opens on/)).toBeInTheDocument()
  })
})
