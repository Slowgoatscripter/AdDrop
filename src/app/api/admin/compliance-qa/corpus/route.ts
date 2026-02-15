import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const is_clean = searchParams.get('is_clean');

    let query = supabase
      .from('compliance_test_ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    if (is_clean !== null) {
      query = query.eq('is_clean', is_clean === 'true');
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch corpus error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test ads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { state, name, text, is_clean, platform, expected_violations } = body;

    if (!state || !name || !text) {
      return NextResponse.json(
        { error: 'state, name, and text are required' },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('compliance_test_ads')
      .insert({
        state: state.toUpperCase(),
        name,
        text,
        is_clean: is_clean || false,
        platform: platform || 'general',
        expected_violations: expected_violations || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create test ad error:', error);
    return NextResponse.json(
      { error: 'Failed to create test ad' },
      { status: 500 }
    );
  }
}
