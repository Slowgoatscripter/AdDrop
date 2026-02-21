import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { scanTextWithAgent } from '@/lib/compliance/agent';
import { getComplianceSettings } from '@/lib/compliance/compliance-settings';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { text, state, platform } = body;

    if (!text || !state) {
      return NextResponse.json(
        { error: 'text and state are required' },
        { status: 400 }
      );
    }

    const { config } = await getComplianceSettings(state);
    const result = await scanTextWithAgent(text, state, platform, config);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan ad' },
      { status: 500 }
    );
  }
}
