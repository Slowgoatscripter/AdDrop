import * as fs from 'fs';
import * as path from 'path';

describe('page.tsx CTAFooter prop', () => {
  const pageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf-8'
  );

  it('passes description prop to CTAFooter (not betaNotice)', () => {
    // The CTAFooter call should use `description=` prop
    expect(pageSource).toContain("description={(s['landing.cta_description'] as string) || undefined}");
  });

  it('does not use betaNotice prop on CTAFooter', () => {
    expect(pageSource).not.toContain('betaNotice=');
  });

  it('does not reference landing.cta_beta setting key', () => {
    expect(pageSource).not.toContain('landing.cta_beta');
  });
});
