import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { runTestSuite, runIsolationChecks } from '@/lib/compliance/qa-engine';
import { getComplianceConfig } from '@/lib/compliance/engine';
import type { RunRequest, RunResponse } from '@/lib/types/compliance-qa';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const body: RunRequest = await request.json().catch(() => ({}));
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

    // Determine available states with valid compliance configs
    const uniqueStates = Array.from(new Set(ads.map((ad) => ad.state)));
    const availableStates = uniqueStates.filter(
      (s) => getComplianceConfig(s) !== null
    );

    // Run test suite
    const { results, summary } = runTestSuite(ads);

    // Run cross-state isolation checks if multiple states available
    let crossState = null;
    if (availableStates.length >= 2) {
      crossState = runIsolationChecks(ads, availableStates);
    }

    const durationMs = Date.now() - startTime;

    // Store results in database
    const { data: run, error: insertError } = await supabase
      .from('compliance_test_runs')
      .insert({
        run_type: state ? 'single-state' : 'full-suite',
        state: state?.toUpperCase() || null,
        triggered_by: 'manual',
        run_by: user.id,
        duration_ms: durationMs,
        summary,
        results,
        cross_state: crossState,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to store run:', insertError);
      return NextResponse.json(
        { error: 'Failed to store test run' },
        { status: 500 }
      );
    }

    const response: RunResponse = {
      runId: run.id,
      summary,
      results,
      crossState: crossState || [],
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
