import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const is_seed = searchParams.get('is_seed');

    let query = supabase
      .from('compliance_test_properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    if (is_seed !== null) {
      query = query.eq('is_seed', is_seed === 'true');
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
      { error: 'Failed to fetch test properties' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { name, state, listing_data, risk_category, is_seed, tags } = body;

    if (!name || !state || !listing_data || !risk_category) {
      return NextResponse.json(
        { error: 'name, state, listing_data, and risk_category are required' },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('compliance_test_properties')
      .insert({
        name,
        state: state.toUpperCase(),
        listing_data,
        risk_category,
        is_seed: is_seed || false,
        tags: tags || [],
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
    console.error('Create test property error:', error);
    return NextResponse.json(
      { error: 'Failed to create test property' },
      { status: 500 }
    );
  }
}
