import fs from 'fs';
import path from 'path';

describe('Hero — mobile padding clears fixed header + banner', () => {
  const heroPath = path.resolve(__dirname, '..', 'hero.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(heroPath, 'utf-8');
  });

  test('uses pt-28 for mobile top padding (clears header + banner)', () => {
    // 112px (pt-28) > 56px header + ~44px banner = 100px
    expect(source).toContain('pt-28');
  });

  test('uses pb-20 for mobile bottom padding', () => {
    expect(source).toContain('pb-20');
  });

  test('does not use py-20 shorthand (split into explicit pt/pb)', () => {
    // py-20 would give only 80px top padding, not enough to clear
    // header (56px) + banner (~44px) = 100px on mobile
    expect(source).not.toMatch(/\bpy-20\b/);
  });

  test('preserves lg:pt-0 lg:pb-0 for desktop flex-centering', () => {
    expect(source).toContain('lg:pt-0');
    expect(source).toContain('lg:pb-0');
  });
});
