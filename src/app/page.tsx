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
import { getSettings } from '@/lib/settings/server';
import type { LandingStat, FAQItem } from '@/lib/types/settings';

export default async function Home() {
  const s = await getSettings('landing');

  return (
    <main className="min-h-screen">
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
      <FAQ faqs={s['landing.faq'] as FAQItem[]} />
      <CTAFooter
        headline={s['landing.cta_headline'] as string}
        ctaText={s['landing.cta_text'] as string}
        betaNotice={s['landing.cta_beta'] as string}
      />
      <MobileCTABar />
    </main>
  );
}
