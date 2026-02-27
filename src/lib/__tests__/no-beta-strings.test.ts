/**
 * Regression sweep: ensures no user-facing or code-level "beta" references remain
 * in source files outside the explicit allowlist.
 *
 * Allowlist:
 *   - 'landing.cta_beta' / 'cta_beta' — DB key intentionally preserved for backward compat
 *   - This test file itself
 */

import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

const SRC_ROOT = path.resolve(__dirname, '../../..')

// Patterns that are intentionally kept and must not be flagged
const ALLOWLIST: Array<{ file: string; pattern: RegExp }> = [
  // DB key string preserved for backward compatibility
  {
    file: path.join(SRC_ROOT, 'src/lib/types/settings.ts'),
    pattern: /cta_beta/,
  },
  {
    file: path.join(SRC_ROOT, 'src/lib/settings/defaults.ts'),
    pattern: /cta_beta/,
  },
  {
    file: path.join(SRC_ROOT, 'src/components/admin/landing-settings-form.tsx'),
    pattern: /cta_beta/,
  },
  {
    file: path.join(SRC_ROOT, 'src/app/page.tsx'),
    pattern: /cta_beta/,
  },
  // This test file itself
  {
    file: __filename,
    pattern: /beta/i,
  },
]

function isAllowlisted(filePath: string, line: string): boolean {
  for (const entry of ALLOWLIST) {
    if (path.resolve(filePath) === path.resolve(entry.file) && entry.pattern.test(line)) {
      return true
    }
  }
  return false
}

function findBetaReferences(): Array<{ file: string; lineNumber: number; line: string }> {
  const results: Array<{ file: string; lineNumber: number; line: string }> = []

  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: SRC_ROOT,
    absolute: true,
    ignore: [
      'src/lib/__tests__/no-beta-strings.test.ts',
    ],
  })

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/\bbeta\b/i.test(line)) {
        if (!isAllowlisted(filePath, line)) {
          results.push({
            file: path.relative(SRC_ROOT, filePath),
            lineNumber: i + 1,
            line: line.trim(),
          })
        }
      }
    }
  }

  return results
}

describe('no-beta-strings', () => {
  test('no "beta" references remain in source files outside the allowlist', () => {
    const violations = findBetaReferences()

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.lineNumber}: ${v.line}`)
        .join('\n')
      fail(
        `Found ${violations.length} beta reference(s) that should be removed:\n${report}`
      )
    }

    expect(violations).toHaveLength(0)
  })
})
