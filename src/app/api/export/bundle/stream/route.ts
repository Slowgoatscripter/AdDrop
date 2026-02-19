import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { CampaignKit } from '@/lib/types';
import { generateBundle, type BundleProgress } from '@/lib/export/bundle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');

  if (!campaignId || !uuidRegex.test(campaignId)) {
    return new Response(JSON.stringify({ error: 'Invalid campaign ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data: row, error } = await supabase
    .from('campaigns')
    .select('generated_ads')
    .eq('id', campaignId)
    .eq('user_id', user!.id)
    .single();

  if (error || !row) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const campaign = row.generated_ads as CampaignKit;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      // Disable EventSource auto-reconnect
      controller.enqueue(encoder.encode('retry: 0\n\n'));

      try {
        const onProgress = (progress: BundleProgress) => {
          sendEvent('progress', progress);
        };

        const zipBuffer = await generateBundle(campaign, onProgress);

        // Clean up stale temp exports for this user
        const userFolder = user!.id;
        const { data: existing } = await supabase.storage
          .from('temp-exports')
          .list(userFolder, { limit: 100 });

        if (existing && existing.length > 0) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const stale = existing.filter(f => new Date(f.created_at) < oneHourAgo);
          if (stale.length > 0) {
            await supabase.storage
              .from('temp-exports')
              .remove(stale.map(f => `${userFolder}/${f.name}`));
          }
        }

        // Upload ZIP to temp storage
        const filename = `${userFolder}/${campaignId}-${Date.now()}.zip`;
        const { error: uploadError } = await supabase.storage
          .from('temp-exports')
          .upload(filename, zipBuffer, {
            contentType: 'application/zip',
            upsert: true,
          });

        if (uploadError) {
          sendEvent('error', { message: 'Failed to prepare download file' });
          controller.close();
          return;
        }

        // Generate signed URL (1 hour)
        const { data: signedUrl, error: signError } = await supabase.storage
          .from('temp-exports')
          .createSignedUrl(filename, 3600);

        if (signError || !signedUrl) {
          sendEvent('error', { message: 'Failed to generate download link' });
          controller.close();
          return;
        }

        sendEvent('progress', {
          phase: 'done',
          detail: 'Ready',
          step: 5,
          totalSteps: 5,
          downloadUrl: signedUrl.signedUrl,
        });

        controller.close();
      } catch (err) {
        console.error('Bundle stream error:', err);
        sendEvent('error', {
          message: err instanceof Error ? err.message : 'Bundle generation failed',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
