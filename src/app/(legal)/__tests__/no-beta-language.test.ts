import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const LEGAL_DIR = join(process.cwd(), 'src', 'app', '(legal)')

function getLegalPageFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (entry === '__tests__') continue // skip test directory
    if (statSync(fullPath).isDirectory()) {
      files.push(...getLegalPageFiles(fullPath))
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      files.push(fullPath)
    }
  }
  return files
}

// Strip TSX/HTML comments so we don't false-positive on
// JSX comment blocks ({/* ... */}) or code comments.
function stripComments(source: string): string {
  // Remove {/* ... */} JSX comments
  let stripped = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  // Remove // line comments
  stripped = stripped.replace(/\/\/.*$/gm, '')
  return stripped
}

describe('Legal pages — no beta language', () => {
  const files = getLegalPageFiles(LEGAL_DIR)

  it('should find at least one legal page file', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('should not contain beta language in %s', (filePath) => {
    const source = readFileSync(filePath, 'utf-8')
    const visible = stripComments(source)
    // Match "beta" as a standalone word (case-insensitive)
    const betaMatches = visible.match(/\bbeta\b/gi)
    expect(betaMatches).toBeNull()
  })
})
