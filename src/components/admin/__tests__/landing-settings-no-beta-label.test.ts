import fs from 'fs';
import path from 'path';

/**
 * Verifies the landing settings admin form does not use "Beta" in field labels.
 * The "Beta Notice" label should be renamed to "Subtitle Notice" for v1.
 */
describe('Landing settings form — no beta labels', () => {
  const formPath = path.resolve(__dirname, '..', 'landing-settings-form.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(formPath, 'utf-8');
  });

  test('does not contain "Beta Notice" label text', () => {
    expect(source).not.toContain('Beta Notice');
  });

  test('contains "Subtitle Notice" label text', () => {
    expect(source).toContain('Subtitle Notice');
  });
});
