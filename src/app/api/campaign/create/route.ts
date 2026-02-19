import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ListingData, PlatformId, ALL_PLATFORMS } from '@/lib/types';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { getCampaignUsage } from '@/lib/usage/campaign-limits';

const ListingSchema = z.object({
  address: z.object({
    street: z.string().max(200),
    city: z.string().max(100),
    state: z.string().max(50),
    zip: z.string().max(20),
  }),
  price: z.number().min(0).max(1_000_000_000),
  beds: z.number().int().min(0).max(100),
  baths: z.number().min(0).max(100),
  sqft: z.number().min(0).max(1_000_000),
  description: z.string().max(5000).optional(),
  features: z.array(z.string().max(200)).max(50).optional(),
  sellingPoints: z.array(z.string().max(500)).max(20).optional(),
  propertyType: z.string().max(50).optional(),
  lotSize: z.string().max(50).optional(),
  yearBuilt: z.number().int().min(1600).max(2100).optional(),
  photos: z.array(z.string().url().max(2000).refine(url => url.startsWith('https://'), { message: 'Photos must use HTTPS URLs' })).max(25).optional(),
  url: z.string().max(2000).optional().refine(val => !val || z.string().url().safeParse(val).success, { message: 'Invalid URL' }),
  mlsNumber: z.string().max(20).regex(/^[a-zA-Z0-9]*$/).optional(),
  listingAgent: z.string().max(200).optional(),
  broker: z.string().max(200).optional(),
});

const VALID_PLATFORMS = new Set<string>(ALL_PLATFORMS);

function buildCampaignName(listing: ListingData): string {
  const address = listing.address;
  if (address?.street && address?.city && address?.state) {
    return `${address.street}, ${address.city}, ${address.state}`;
  }
  if (address?.street) return address.street;
  if (listing.mlsNumber) return `MLS ${listing.mlsNumber}`;
  return 'Untitled Campaign';
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    // Rate limit check — count 'generating' campaigns as used slots
    const usage = await getCampaignUsage(supabase, user!.id);
    if (usage.isLimited) {
      return NextResponse.json({
        error: 'Beta campaign limit reached',
        code: 'RATE_LIMITED',
        usage: {
          used: usage.used,
          limit: usage.limit,
          resetsAt: usage.resetsAt?.toISOString(),
        },
      }, { status: 429 });
    }

    const body = await request.json();

    // Validate listing
    const parseResult = ListingSchema.safeParse(body.listing);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid listing data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const listing = parseResult.data as ListingData;

    // Strip obvious prompt injection patterns (speed bump, not a full defense)
    if (listing.description) {
      listing.description = listing.description
        .split('\n')
        .filter(line => !/^\s*(ignore|forget|disregard|instead|override|system:|assistant:)/i.test(line))
        .join('\n')
        .slice(0, 5000);
    }

    // Validate platforms parameter (optional — undefined = all platforms)
    let platforms: PlatformId[] | undefined;
    if (body.platforms !== undefined) {
      if (!Array.isArray(body.platforms)) {
        return NextResponse.json({ error: 'platforms must be an array' }, { status: 400 });
      }
      if (body.platforms.length === 0) {
        return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 });
      }
      const invalid = body.platforms.filter((p: string) => !VALID_PLATFORMS.has(p));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Unknown platform(s): ${invalid.join(', ')}` },
          { status: 400 }
        );
      }
      platforms = body.platforms as PlatformId[];
    }

    // Generate a stable ID for the campaign row
    const id = crypto.randomUUID();

    // Insert a pending campaign row — no AI calls here, just a fast insert
    const { error: insertError } = await supabase
      .from('campaigns')
      .insert({
        id,
        user_id: user!.id,
        name: buildCampaignName(listing),
        listing_data: listing,
        generated_ads: null,
        platform: Array.isArray(platforms) ? platforms.join(',') : 'all',
        status: 'generating',
      });

    if (insertError) {
      console.error('[campaign/create] Failed to insert campaign row:', insertError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[campaign/create] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
