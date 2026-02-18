import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { Resend } from 'resend';
import { CampaignKit } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
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

    const body = await request.json();
    const { to, message } = body as { to: string[]; message?: string };

    // Validate recipients
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'At least one recipient required' }, { status: 400 });
    }
    if (to.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 recipients per send' }, { status: 400 });
    }
    for (const email of to) {
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
      }
    }

    // Fetch campaign
    const { data: row, error } = await supabase
      .from('campaigns')
      .select('generated_ads, share_token, share_expires_at')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = row.generated_ads as CampaignKit;

    // Auto-generate share link if needed
    let shareToken = row.share_token;
    if (!shareToken || new Date(row.share_expires_at) < new Date()) {
      const crypto = await import('crypto');
      shareToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('campaigns')
        .update({ share_token: shareToken, share_expires_at: expiresAt })
        .eq('id', id);
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${shareToken}`;
    const address = campaign.listing?.address;
    const addressStr = address ? `${address.street}, ${address.city}, ${address.state} ${address.zip}` : 'Property Campaign';
    const platforms = campaign.selectedPlatforms?.join(', ') || 'Multiple platforms';

    // Send emails individually
    const results = await Promise.allSettled(
      to.map(email =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'campaigns@yourdomain.com',
          to: email.trim(),
          subject: `Campaign: ${addressStr}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>${addressStr}</h2>
              ${campaign.listing?.price ? `<p style="font-size: 18px; color: #16a34a;">$${campaign.listing.price.toLocaleString()}</p>` : ''}
              ${campaign.listing ? `<p>${campaign.listing.beds} bed &middot; ${campaign.listing.baths} bath &middot; ${campaign.listing.sqft?.toLocaleString()} sqft</p>` : ''}
              ${message ? `<p style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">${message}</p>` : ''}
              <p><strong>Platforms:</strong> ${platforms}</p>
              <div style="margin: 24px 0;">
                <a href="${shareUrl}" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Campaign</a>
              </div>
              <p style="font-size: 12px; color: #888;">This link expires in 7 days.</p>
            </div>
          `,
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }
}
