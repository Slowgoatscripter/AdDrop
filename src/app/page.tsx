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

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <PlatformBar />
      <HowItWorks />
      <ShowcaseCarousel />
      <SocialProof />
      <FeaturesGrid />
      <WhoItsFor />
      <FAQ />
      <CTAFooter />
      <MobileCTABar />
    </main>
  );
}
