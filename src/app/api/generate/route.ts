import { NextRequest, NextResponse } from 'next/server';
import { ListingData, PlatformId, ALL_PLATFORMS } from '@/lib/types';
import { generateCampaign } from '@/lib/ai/generate';
import { requireAuth } from '@/lib/supabase/auth-helpers';

const VALID_PLATFORMS = new Set<string>(ALL_PLATFORMS);

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const listing = body.listing as ListingData;

    if (!listing || !listing.address) {
      return NextResponse.json({ error: 'Listing data is required' }, { status: 400 });
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
        return NextResponse.json({ error: `Unknown platform(s): ${invalid.join(', ')}` }, { status: 400 });
      }
      platforms = body.platforms as PlatformId[];
    }

    const campaign = await generateCampaign(listing, platforms);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('Generate API error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
