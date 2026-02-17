import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const runId = searchParams.get('id');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    if (runId) {
      const { data: run, error } = await supabase
        .from('compliance_test_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(run);
    }

    let query = supabase
      .from('compliance_test_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(limit);

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data: runs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: runs?.length ?? 0,
      runs: runs ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch compliance results' },
      { status: 500 }
    );
  }
}
