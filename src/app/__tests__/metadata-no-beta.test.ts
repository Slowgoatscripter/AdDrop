import fs from 'fs';
import path from 'path';

/**
 * Scans all layout.tsx and page.tsx files under src/app/ for beta references
 * in metadata exports and JSON-LD structured data.
 *
 * This test ensures SEO-visible metadata does not reference "beta" after v1 launch.
 */
describe('Site metadata — no beta references', () => {
  const appDir = path.resolve(__dirname, '..');
  const metadataFiles: string[] = [];

  // Recursively find all layout.tsx and page.tsx files
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === 'layout.tsx' || entry.name === 'page.tsx') {
        metadataFiles.push(fullPath);
      }
    }
  }

  beforeAll(() => {
    walk(appDir);
  });

  test('found metadata files to scan', () => {
    expect(metadataFiles.length).toBeGreaterThan(0);
  });

  test('no metadata exports contain "beta" (case-insensitive)', () => {
    const betaPattern = /['"`]([^'"`]*[Bb]eta[^'"`]*)['"` ]/g;
    const violations: { file: string; match: string; line: number }[] = [];

    for (const filePath of metadataFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Only scan lines inside metadata or JSON-LD blocks (heuristic: string literals with "beta")
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip import lines and component JSX that isn't metadata
        if (line.trim().startsWith('import ')) continue;

        let match: RegExpExecArray | null;
        betaPattern.lastIndex = 0;
        while ((match = betaPattern.exec(line)) !== null) {
          violations.push({
            file: path.relative(appDir, filePath),
            match: match[1],
            line: i + 1,
          });
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — "${v.match}"`)
        .join('\n');
      throw new Error(`Found beta references in metadata files:\n${report}`);
    }
  });

  test('JSON-LD in root layout does not contain "beta"', () => {
    const rootLayout = path.resolve(appDir, 'layout.tsx');
    const content = fs.readFileSync(rootLayout, 'utf-8');

    // Extract the JSON-LD block (between JSON.stringify([ and ]))
    const jsonLdMatch = content.match(/JSON\.stringify\(\[([\s\S]*?)\]\)/);
    expect(jsonLdMatch).not.toBeNull();

    const jsonLdContent = jsonLdMatch![1].toLowerCase();
    expect(jsonLdContent).not.toContain('beta');
  });
});
