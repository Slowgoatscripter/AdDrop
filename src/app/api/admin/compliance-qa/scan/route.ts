import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { scanAd } from '@/lib/compliance/qa-engine';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { text, state, platform } = body;

    if (!text || !state) {
      return NextResponse.json(
        { error: 'text and state are required' },
        { status: 400 }
      );
    }

    const result = scanAd(
      text,
      state.toUpperCase(),
      platform || 'general'
    );

    if (result === null) {
      return NextResponse.json(
        { error: 'State configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan ad' },
      { status: 500 }
    );
  }
}
