import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ListingData, PlatformId, ALL_PLATFORMS } from '@/lib/types';
import { requireAuth } from '@/lib/supabase/auth-helpers';

const VALID_PLATFORMS = new Set<string>(ALL_PLATFORMS);

function buildListingSummary(listing: ListingData): string {
  const addr = listing.address;
  const addressStr = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
  const price = listing.price ? `$${listing.price.toLocaleString()}` : 'Price not listed';
  const features = listing.features?.length ? listing.features.join(', ') : 'none listed';
  const description = listing.description ? listing.description.slice(0, 800) : '';

  return [
    `Address: ${addressStr}`,
    `Price: ${price}`,
    `Beds: ${listing.beds} | Baths: ${listing.baths} | Sqft: ${listing.sqft?.toLocaleString() ?? 'N/A'}`,
    listing.propertyType ? `Property Type: ${listing.propertyType}` : '',
    listing.yearBuilt ? `Year Built: ${listing.yearBuilt}` : '',
    listing.lotSize ? `Lot Size: ${listing.lotSize}` : '',
    `Features: ${features}`,
    description ? `Description: ${description}` : '',
    listing.listingAgent ? `Agent: ${listing.listingAgent}` : '',
    listing.broker ? `Broker: ${listing.broker}` : '',
    listing.mlsNumber ? `MLS#: ${listing.mlsNumber}` : '',
  ].filter(Boolean).join('\n');
}

function buildPlatformPrompt(platform: PlatformId, tone: string, listing: ListingData): string {
  const summary = buildListingSummary(listing);
  const toneInstruction = `Write in a ${tone} tone.`;

  const platformPrompts: Record<PlatformId, string> = {
    twitter: `You are a real estate marketing expert. Write a single Twitter/X post for this property listing.
${toneInstruction}
HARD LIMIT: max 280 characters. Include relevant hashtags. Be engaging and concise.
Return only the tweet text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    instagram: `You are a real estate marketing expert. Write an Instagram caption for this property listing.
${toneInstruction}
HARD LIMIT: max 2,200 characters total. The first 125 characters are visible before "more" — front-load the hook there.
Include emojis where appropriate and relevant hashtags at the end.
Be engaging, warm, and highlight the lifestyle this home offers.
Return only the caption text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    facebook: `You are a real estate marketing expert. Write a Facebook post for this property listing.
${toneInstruction}
The first 477 characters are visible before "see more" — front-load the hook. Aim for 400-600 characters total.
Be conversational and highlight key selling points. Include a call to action.
Return only the post text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    zillow: `You are a real estate listing expert. Write a compelling Zillow property description.
${toneInstruction}
HARD LIMIT: max 4,500 characters. Focus on the property's best features, neighborhood, and lifestyle benefits.
Use clear, descriptive language that helps buyers visualize living there.
Return only the description text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    realtorCom: `You are a real estate listing expert. Write a compelling Realtor.com property description.
${toneInstruction}
HARD LIMIT: max 5,000 characters. Highlight unique features, recent updates, and location advantages.
Write for motivated home buyers searching on Realtor.com.
Return only the description text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    homesComTrulia: `You are a real estate listing expert. Write a property description for Homes.com/Trulia.
${toneInstruction}
HARD LIMIT: max 4,000 characters. Emphasize lifestyle, community, and property highlights.
Make it inviting and informative for buyers browsing these platforms.
Return only the description text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    mlsDescription: `You are a real estate MLS copywriter. Write a professional MLS property description.
${toneInstruction}
HARD LIMIT: max 2,000 characters. Be factual, detailed, and professional. Mention key specs, features,
and property highlights. Avoid subjective language where possible. This will be seen by agents.
Return only the MLS description text as a plain JSON string — no markdown, no explanation.

Listing:
${summary}`,

    googleAds: `You are a paid search advertising expert. Write a Google Ads headline and description for this property.
${toneInstruction}
HARD LIMITS: Headline: max 30 characters. Description: max 90 characters.
Return as a JSON object with keys "headline" and "description". No markdown, no explanation.

Listing:
${summary}`,

    metaAd: `You are a Meta (Facebook/Instagram) ads expert. Write ad copy for this property listing.
${toneInstruction}
HARD LIMITS: primaryText (max 125 chars, truncated after this), headline (max 40 chars), description (max 30 chars).
Return as a JSON object with keys "primaryText", "headline", "description". No markdown, no explanation.

Listing:
${summary}`,

    magazineFullPage: `You are a luxury real estate print advertising expert. Write a full-page magazine ad for this property.
${toneInstruction}
Include a compelling headline (max 10 words), rich descriptive body (200-350 words), and a strong call to action (max 10 words).
Return as a JSON object with keys "headline", "body", "cta". No markdown, no explanation.

Listing:
${summary}`,

    magazineHalfPage: `You are a real estate print advertising expert. Write a half-page magazine ad for this property.
${toneInstruction}
Include a punchy headline (max 10 words), concise body (100-150 words), and a call to action (max 10 words).
Return as a JSON object with keys "headline", "body", "cta". No markdown, no explanation.

Listing:
${summary}`,

    postcard: `You are a real estate direct mail expert. Write postcard copy for this property.
${toneInstruction}
Front: headline (max 15 words) and tagline (max 20 words).
Back: brief description (75-100 words) that sells the home.
Return as a JSON object: { front: { headline, tagline }, back: string }. No markdown, no explanation.

Listing:
${summary}`,
  };

  return platformPrompts[platform];
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { platform, tone = 'professional', listingData } = body;

    // Validate required fields
    if (!platform) {
      return NextResponse.json({ error: 'platform is required' }, { status: 400 });
    }

    if (!listingData) {
      return NextResponse.json({ error: 'listingData is required' }, { status: 400 });
    }

    if (!VALID_PLATFORMS.has(platform)) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}. Valid platforms: ${ALL_PLATFORMS.join(', ')}` },
        { status: 400 }
      );
    }

    const prompt = buildPlatformPrompt(platform as PlatformId, tone, listingData as ListingData);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional real estate copywriter. Return only the requested content as specified — no additional explanation, preamble, or markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // Parse the content — it may be a JSON string or JSON object
    let copy: string;
    try {
      const parsed = JSON.parse(rawContent);
      // If it's a plain string (JSON-encoded), use it directly
      if (typeof parsed === 'string') {
        copy = parsed;
      } else {
        // For structured platforms (googleAds, metaAd, etc.), serialize back to a display string
        // The caller can parse this if needed, or we return the stringified JSON
        copy = JSON.stringify(parsed);
      }
    } catch {
      // Not valid JSON — use the raw text
      copy = rawContent.trim();
    }

    console.log(`[regenerate-platform] user=${user!.id} platform=${platform} tone=${tone}`);

    return NextResponse.json({ copy, platform });
  } catch (error) {
    console.error('[regenerate-platform] Error:', error);
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 });
  }
}
