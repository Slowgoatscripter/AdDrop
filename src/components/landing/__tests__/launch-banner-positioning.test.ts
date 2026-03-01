import fs from 'fs';
import path from 'path';

describe('LaunchBanner — fixed positioning below AppHeader', () => {
  const bannerPath = path.resolve(__dirname, '..', 'launch-banner.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(bannerPath, 'utf-8');
  });

  test('uses fixed positioning instead of relative', () => {
    expect(source).toContain('fixed');
    expect(source).not.toContain('relative z-40');
  });

  test('anchors below the header with top-14 md:top-[72px]', () => {
    // header is h-14 md:h-[72px], banner must sit directly below
    expect(source).toContain('top-14');
    expect(source).toContain('md:top-[72px]');
  });

  test('spans full width with left-0 right-0', () => {
    expect(source).toContain('left-0');
    expect(source).toContain('right-0');
  });

  test('has backdrop-blur for visual consistency with header', () => {
    expect(source).toContain('backdrop-blur-sm');
  });
});
