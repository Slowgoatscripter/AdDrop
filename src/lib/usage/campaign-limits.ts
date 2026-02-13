import type { SupabaseClient } from '@supabase/supabase-js';

export interface CampaignUsage {
  isLimited: boolean;
  resetsAt: Date;
  used: number;
  limit: number;
  isExempt: boolean;
}

/**
 * Get the current campaign usage for a user during the beta period.
 * Beta users are limited to a set number of campaigns per week.
 */
export async function getCampaignUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<CampaignUsage> {
  const WEEKLY_LIMIT = 2;

  // Check if user is exempt from rate limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('rate_limit_exempt')
    .eq('id', userId)
    .single();

  if (profile?.rate_limit_exempt) {
    return {
      isLimited: false,
      resetsAt: getNextMonday(),
      used: 0,
      limit: WEEKLY_LIMIT,
      isExempt: true,
    };
  }

  // Count campaigns created this week
  const weekStart = getWeekStart();
  const { count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString());

  const used = count ?? 0;

  return {
    isLimited: used >= WEEKLY_LIMIT,
    resetsAt: getNextMonday(),
    used,
    limit: WEEKLY_LIMIT,
    isExempt: false,
  };
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getNextMonday(): Date {
  const monday = getWeekStart();
  monday.setDate(monday.getDate() + 7);
  return monday;
}
