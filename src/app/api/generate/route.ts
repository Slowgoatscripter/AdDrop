import { NextRequest, NextResponse } from 'next/server';
import { ListingData } from '@/lib/types';
import { generateCampaign } from '@/lib/ai/generate';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const listing = body.listing as ListingData;

    if (!listing || !listing.address) {
      return NextResponse.json({ error: 'Listing data is required' }, { status: 400 });
    }

    const campaign = await generateCampaign(listing);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('Generate API error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
