import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getDemoCacheEntry } from '@/lib/demo/cache';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request as Request & { ip?: string });
    const rateLimit = await checkRateLimit(`demo:${ip}`, 'demo');

    if (rateLimit.limited) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId') ?? undefined;

    const entry = await getDemoCacheEntry(propertyId);

    if (!entry) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({
      available: true,
      propertyId: entry.propertyId,
      campaign: entry.campaign,
      compliance: entry.compliance,
      quality: entry.quality,
      rawCampaign: entry.rawCampaign,
      generatedAt: entry.generatedAt,
    });
  } catch (error) {
    console.error('[demo API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
