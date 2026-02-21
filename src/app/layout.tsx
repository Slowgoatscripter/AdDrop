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
  metadataBase: new URL('https://addrop.app'),
  title: {
    default: 'AdDrop — AI Real Estate Ad Generator',
    template: '%s | AdDrop',
  },
  description:
    'Generate complete real estate ad campaigns in minutes. AI-powered copy for Instagram, Facebook, Google Ads, print, and 8+ more platforms. Built for real estate agents.',
  keywords: [
    'real estate ad generator',
    'AI real estate marketing',
    'listing ad creator',
    'real estate social media ads',
    'property marketing AI',
    'realtor ad generator',
    'real estate listing copy',
    'MLS ad copy generator',
  ],
  authors: [{ name: 'AdDrop', url: 'https://addrop.app' }],
  creator: 'AdDrop',
  publisher: 'AdDrop',
  alternates: { canonical: 'https://addrop.app' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://addrop.app',
    siteName: 'AdDrop',
    title: 'AdDrop — AI Real Estate Ad Generator',
    description:
      'Generate complete real estate ad campaigns in minutes. AI-powered copy for Instagram, Facebook, Google Ads, print, and 8+ more platforms.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'AdDrop — AI Real Estate Ad Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdDrop — AI Real Estate Ad Generator',
    description:
      'Generate complete real estate ad campaigns in minutes. AI-powered copy for Instagram, Facebook, Google Ads, print, and 8+ more platforms.',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'AdDrop',
                url: 'https://addrop.app',
                logo: 'https://addrop.app/favicon.svg',
                description:
                  'AI-powered real estate ad generator for agents and brokerages.',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'AdDrop',
                url: 'https://addrop.app',
                description:
                  'Generate real estate ad campaigns across 12+ platforms in minutes.',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'AdDrop',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                url: 'https://addrop.app',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'USD',
                  description: 'Free during beta',
                },
                description:
                  'AI-powered real estate ad generator. Create complete marketing campaigns for Instagram, Facebook, Google Ads, print, and more from a single property listing.',
                featureList: [
                  'AI-generated ad copy',
                  'Fair housing compliance checking',
                  '12+ platform support',
                  'Multiple tone options',
                  'Campaign sharing',
                  'Editable outputs',
                ],
              },
            ]),
          }}
        />
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
