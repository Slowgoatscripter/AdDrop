import { NextRequest, NextResponse } from 'next/server';
import { CampaignKit } from '@/lib/types';
import { requireAuth } from '@/lib/supabase/auth-helpers';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { campaignId, format } = body as { campaignId: string; format: 'pdf' | 'csv' | 'json' };

    // Validate UUID format
    if (!campaignId || !uuidRegex.test(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    // Load campaign from DB with ownership verification
    const { data: row, error } = await supabase
      .from('campaigns')
      .select('generated_ads')
      .eq('id', campaignId)
      .eq('user_id', user!.id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = row.generated_ads as CampaignKit;

    // Sanitize ID for Content-Disposition header (belt-and-suspenders)
    const safeId = campaignId.replace(/[^a-zA-Z0-9-]/g, '');

    if (format === 'json') {
      return new NextResponse(JSON.stringify(campaign, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="campaign-${safeId}.json"`,
        },
      });
    }

    if (format === 'csv') {
      const rows = buildCsvRows(campaign);
      const csv = rows.map((r) => r.map(escCsv).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="campaign-${safeId}.csv"`,
        },
      });
    }

    // PDF
    const { generatePdfBuffer } = await import('@/lib/export/generate-pdf');
    const pdfBuffer = await generatePdfBuffer(campaign);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="campaign-${safeId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function escCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function buildCsvRows(c: CampaignKit): string[][] {
  const header = ['Platform', 'Tone', 'Content', 'Character Count'];
  const rows: string[][] = [header];

  if (c.instagram) {
    for (const tone of ['professional', 'casual', 'luxury'] as const) {
      rows.push(['Instagram', tone, c.instagram[tone], String(c.instagram[tone].length)]);
    }
  }
  if (c.facebook) {
    for (const tone of ['professional', 'casual', 'luxury'] as const) {
      rows.push(['Facebook', tone, c.facebook[tone], String(c.facebook[tone].length)]);
    }
  }
  if (c.twitter) {
    rows.push(['Twitter/X', '', c.twitter, String(c.twitter.length)]);
  }

  if (c.googleAds) {
    c.googleAds.forEach((ad, i) => {
      rows.push([`Google Ad ${i + 1}`, '', `${ad.headline} | ${ad.description}`, String(ad.headline.length + ad.description.length)]);
    });
  }
  if (c.metaAd) {
    rows.push(['Meta Ad', '', `${c.metaAd.primaryText} | ${c.metaAd.headline} | ${c.metaAd.description}`, '']);
  }

  if (c.zillow) {
    rows.push(['Zillow', 'professional', c.zillow, String(c.zillow.length)]);
  }
  if (c.realtorCom) {
    rows.push(['Realtor.com', 'professional', c.realtorCom, String(c.realtorCom.length)]);
  }
  if (c.homesComTrulia) {
    rows.push(['Homes.com/Trulia', 'professional', c.homesComTrulia, String(c.homesComTrulia.length)]);
  }

  if (c.mlsDescription) {
    rows.push(['MLS Description', 'professional', c.mlsDescription, String(c.mlsDescription.length)]);
  }
  rows.push(['Hashtags', '', c.hashtags.join(' '), String(c.hashtags.length)]);

  return rows;
}
