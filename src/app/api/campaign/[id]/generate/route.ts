import { NextRequest, NextResponse } from 'next/server';
import { PlatformId, ALL_PLATFORMS } from '@/lib/types';
import { generateCampaign } from '@/lib/ai/generate';
import { requireAuth } from '@/lib/supabase/auth-helpers';

// How long (ms) a generation_started_at lock is considered valid before allowing a retry.
// If a generate request is older than this, it is treated as stale and a new attempt is permitted.
const GENERATION_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  // Fetch the campaign row and confirm ownership
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, user_id, status, listing_data, platform, generation_started_at')
    .eq('id', id)
    .single();

  if (fetchError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.user_id !== user!.id) {
    // Return 404 rather than 403 to avoid leaking campaign existence to other users
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Only process campaigns in 'generating' status
  if (campaign.status !== 'generating') {
    return NextResponse.json(
      { error: 'Campaign is not in generating status', status: campaign.status },
      { status: 409 }
    );
  }

  // Double-trigger guard: if generation_started_at is set and within TTL, reject
  if (campaign.generation_started_at) {
    const startedAt = new Date(campaign.generation_started_at).getTime();
    const age = Date.now() - startedAt;
    if (age < GENERATION_LOCK_TTL_MS) {
      return NextResponse.json(
        { error: 'Generation already in progress', code: 'ALREADY_GENERATING' },
        { status: 409 }
      );
    }
    // Lock is stale — allow retry to proceed (will overwrite generation_started_at below)
  }

  // Claim the generation slot atomically by stamping generation_started_at
  const { error: claimError } = await supabase
    .from('campaigns')
    .update({ generation_started_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'generating'); // guard: only claim if still in generating state

  if (claimError) {
    console.error('[campaign/generate] Failed to claim generation slot:', claimError);
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }

  // Resolve listing and platforms from the stored row
  const listing = campaign.listing_data;

  let platforms: PlatformId[] | undefined;
  if (campaign.platform && campaign.platform !== 'all') {
    const stored = campaign.platform.split(',').map((p: string) => p.trim()) as PlatformId[];
    // Filter out any values that are not valid PlatformId entries
    const validSet = new Set<string>(ALL_PLATFORMS);
    const filtered = stored.filter((p: string) => validSet.has(p)) as PlatformId[];
    platforms = filtered.length > 0 ? filtered : undefined;
  }
  // undefined platforms means generateCampaign will use ALL_PLATFORMS

  if (!process.env.OPENAI_API_KEY) {
    await supabase
      .from('campaigns')
      .update({ status: 'failed', error_message: 'OpenAI API key not configured' })
      .eq('id', id);

    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    // Run the heavy AI pipeline
    const generatedCampaign = await generateCampaign(listing, platforms);

    // Persist the result
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        generated_ads: generatedCampaign,
        status: 'generated',
      })
      .eq('id', id);

    if (updateError) {
      console.error('[campaign/generate] Failed to persist generated campaign:', updateError);
      // Attempt to mark as failed so the row is not stuck in 'generating'
      await supabase
        .from('campaigns')
        .update({ status: 'failed', error_message: 'Failed to save generated campaign' })
        .eq('id', id);

      return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: generatedCampaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    console.error('[campaign/generate] AI generation error:', error);

    // Mark the row as failed so polling can surface a clean error state
    await supabase
      .from('campaigns')
      .update({ status: 'failed', error_message: message })
      .eq('id', id);

    return NextResponse.json({ error: 'Generation failed', details: message }, { status: 500 });
  }
}
