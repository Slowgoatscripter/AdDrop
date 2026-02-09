import { Hero } from '@/components/landing/hero';
import { PlatformBar } from '@/components/landing/platform-bar';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { CTAFooter } from '@/components/landing/cta-footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <PlatformBar />
      <HowItWorks />
      <ShowcaseCarousel />
      <FeaturesGrid />
      <CTAFooter />
    </main>
  );
}
