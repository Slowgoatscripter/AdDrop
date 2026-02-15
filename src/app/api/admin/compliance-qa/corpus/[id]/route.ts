import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    if (updateData.state) {
      updateData.state = updateData.state.toUpperCase();
    }

    const { data, error: updateError } = await supabase
      .from('compliance_test_ads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Test ad not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update test ad error:', error);
    return NextResponse.json(
      { error: 'Failed to update test ad' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const { error: deleteError } = await supabase
      .from('compliance_test_ads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete test ad error:', error);
    return NextResponse.json(
      { error: 'Failed to delete test ad' },
      { status: 500 }
    );
  }
}
