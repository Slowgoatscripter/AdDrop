import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupPage from '../page';

// Mock next/navigation — provide a `next` search param to trigger beta banner path
const mockGet = jest.fn((key: string) => (key === 'next' ? '/create' : null));
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Mock Captcha — render nothing
jest.mock('@/components/auth/captcha', () => ({
  Captcha: () => <div data-testid="captcha-mock" />,
}));

// Mock AppHeader — render nothing
jest.mock('@/components/nav/app-header', () => ({
  AppHeader: () => <header data-testid="app-header-mock" />,
}));

// Mock Footer — render nothing
jest.mock('@/components/nav/footer', () => ({
  Footer: () => <footer data-testid="footer-mock" />,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((key: string) => (key === 'next' ? '/create' : null));
  });

  test('does not render any beta-related messaging', () => {
    render(<SignupPage />);

    // The BetaSignupBanner contains these strings — none should appear
    expect(screen.queryByText(/free beta account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/free during beta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you're one step away/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 campaigns per week/i)).not.toBeInTheDocument();
  });

  test('renders the signup form with standard v1 messaging', () => {
    render(<SignupPage />);

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('does not render beta content even without next param', () => {
    mockGet.mockImplementation(() => null);

    render(<SignupPage />);

    expect(screen.queryByText(/free beta account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/free during beta/i)).not.toBeInTheDocument();
  });
});
