import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
// TODO: update for new compliance QA types — this route will be fully rewritten in Task 10
import type { RunRequest, RunResponse } from '@/lib/types/compliance-qa';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const body: RunRequest = await request.json().catch(() => ({} as any));
    const { state } = body;

    const startTime = Date.now();

    // Fetch test ads from database
    let query = supabase
      .from('compliance_test_ads')
      .select('id, name, state, text, expected_violations, is_clean');

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data: ads, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch test ads' },
        { status: 500 }
      );
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json(
        { error: 'No test ads found' },
        { status: 404 }
      );
    }

    const durationMs = Date.now() - startTime;

    // TODO: rewrite to use new compliance agent pipeline (Task 10)
    // For now return a stub response to unblock the build
    const response: any = {
      runId: 'stub',
      summary: {
        totalProperties: ads.length,
        passed: 0,
        failed: 0,
        totalViolationsFound: 0,
        totalAutoFixes: 0,
        averageViolationsPerProperty: 0,
      },
      results: [],
      durationMs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Run error:', error);
    return NextResponse.json(
      { error: 'Failed to run test suite' },
      { status: 500 }
    );
  }
}
