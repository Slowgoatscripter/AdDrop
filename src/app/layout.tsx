import type { Metadata } from 'next';
import { Fraunces, Space_Grotesk, Playfair_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700', '900'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'AdDrop — AI-Powered Real Estate Marketing',
  description: 'Create ad campaigns across 12 platforms. Instagram, Facebook, Google, print, and more.',
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable} font-sans noise-overlay bg-background text-foreground`}>
        {children}
        <Toaster
          position="bottom-left"
          theme="dark"
          toastOptions={{
            className: 'bg-card border border-border text-cream shadow-lg',
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
