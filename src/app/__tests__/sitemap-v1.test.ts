import sitemap from '../sitemap';

/**
 * Verifies the sitemap includes all public v1 pages.
 * The /pricing page was added for v1 launch and should be indexed.
 */
describe('Sitemap — v1 pages', () => {
  const entries = sitemap();

  test('includes the homepage', () => {
    const homepage = entries.find((e) => e.url === 'https://addrop.app');
    expect(homepage).toBeDefined();
    expect(homepage!.priority).toBe(1.0);
  });

  test('includes the pricing page', () => {
    const pricing = entries.find((e) => e.url === 'https://addrop.app/pricing');
    expect(pricing).toBeDefined();
    expect(pricing!.priority).toBe(0.8);
    expect(pricing!.changeFrequency).toBe('monthly');
  });
});
