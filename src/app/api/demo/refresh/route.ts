import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAction } from '@/lib/supabase/auth-helpers';
import { refreshDemoCache, seedDemoCache } from '@/lib/demo/cache';

export async function POST(request: NextRequest) {
  try {
    await requireAdminAction();

    const body = await request.json().catch(() => ({}));
    const { propertyId } = body as { propertyId?: string };

    if (propertyId) {
      await refreshDemoCache(propertyId);
      return NextResponse.json({ success: true, refreshed: propertyId });
    } else {
      await seedDemoCache();
      return NextResponse.json({ success: true, refreshed: 'all' });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Not authenticated') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Not authorized') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('[demo refresh API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
