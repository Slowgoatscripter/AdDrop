import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = {
      ...body,
    };

    if (updateData.state) {
      updateData.state = updateData.state.toUpperCase();
    }

    const { data, error: updateError } = await supabase
      .from('compliance_test_properties')
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
        { error: 'Test property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update test property error:', error);
    return NextResponse.json(
      { error: 'Failed to update test property' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const { error: deleteError } = await supabase
      .from('compliance_test_properties')
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
    console.error('Delete test property error:', error);
    return NextResponse.json(
      { error: 'Failed to delete test property' },
      { status: 500 }
    );
  }
}
