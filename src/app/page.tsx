import type { Metadata } from 'next';
import { Hero } from '@/components/landing/hero';
import { PlatformBar } from '@/components/landing/platform-bar';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel';
import { SocialProof } from '@/components/landing/social-proof';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { WhoItsFor } from '@/components/landing/who-its-for';
import { FAQ } from '@/components/landing/faq';
import { CTAFooter } from '@/components/landing/cta-footer';
import { MobileCTABar } from '@/components/landing/mobile-cta-bar';
import { AppHeader } from '@/components/nav/app-header';
import { getSettings } from '@/lib/settings/server';
import type { LandingStat, FAQItem } from '@/lib/types/settings';
import { FeedbackShell } from '@/components/feedback/feedback-shell';
import { Footer } from '@/components/nav/footer';

export const metadata: Metadata = {
  title: 'AI Real Estate Ad Generator — AdDrop',
  description:
    'AdDrop generates complete real estate ad campaigns in minutes. Enter your property details and get copy for Instagram, Facebook, Google Ads, print, direct mail, and 8+ more platforms. Free during beta.',
  alternates: { canonical: 'https://addrop.app' },
  openGraph: {
    title: 'AI Real Estate Ad Generator — AdDrop',
    description:
      'Generate real estate ad copy for 12+ platforms in minutes. AI-powered, fair-housing compliant, fully editable. Free for agents.',
    url: 'https://addrop.app',
  },
};

export default async function Home() {
  const s = await getSettings('landing');
  const faqs = s['landing.faq'] as FAQItem[];

  // Build FAQ structured data from dynamic settings
  const faqJsonLd = faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }
    : null;

  // TODO: Detect anonymous users and show "Log in to send feedback" message
  return (
    <FeedbackShell>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <main className="min-h-screen">
        <AppHeader variant="landing" />
        <Hero
          titlePrefix={s['landing.hero_title_prefix'] as string}
          titleAccent={s['landing.hero_title_accent'] as string}
          tagline={s['landing.hero_tagline'] as string}
          description={s['landing.hero_description'] as string}
          ctaText={s['landing.hero_cta'] as string}
          stats={s['landing.stats'] as LandingStat[]}
        />
        <PlatformBar />
        <HowItWorks />
        <ShowcaseCarousel />
        <SocialProof />
        <FeaturesGrid />
        <WhoItsFor />
        <FAQ faqs={faqs} />
        <CTAFooter
          headline={s['landing.cta_headline'] as string}
          ctaText={s['landing.cta_text'] as string}
          betaNotice={s['landing.cta_beta'] as string}
        />
        <MobileCTABar />
      </main>
      <Footer />
    </FeedbackShell>
  );
}
