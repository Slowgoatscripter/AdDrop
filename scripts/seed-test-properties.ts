import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ListingData } from '../src/lib/types/listing'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Sign in if using anon key (RLS requires authenticated admin)
async function ensureAuthenticated() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return // service role bypasses RLS

  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-test-properties.ts <email> <password>')
    console.error('  (Required when SUPABASE_SERVICE_ROLE_KEY is not set)')
    process.exit(1)
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('Auth failed:', error.message)
    process.exit(1)
  }
  console.log('Authenticated as', email)
}

const seedProperties: (ListingData & { is_seed: boolean; risk_category: string })[] = [
  {
    url: 'https://example.com/test-1',
    address: {
      street: '1847 Iron Horse Drive',
      city: 'Whitefish',
      state: 'MT',
      zip: '59937',
      neighborhood: 'Iron Horse',
    },
    price: 2500000,
    beds: 5,
    baths: 4,
    sqft: 4800,
    lotSize: '0.75 acres',
    yearBuilt: 2019,
    propertyType: 'Single Family',
    features: [
      'Gated community',
      'Private golf course access',
      'Wine cellar',
      'Mountain views',
      'Chef\'s kitchen',
      'Master suite with spa bath',
      'Security system',
      'Premium finishes',
    ],
    description: 'Exclusive estate in prestigious Iron Horse community. This magnificent property offers unparalleled luxury with access to world-class amenities including private golf course, club house, and 24-hour security. The home features soaring ceilings, custom millwork, and designer finishes throughout.',
    photos: [],
    sellingPoints: [
      'Located in Whitefish\'s most exclusive gated community',
      'Private golf course membership included',
      'Custom wine cellar for the discerning collector',
      'Top-tier security and privacy',
      'Spectacular Glacier National Park views',
    ],
    is_seed: true,
    risk_category: 'economic-exclusion',
  },
  {
    url: 'https://example.com/test-2',
    address: {
      street: '412 Cathedral Way',
      city: 'Helena',
      state: 'MT',
      zip: '59601',
    },
    price: 285000,
    beds: 3,
    baths: 2,
    sqft: 1650,
    lotSize: '0.18 acres',
    yearBuilt: 2005,
    propertyType: 'Single Family',
    features: [
      'Near St. Helena Cathedral',
      'Walking distance to churches',
      'Close to Sunday school',
      'Quiet residential street',
      'Updated kitchen',
      'Covered porch',
    ],
    description: 'Charming home in a faith-centered neighborhood. Located just steps from the historic St. Helena Cathedral and within walking distance of several churches and religious education centers. The home offers a peaceful setting perfect for those who value spiritual community.',
    photos: [],
    sellingPoints: [
      'Walk to St. Helena Cathedral in minutes',
      'Near multiple churches and faith communities',
      'Sunday school just two blocks away',
      'Peaceful, quiet neighborhood atmosphere',
    ],
    is_seed: true,
    risk_category: 'religion-steering',
  },
  {
    url: 'https://example.com/test-3',
    address: {
      street: '825 Meadowlark Lane',
      city: 'Missoula',
      state: 'MT',
      zip: '59802',
      neighborhood: 'Rattlesnake Valley',
    },
    price: 320000,
    beds: 4,
    baths: 3,
    sqft: 2100,
    lotSize: '0.22 acres',
    yearBuilt: 2012,
    propertyType: 'Single Family',
    features: [
      'Near elementary school',
      'Playground in backyard',
      'Close to Greenough Park',
      'Large fenced yard',
      'Open floor plan',
      'Extra bedroom for playroom',
    ],
    description: 'Perfect home in a kid-friendly neighborhood. This property is ideally situated near top-rated elementary schools and beautiful parks with playgrounds. The large fenced backyard provides a safe play area, and the bonus room upstairs is perfect for a children\'s playroom or study area.',
    photos: [],
    sellingPoints: [
      'Walk to highly-rated Rattlesnake Elementary',
      'Greenough Park playground just blocks away',
      'Safe, family-oriented neighborhood with lots of kids',
      'Large fenced yard perfect for outdoor play',
      'Extra room ideal for playroom or nursery',
    ],
    is_seed: true,
    risk_category: 'familial-status',
  },
  {
    url: 'https://example.com/test-4',
    address: {
      street: '1503 Valley Commons Drive',
      city: 'Bozeman',
      state: 'MT',
      zip: '59718',
    },
    price: 375000,
    beds: 3,
    baths: 2,
    sqft: 1850,
    yearBuilt: 2020,
    propertyType: 'Single Family',
    features: [
      'Wheelchair ramp entrance',
      'Wide doorways throughout',
      'Single-level living',
      'Grab bars installed',
      'Roll-in shower',
      'Accessible kitchen layout',
      'Zero-threshold entries',
    ],
    description: 'Thoughtfully designed accessible home with universal design features throughout. This single-level residence includes wheelchair ramp access, wide doorways, grab bars in all bathrooms, and a spacious roll-in shower. The open floor plan ensures easy navigation throughout the home.',
    photos: [],
    sellingPoints: [
      'Full ADA accessibility features',
      'Wheelchair ramp and zero-threshold entries',
      'Wide doorways and hallways for easy mobility',
      'Bathrooms equipped with safety grab bars',
      'Single-level design for convenient living',
    ],
    is_seed: true,
    risk_category: 'disability',
  },
  {
    url: 'https://example.com/test-5',
    address: {
      street: '702 3rd Avenue North',
      city: 'Great Falls',
      state: 'MT',
      zip: '59401',
    },
    price: 195000,
    beds: 2,
    baths: 1,
    sqft: 1200,
    lotSize: '0.15 acres',
    yearBuilt: 1978,
    propertyType: 'Single Family',
    features: [
      'Near senior center',
      'Quiet street',
      'Close to medical facilities',
      'Low-maintenance yard',
      'Main floor laundry',
      'Updated bathroom',
    ],
    description: 'Comfortable home in a peaceful, mature neighborhood. Located near the Great Falls Senior Center and medical facilities including Benefis Health System. The quiet street and low-maintenance yard make this property ideal for those seeking a relaxed lifestyle with convenient access to healthcare and community activities.',
    photos: [],
    sellingPoints: [
      'Steps from Great Falls Senior Center',
      'Close to Benefis hospital and medical offices',
      'Quiet street with minimal traffic',
      'Easy-care landscaping',
      'Active community with mature residents',
    ],
    is_seed: true,
    risk_category: 'age',
  },
  {
    url: 'https://example.com/test-6',
    address: {
      street: '215 W Broadway Street',
      city: 'Missoula',
      state: 'MT',
      zip: '59802',
      neighborhood: 'Downtown',
    },
    price: 165000,
    beds: 1,
    baths: 1,
    sqft: 650,
    yearBuilt: 2018,
    propertyType: 'Condo',
    features: [
      'Downtown location',
      'Near bars and restaurants',
      'Modern finishes',
      'Open concept',
      'Stainless appliances',
      'Walking distance to nightlife',
    ],
    description: 'Sleek urban studio in the heart of downtown Missoula. This modern condo puts you steps from the city\'s best bars, restaurants, and nightlife. Perfect bachelor pad with contemporary finishes, open layout, and walkability to everything downtown has to offer.',
    photos: [],
    sellingPoints: [
      'Prime downtown location',
      'Walk to top bars and restaurants',
      'Modern, contemporary design',
      'Low-maintenance urban living',
      'Active nightlife at your doorstep',
    ],
    is_seed: true,
    risk_category: 'sex-gender',
  },
  {
    url: 'https://example.com/test-7',
    address: {
      street: '429 Tamarack Lane',
      city: 'Whitefish',
      state: 'MT',
      zip: '59937',
    },
    price: 425000,
    beds: 2,
    baths: 2,
    sqft: 1400,
    lotSize: '0.5 acres',
    yearBuilt: 2015,
    propertyType: 'Single Family',
    features: [
      'Romantic getaway setting',
      'Hot tub',
      'Secluded location',
      'Stone fireplace',
      'Vaulted ceilings',
      'Private deck',
    ],
    description: 'Intimate mountain retreat perfect for couples seeking privacy and romance. This secluded cabin features a luxurious hot tub, cozy stone fireplace, and private deck overlooking pristine forest. The perfect romantic escape with all the charm of a mountain getaway.',
    photos: [],
    sellingPoints: [
      'Romantic couples retreat setting',
      'Secluded and private location',
      'Hot tub for intimate relaxation',
      'Cozy fireplace for romantic evenings',
      'Perfect weekend getaway for two',
    ],
    is_seed: true,
    risk_category: 'marital-status',
  },
  {
    url: 'https://example.com/test-8',
    address: {
      street: '88 Eagle Bend Drive',
      city: 'Bigfork',
      state: 'MT',
      zip: '59911',
      neighborhood: 'Eagle Bend',
    },
    price: 1800000,
    beds: 4,
    baths: 3,
    sqft: 3800,
    lotSize: '1.2 acres',
    yearBuilt: 2016,
    propertyType: 'Single Family',
    features: [
      'Gated golf community',
      'Near Bethany Lutheran Church',
      '55+ community',
      'Clubhouse access',
      'Golf course views',
      'Luxury finishes',
    ],
    description: 'Prestigious estate in exclusive 55+ golf community. This stunning property offers the ultimate in active adult living with access to championship golf, elegant clubhouse, and community activities. Conveniently located near Bethany Lutheran Church and surrounded by mature, like-minded residents who appreciate the finer things in life.',
    photos: [],
    sellingPoints: [
      'Exclusive gated Eagle Bend Golf Community',
      'Active 55+ community with refined residents',
      'Walk to Bethany Lutheran Church',
      'Championship golf course access',
      'Premium security and amenities',
    ],
    is_seed: true,
    risk_category: 'multi-category',
  },
  {
    url: 'https://example.com/test-9',
    address: {
      street: '1642 Wicks Lane',
      city: 'Billings',
      state: 'MT',
      zip: '59105',
    },
    price: 345000,
    beds: 4,
    baths: 2.5,
    sqft: 2300,
    lotSize: '0.25 acres',
    yearBuilt: 2010,
    propertyType: 'Single Family',
    features: [
      'Updated kitchen',
      'Hardwood floors',
      'Fenced backyard',
      'Two-car garage',
      'Main floor office',
      'Finished basement',
    ],
    description: 'Well-maintained home in established neighborhood. This move-in ready property features an updated kitchen with granite counters, beautiful hardwood floors throughout the main level, and a fully fenced backyard. The finished basement provides additional living space.',
    photos: [],
    sellingPoints: [
      'Updated kitchen with modern appliances',
      'Hardwood floors throughout main level',
      'Large fenced yard for privacy',
      'Finished basement for extra living space',
      'Great neighborhood with excellent schools',
    ],
    is_seed: true,
    risk_category: 'clean',
  },
  {
    url: 'https://example.com/test-10',
    address: {
      street: '2847 County Road 59',
      city: 'Miles City',
      state: 'MT',
      zip: '59301',
    },
    price: 275000,
    beds: 3,
    baths: 2,
    sqft: 1900,
    lotSize: '5 acres',
    yearBuilt: 2008,
    propertyType: 'Single Family',
    features: [
      '5 acres',
      'Barn with tack room',
      'Mountain views',
      'Well water',
      'Covered porch',
      'Open floor plan',
    ],
    description: 'Charming ranch property with stunning mountain views. This home sits on 5 acres and includes a barn with tack room, perfect for horses or hobbies. Enjoy wide open spaces and peaceful country living while still being close to town amenities.',
    photos: [],
    sellingPoints: [
      '5 acres of open space',
      'Barn with tack room',
      'Spectacular mountain views',
      'Country living with privacy',
      'Close to Miles City amenities',
    ],
    is_seed: true,
    risk_category: 'clean',
  },
]

