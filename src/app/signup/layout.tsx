import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Your Free Account',
  description:
    'Sign up for AdDrop free. Generate AI-powered real estate ad campaigns across 12+ platforms. No credit card required.',
  robots: { index: false, follow: false },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
