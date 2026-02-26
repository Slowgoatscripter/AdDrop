import fs from 'fs'
import path from 'path'

/**
 * Comprehensive sweep test: scans all .ts and .tsx source files under src/
 * for user-facing "beta" string literals. Prevents beta references from
 * being reintroduced after the v1 launch cleanup.
 *
 * Intentionally EXCLUDES:
 * - __tests__/ directories (test files may legitimately reference "beta")
 * - node_modules/
 * - DB key strings like 'landing.cta_beta' (backward compat — matched via allowlist)
 * - Comments (// or /* ... *\/)
 */
describe('No beta strings in source files', () => {
  const srcDir = path.resolve(__dirname, '..', '..')

  // These exact DB key strings are allowed because they reference existing
  // database column names that cannot be renamed without a migration.
  const ALLOWED_DB_KEYS = [
    "'landing.cta_beta'",
    '"landing.cta_beta"',
    '`landing.cta_beta`',
  ]

  const sourceFiles: string[] = []

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '__tests__' ||
        entry.name === '.next'
      ) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        sourceFiles.push(fullPath)
      }
    }
  }

  beforeAll(() => {
    walk(srcDir)
  })

  test('found source files to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(0)
  })

  test('no source files contain user-facing "beta" strings', () => {
    // Matches "beta" (case-insensitive) inside string literals (single, double, or backtick quotes)
    const betaInString = /(['"`])([^'"`]*\bbeta\b[^'"`]*)\1/gi
    const violations: { file: string; line: number; match: string }[] = []

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Skip comment-only lines
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue

        // Skip import lines (filenames may contain "beta" during transition)
        if (trimmed.startsWith('import ')) continue

        let match: RegExpExecArray | null
        betaInString.lastIndex = 0
        while ((match = betaInString.exec(line)) !== null) {
          const fullMatch = match[0]

          // Allow DB key strings
          if (ALLOWED_DB_KEYS.some((key) => fullMatch.includes(key) || line.includes(key))) continue

          violations.push({
            file: path.relative(srcDir, filePath),
            line: i + 1,
            match: match[2],
          })
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — "${v.match}"`)
        .join('\n')
      throw new Error(
        `Found beta references in source files:\n${report}\n\n` +
        'If this is a DB key for backward compatibility, add it to ALLOWED_DB_KEYS in this test.'
      )
    }
  })

  test('no source filenames contain "beta"', () => {
    const betaFiles = sourceFiles.filter((f) => path.basename(f).toLowerCase().includes('beta'))

    if (betaFiles.length > 0) {
      const report = betaFiles.map((f) => `  ${path.relative(srcDir, f)}`).join('\n')
      throw new Error(`Found source files with "beta" in the filename:\n${report}`)
    }
  })
})