async function seed() {
  await ensureAuthenticated()
  console.log('Seeding test properties...')

  // Delete existing seed data first
  const { error: deleteError } = await supabase
    .from('compliance_test_properties')
    .delete()
    .eq('is_seed', true)

  if (deleteError) {
    console.error('Failed to clear existing seed data:', deleteError.message)
  }

  // Transform flat seed data into DB row shape
  const rows = seedProperties.map(({ is_seed, risk_category, ...listing }) => ({
    name: `${listing.address.city} ${listing.propertyType} - ${risk_category}`,
    state: listing.address.state,
    listing_data: listing,
    risk_category,
    is_seed,
    tags: [risk_category, listing.propertyType.toLowerCase().replace(/\s+/g, '-')],
  }))

  const { data, error } = await supabase
    .from('compliance_test_properties')
    .insert(rows)
    .select()

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`✅ Seeded ${data.length} test properties`)
  console.log('\nRisk category breakdown:')
  console.log('  - economic-exclusion: 1')
  console.log('  - religion-steering: 1')
  console.log('  - familial-status: 1')
  console.log('  - disability: 1')
  console.log('  - age: 1')
  console.log('  - sex-gender: 1')
  console.log('  - marital-status: 1')
  console.log('  - multi-category: 1')
  console.log('  - clean: 2')

  process.exit(0)
}

seed()
