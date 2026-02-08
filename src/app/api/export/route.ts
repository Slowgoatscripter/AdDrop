import { NextRequest, NextResponse } from 'next/server';
import { CampaignKit } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign, format } = body as { campaign: CampaignKit; format: 'pdf' | 'csv' | 'json' };

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign data is required' }, { status: 400 });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(campaign, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="campaign-${campaign.id}.json"`,
        },
      });
    }

    if (format === 'csv') {
      const rows = buildCsvRows(campaign);
      const csv = rows.map((r) => r.map(escCsv).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="campaign-${campaign.id}.csv"`,
        },
      });
    }

    // PDF
    const { generatePdfBuffer } = await import('@/lib/export/generate-pdf');
    const pdfBuffer = await generatePdfBuffer(campaign);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="campaign-${campaign.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
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

  for (const tone of ['professional', 'casual', 'luxury'] as const) {
    rows.push(['Instagram', tone, c.instagram[tone], String(c.instagram[tone].length)]);
    rows.push(['Facebook', tone, c.facebook[tone], String(c.facebook[tone].length)]);
  }
  rows.push(['Twitter/X', '', c.twitter, String(c.twitter.length)]);

  c.googleAds.forEach((ad, i) => {
    rows.push([`Google Ad ${i + 1}`, '', `${ad.headline} | ${ad.description}`, String(ad.headline.length + ad.description.length)]);
  });
  rows.push(['Meta Ad', '', `${c.metaAd.primaryText} | ${c.metaAd.headline} | ${c.metaAd.description}`, '']);

  rows.push(['Zillow', 'professional', c.zillow, String(c.zillow.length)]);
  rows.push(['Realtor.com', 'professional', c.realtorCom, String(c.realtorCom.length)]);
  rows.push(['Homes.com/Trulia', 'professional', c.homesComTrulia, String(c.homesComTrulia.length)]);

  rows.push(['MLS Description', 'professional', c.mlsDescription, String(c.mlsDescription.length)]);
  rows.push(['Hashtags', '', c.hashtags.join(' '), String(c.hashtags.length)]);

  return rows;
}
