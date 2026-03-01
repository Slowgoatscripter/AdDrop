import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ShareTokenResult {
  shareToken: string;
  expiresAt: string;
  reused: boolean;
}

/**
 * Returns an existing valid share token for the given campaign,
 * or generates and persists a new one if none exists or the current one is expired.
 */
export async function getOrCreateShareToken(
  supabase: SupabaseClient,
  campaignId: string,
  userId: string,
  expiryMs: number = DEFAULT_EXPIRY_MS,
): Promise<ShareTokenResult> {
  // 1. Check for an existing valid token
  const { data: existing } = await supabase
    .from('campaigns')
    .select('share_token, share_expires_at')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (
    existing?.share_token &&
    existing.share_expires_at &&
    new Date(existing.share_expires_at) > new Date()
  ) {
    return {
      shareToken: existing.share_token,
      expiresAt: existing.share_expires_at,
      reused: true,
    };
  }

  // 2. Generate and write a new token
  const newToken = randomUUID();
  const newExpiresAt = new Date(Date.now() + expiryMs).toISOString();

  const { error } = await supabase
    .from('campaigns')
    .update({ share_token: newToken, share_expires_at: newExpiresAt })
    .eq('id', campaignId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to generate share token');
  }

  return {
    shareToken: newToken,
    expiresAt: newExpiresAt,
    reused: false,
  };
}
