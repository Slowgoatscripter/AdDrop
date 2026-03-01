import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LaunchBanner } from '../launch-banner';

// Mock framer-motion to render children without animation
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...filterDomProps(props)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Filter out non-DOM props that framer-motion adds
function filterDomProps(props: Record<string, unknown>) {
  const domSafe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (['role', 'className', 'style', 'aria-label', 'data-testid'].includes(k)) {
      domSafe[k] = v;
    }
  }
  return domSafe;
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

describe('LaunchBanner', () => {
  test('renders announcement text', () => {
    render(<LaunchBanner />);
    expect(screen.getByText(/AdDrop v1 is live/)).toBeInTheDocument();
  });

  test('renders with role="status" for a11y', () => {
    render(<LaunchBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('has a dismiss button with correct aria-label', () => {
    render(<LaunchBanner />);
    expect(screen.getByLabelText('Dismiss announcement')).toBeInTheDocument();
  });

  test('renders pricing link', () => {
    render(<LaunchBanner />);
    const link = screen.getByText(/See pricing/);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/pricing');
  });

  test('dismiss button hides banner and sets localStorage', () => {
    render(<LaunchBanner />);
    fireEvent.click(screen.getByLabelText('Dismiss announcement'));
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'addrop-v1-banner-dismissed',
      'true'
    );
  });

  test('does not render when previously dismissed', () => {
    localStorageMock.getItem.mockReturnValue('true');
    const { container } = render(<LaunchBanner />);
    // Should render nothing (or empty) when dismissed
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
