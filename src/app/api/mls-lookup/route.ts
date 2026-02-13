import { NextRequest, NextResponse } from 'next/server';
import { resolveMlsNumber } from '@/lib/scraper/mls-resolver';
import { scrapeListing } from '@/lib/scraper';
import { requireAuth } from '@/lib/supabase/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const body = await request.json();
    const { mlsNumber } = body;

    if (!mlsNumber || typeof mlsNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'MLS number is required' },
        { status: 400 }
      );
    }

    // Step 1: Resolve MLS# to a listing URL
    const resolved = await resolveMlsNumber(mlsNumber);

    if (!resolved.success || !resolved.url) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: 404 }
      );
    }

    // Step 2: Scrape the resolved URL
    const scraped = await scrapeListing(resolved.url);

    if (!scraped.success || !scraped.data) {
      return NextResponse.json(
        {
          success: false,
          error: scraped.error || 'Failed to scrape listing data',
          missingFields: scraped.missingFields,
        },
        { status: 422 }
      );
    }

    // Step 3: Attach MLS number to the data
    const data = { ...scraped.data, mlsNumber };

    return NextResponse.json({
      success: true,
      data,
      source: resolved.source,
      missingFields: scraped.missingFields,
    });
  } catch (error) {
    console.error('MLS lookup error:', error);
    const message = error instanceof Error ? error.message : 'MLS lookup failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
