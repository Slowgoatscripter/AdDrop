import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { Resend } from 'resend';
import { z } from 'zod';
import { CampaignKit } from '@/lib/types';
import { getOrCreateShareToken } from '@/lib/share-token';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailSchema = z.string().email();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    const invalidEmails = to.filter(email => !emailSchema.safeParse(email.trim()).success);
    if (invalidEmails.length > 0) {
      console.warn('Invalid recipient emails:', invalidEmails);
      return NextResponse.json(
        { error: 'One or more recipients are invalid' },
        { status: 400 },
      );
    }

    // Fetch campaign
    const { data: row, error } = await supabase
      .from('campaigns')
      .select('generated_ads')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = row.generated_ads as CampaignKit;

    // Reuse existing valid share token, or generate a new one
    const { shareToken } = await getOrCreateShareToken(supabase, id, user!.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
    const shareUrl = `${appUrl}/share/${shareToken}`;
    const address = campaign.listing?.address;
    const addressStr = address ? `${address.street}, ${address.city}, ${address.state} ${address.zip}` : 'Property Campaign';
    const platforms = campaign.selectedPlatforms?.join(', ') || 'Multiple platforms';
    const heroPhoto = campaign.listing?.photos?.[0];

    // Send emails individually
    const resend = new Resend(process.env.RESEND_API_KEY);
    const results = await Promise.allSettled(
      to.map(email =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'campaigns@yourdomain.com',
          to: email.trim(),
          subject: `Campaign: ${addressStr}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              ${heroPhoto ? `<img src="${escapeHtml(heroPhoto)}" alt="${escapeHtml(addressStr)}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />` : ''}
              <h2>${escapeHtml(addressStr)}</h2>
              ${campaign.listing?.price ? `<p style="font-size: 18px; color: #16a34a;">$${escapeHtml(campaign.listing.price.toLocaleString())}</p>` : ''}
              ${campaign.listing ? `<p>${escapeHtml(String(campaign.listing.beds))} bed &middot; ${escapeHtml(String(campaign.listing.baths))} bath &middot; ${escapeHtml(campaign.listing.sqft?.toLocaleString() ?? '')} sqft</p>` : ''}
              ${message ? `<p style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">${escapeHtml(message)}</p>` : ''}
              <p><strong>Platforms:</strong> ${escapeHtml(platforms)}</p>
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
