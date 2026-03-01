import fs from 'fs';
import path from 'path';

describe('Hero — V1 launch badge', () => {
  const heroPath = path.resolve(__dirname, '..', 'hero.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(heroPath, 'utf-8');
  });

  test('contains the V1 badge markup', () => {
    expect(source).toContain('V1 Now Live');
  });

  test('badge has removal comment marker', () => {
    expect(source).toContain('V1 Launch Badge — remove after launch');
  });

  test('badge enters at 200ms (before title at 300ms)', () => {
    // The badge delay must be 0.2 (200ms)
    expect(source).toContain('delay: 0.2');
  });

  test('badge uses shimmer-gold animation', () => {
    expect(source).toContain('animate-shimmer-gold');
  });
});
