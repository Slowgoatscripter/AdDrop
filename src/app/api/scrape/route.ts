import { NextRequest, NextResponse } from 'next/server';
import { scrapeListing } from '@/lib/scraper';
import { requireAuth } from '@/lib/supabase/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }

    const result = await scrapeListing(url);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
