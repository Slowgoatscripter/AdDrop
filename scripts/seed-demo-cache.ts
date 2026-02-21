import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local without dotenv dependency
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  console.error('Could not read .env.local — set env vars manually')
}

async function main() {
  const { seedDemoCache } = await import('../src/lib/demo/cache')
  const { SAMPLE_PROPERTIES } = await import('../src/lib/demo/sample-properties')

  console.log(`Seeding demo cache for ${SAMPLE_PROPERTIES.length} properties...`)

  try {
    await seedDemoCache()
    console.log('Demo cache seeded successfully.')
    for (const prop of SAMPLE_PROPERTIES) {
      const id = prop.address.street.toLowerCase().replace(/\s+/g, '-')
      console.log(`  - ${id} (${prop.address.city}, ${prop.address.state})`)
    }
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  }

  process.exit(0)
}

main()
