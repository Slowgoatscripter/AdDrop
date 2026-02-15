/**
 * Seed the compliance test corpus with initial Montana test ads.
 * Run with: npx tsx scripts/seed-compliance-corpus.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const montanaTestAds = [
  // Clean ads
  {
    state: 'MT',
    name: 'MT clean suburban listing',
    text: 'Beautiful 4-bedroom home in Bozeman. Updated kitchen with granite countertops, spacious backyard, and attached two-car garage. Close to schools and parks. 2,400 sq ft on a quiet cul-de-sac.',
    expected_violations: [],
    is_clean: true,
    tags: ['clean', 'suburban', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT clean rural listing',
    text: 'Stunning mountain views from this 20-acre property outside Missoula. Custom-built log home with 3 bedrooms, 2 baths, wrap-around deck. Well and septic. Paved road access.',
    expected_violations: [],
    is_clean: true,
    tags: ['clean', 'rural', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT clean condo listing',
    text: 'Modern downtown Billings condo. 2BR/2BA, open floor plan, in-unit laundry, one reserved parking space. Walk to restaurants and shopping. HOA includes water and trash.',
    expected_violations: [],
    is_clean: true,
    tags: ['clean', 'condo', 'seed'],
    source: 'seed-script',
  },
  // Violation ads
  {
    state: 'MT',
    name: 'MT steering - exclusive neighborhood',
    text: 'Luxury home in an exclusive neighborhood. This prestigious property offers privacy and security in a gated community.',
    expected_violations: [
      { term: 'exclusive', category: 'steering', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['steering', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT familial status - no children',
    text: 'Quiet adult community. No children allowed. Perfect for retirees seeking peace and tranquility.',
    expected_violations: [
      { term: 'no children', category: 'familial-status', severity: 'hard' },
      { term: 'adult community', category: 'familial-status', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['familial-status', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT disability language',
    text: 'This home is not handicap accessible. Steps at all entrances. Not suitable for wheelchair users.',
    expected_violations: [
      { term: 'handicap', category: 'disability', severity: 'hard' },
      { term: 'not suitable for wheelchair', category: 'disability', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['disability', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT religion reference',
    text: 'Perfect home for a Christian family. Located in a faith-based community with shared values.',
    expected_violations: [
      { term: 'Christian family', category: 'religion', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['religion', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT economic exclusion',
    text: 'Executive home for professionals. No Section 8 accepted. Proof of high income required.',
    expected_violations: [
      { term: 'no section 8', category: 'economic-exclusion', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['economic-exclusion', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT misleading claims',
    text: 'Guaranteed sale in 30 days or your money back! This is the best deal in Montana. Waterfront property with amazing investment potential.',
    expected_violations: [
      { term: 'guaranteed sale', category: 'misleading-claims', severity: 'hard' },
      { term: 'best deal', category: 'misleading-claims', severity: 'soft' },
    ],
    is_clean: false,
    tags: ['misleading-claims', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT age discrimination',
    text: 'Perfect for young professionals. No retirees please. Active lifestyle community for those under 40.',
    expected_violations: [
      { term: 'young professionals', category: 'age', severity: 'soft' },
      { term: 'no retirees', category: 'age', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['age', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT sex/gender preference',
    text: 'Bachelor pad in downtown Missoula. Perfect for single men. Man cave included.',
    expected_violations: [
      { term: 'bachelor pad', category: 'sex-gender', severity: 'soft' },
      { term: 'single men', category: 'sex-gender', severity: 'hard' },
      { term: 'man cave', category: 'sex-gender', severity: 'soft' },
    ],
    is_clean: false,
    tags: ['sex-gender', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT marital status',
    text: 'Ideal for married couples. Divorced individuals need not apply. Family-oriented neighborhood.',
    expected_violations: [
      { term: 'married couples', category: 'marital-status', severity: 'hard' },
      { term: 'divorced', category: 'marital-status', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['marital-status', 'seed'],
    source: 'seed-script',
  },
  {
    state: 'MT',
    name: 'MT multiple category violations',
    text: 'Exclusive executive home in a private Christian community. No children, no Section 8. Perfect for married couples only. This is the best investment in Montana, guaranteed returns.',
    expected_violations: [
      { term: 'exclusive', category: 'steering', severity: 'hard' },
      { term: 'no children', category: 'familial-status', severity: 'hard' },
      { term: 'no section 8', category: 'economic-exclusion', severity: 'hard' },
      { term: 'married couples', category: 'marital-status', severity: 'hard' },
    ],
    is_clean: false,
    tags: ['multi-category', 'seed'],
    source: 'seed-script',
  },
]

async function seed() {
  console.log(`Seeding ${montanaTestAds.length} Montana test ads...`)

  for (const ad of montanaTestAds) {
    const { error } = await supabase.from('compliance_test_ads').insert(ad)
    if (error) {
      console.error(`Failed to insert "${ad.name}":`, error.message)
    } else {
      console.log(`  + ${ad.name}`)
    }
  }

  console.log('Done.')
}

seed()
