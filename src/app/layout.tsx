import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AdDrop — AI-Powered Real Estate Marketing',
  description: 'Turn any property listing into a complete ad campaign across 12+ platforms in seconds. Instagram, Facebook, Google, print, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>{children}</body>
    </html>
  );
}
