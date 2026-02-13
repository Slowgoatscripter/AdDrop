import { ReactNode } from 'react';

interface FeedbackShellProps {
  children: ReactNode;
}

/**
 * Shell wrapper that provides feedback functionality to pages.
 * Wraps page content and can display a floating feedback button.
 * Currently a passthrough wrapper - feedback UI will be added later.
 */
export function FeedbackShell({ children }: FeedbackShellProps) {
  return <>{children}</>;
}
