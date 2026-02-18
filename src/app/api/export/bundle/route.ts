import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { CampaignKit } from '@/lib/types';
import { generateBundle } from '@/lib/export/bundle';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, shareToken } = body as { campaignId: string; shareToken?: string };

    if (!campaignId || !uuidRegex.test(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    let campaign: CampaignKit;

    if (shareToken) {
      const supabase = await createClient();
      const { data: row, error } = await supabase
        .from('campaigns')
        .select('generated_ads')
        .eq('id', campaignId)
        .eq('share_token', shareToken)
        .gt('share_expires_at', new Date().toISOString())
        .single();
      if (error || !row) {
        return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 401 });
      }
      campaign = row.generated_ads as CampaignKit;
    } else {
      const { user, supabase, error: authError } = await requireAuth();
      if (authError) return authError;
      const { data: row, error } = await supabase
        .from('campaigns')
        .select('generated_ads')
        .eq('id', campaignId)
        .eq('user_id', user!.id)
        .single();
      if (error || !row) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      campaign = row.generated_ads as CampaignKit;
    }

    const zipBuffer = await generateBundle(campaign);

    const address = campaign.listing?.address?.street?.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'Campaign';

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${address}.zip"`,
      },
    });
  } catch (error) {
    console.error('Bundle export error:', error);
    return NextResponse.json({ error: 'Bundle export failed' }, { status: 500 });
  }
}
