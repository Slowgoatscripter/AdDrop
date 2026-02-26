import fs from 'fs';
import path from 'path';

describe('Landing page — section order', () => {
  const pagePath = path.resolve(__dirname, '..', 'page.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(pagePath, 'utf-8');
  });

  // Target order: Hero → PlatformBar → InteractiveDemo → ShowcaseCarousel →
  //               FeaturesGrid → WhoItsFor → FAQ → CTAFooter → MobileCTABar → Footer
  const expectedOrder = [
    '<Hero',
    '<PlatformBar',
    '<InteractiveDemo',
    '<ShowcaseCarousel',
    '<FeaturesGrid',
    '<WhoItsFor',
    '<FAQ',
    '<CTAFooter',
    '<MobileCTABar',
    '<Footer',
  ];

  test('sections render in the correct conversion-optimized order', () => {
    const positions = expectedOrder.map((tag) => {
      const index = source.indexOf(tag);
      expect(index).toBeGreaterThan(-1); // section must exist
      return { tag, index };
    });

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      expect(curr.index).toBeGreaterThan(prev.index);
    }
  });

  test('does not import removed sections', () => {
    expect(source).not.toContain('HowItWorks');
    expect(source).not.toContain('SocialProof');
    expect(source).not.toContain('PricingSection');
  });

  test('does not contain beta-era props', () => {
    expect(source).not.toContain('betaNotice');
  });
});
