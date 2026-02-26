import fs from 'fs';
import path from 'path';

describe('Landing page — pricing section removed', () => {
  const pagePath = path.resolve(__dirname, '..', 'page.tsx');

  test('does not import PricingSection', () => {
    const source = fs.readFileSync(pagePath, 'utf-8');
    expect(source).not.toContain('PricingSection');
  });

  test('does not reference the pricing-section module', () => {
    const source = fs.readFileSync(pagePath, 'utf-8');
    expect(source).not.toContain('pricing-section');
  });

  test('pricing-section component file does not exist', () => {
    const componentPath = path.resolve(
      __dirname,
      '..',
      '..',
      'components',
      'landing',
      'pricing-section.tsx'
    );
    expect(fs.existsSync(componentPath)).toBe(false);
  });
});
