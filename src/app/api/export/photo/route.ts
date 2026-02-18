import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { resizePhoto } from '@/lib/export/photo-resize';
import { PLATFORM_DIMENSIONS, isAllowedPhotoUrl } from '@/lib/export/platform-dimensions';

export async function POST(request: NextRequest) {
  try {
    // Dual-auth: session OR share token
    const body = await request.json();
    const { photoUrl, platform, shareToken } = body as {
      photoUrl: string;
      platform: string;
      shareToken?: string;
    };

    // Auth check
    if (shareToken) {
      const supabase = await createClient();
      const { data: row } = await supabase
        .from('campaigns')
        .select('id')
        .eq('share_token', shareToken)
        .gt('share_expires_at', new Date().toISOString())
        .single();
      if (!row) {
        return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 401 });
      }
    } else {
      const { error: authError } = await requireAuth();
      if (authError) return authError;
    }

    // Validate photo URL (SSRF protection)
    if (!photoUrl || !isAllowedPhotoUrl(photoUrl)) {
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
    }

    // Find dimension config
    const dimension = PLATFORM_DIMENSIONS.find(d => d.platform === platform);
    if (!dimension) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const result = await resizePhoto(photoUrl, dimension);

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Photo export error:', error);
    return NextResponse.json({ error: 'Photo export failed' }, { status: 500 });
  }
}
