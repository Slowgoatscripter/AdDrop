import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAdmin();
    if (error) return error;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Build query
    let query = supabase
      .from('compliance_test_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(limit);

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data: runs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch test runs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ runs: runs || [] });
  } catch (error) {
    console.error('Fetch runs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test runs' },
      { status: 500 }
    );
  }
}
