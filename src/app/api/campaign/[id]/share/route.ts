import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { randomUUID } from 'crypto';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXPIRY_MAP: Record<string, number> = {
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const expiry = body.expiry || '7d';
    const expiryMs = EXPIRY_MAP[expiry] || EXPIRY_MAP['7d'];

    const shareToken = randomUUID();
    const shareExpiresAt = new Date(Date.now() + expiryMs).toISOString();

    const { error } = await supabase
      .from('campaigns')
      .update({ share_token: shareToken, share_expires_at: shareExpiresAt })
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''}/share/${shareToken}`;

    return NextResponse.json({
      shareToken,
      shareUrl,
      expiresAt: shareExpiresAt,
    });
  } catch (error) {
    console.error('Share link error:', error);
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('campaigns')
      .update({ share_token: null, share_expires_at: null })
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke share link error:', error);
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
