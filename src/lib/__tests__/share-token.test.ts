/**
 * @jest-environment node
 */

import { getOrCreateShareToken } from '@/lib/share-token';

// ── Helpers ────────────────────────────────────────────────────────────
function buildMockSupabase(overrides: {
  selectData?: { share_token: string | null; share_expires_at: string | null } | null;
  selectError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const {
    selectData = null,
    selectError = null,
    updateError = null,
  } = overrides;

  const singleSelect = jest.fn().mockResolvedValue({
    data: selectData,
    error: selectError,
  });

  // Supabase's query builder is thenable — awaiting the chain resolves to { data, error }.
  // We simulate this by making updateChain implement .then() so `await ...eq().eq()` works.
  const updateResolved = { data: null, error: updateError ?? null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateChain: any = {
    eq: jest.fn(),
    then: (res: (v: typeof updateResolved) => unknown, _rej?: unknown) =>
      Promise.resolve(updateResolved).then(res),
  };
  updateChain.eq.mockReturnValue(updateChain);

  const update = jest.fn().mockReturnValue(updateChain);

  // The helper calls supabase.from() twice:
  //   1. .from('campaigns').select(...).eq(...).eq(...).single()  → for the read
  //   2. .from('campaigns').update(...).eq(...).eq(...)           → for the write
  // We need from() to return an object that supports both select and update.
  const fromReturnValue = {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: singleSelect,
        }),
      }),
    }),
    update,
  };

  const from = jest.fn().mockReturnValue(fromReturnValue);

  return { from, _singleSelect: singleSelect, _update: update };
}

// ── Tests ──────────────────────────────────────────────────────────────
describe('getOrCreateShareToken', () => {
  const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = 'user-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reuses existing valid (non-expired) token', async () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days out
    const supabase = buildMockSupabase({
      selectData: { share_token: 'existing-uuid', share_expires_at: futureDate },
    });

    const result = await getOrCreateShareToken(
      supabase as any,
      CAMPAIGN_ID,
      USER_ID,
    );

    expect(result.shareToken).toBe('existing-uuid');
    expect(result.expiresAt).toBe(futureDate);
    expect(result.reused).toBe(true);
    // Should NOT have called update
    expect(supabase._update).not.toHaveBeenCalled();
  });

  test('generates new token when none exists (share_token is null)', async () => {
    const supabase = buildMockSupabase({
      selectData: { share_token: null, share_expires_at: null },
    });

    const result = await getOrCreateShareToken(
      supabase as any,
      CAMPAIGN_ID,
      USER_ID,
    );

    expect(result.shareToken).toBeDefined();
    expect(result.shareToken).not.toBe('');
    expect(result.reused).toBe(false);
    // Should have called update to write the new token
    expect(supabase._update).toHaveBeenCalledTimes(1);
  });

  test('generates new token when existing token is expired', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    const supabase = buildMockSupabase({
      selectData: { share_token: 'old-expired-uuid', share_expires_at: pastDate },
    });

    const result = await getOrCreateShareToken(
      supabase as any,
      CAMPAIGN_ID,
      USER_ID,
    );

    expect(result.shareToken).not.toBe('old-expired-uuid');
    expect(result.reused).toBe(false);
    expect(supabase._update).toHaveBeenCalledTimes(1);
  });

  test('generates new token when share_expires_at is null but share_token exists', async () => {
    const supabase = buildMockSupabase({
      selectData: { share_token: 'orphan-token', share_expires_at: null },
    });

    const result = await getOrCreateShareToken(
      supabase as any,
      CAMPAIGN_ID,
      USER_ID,
    );

    expect(result.reused).toBe(false);
    expect(supabase._update).toHaveBeenCalledTimes(1);
  });

  test('throws when supabase update fails', async () => {
    const supabase = buildMockSupabase({
      selectData: { share_token: null, share_expires_at: null },
      updateError: { message: 'DB write failed' },
    });

    await expect(
      getOrCreateShareToken(supabase as any, CAMPAIGN_ID, USER_ID),
    ).rejects.toThrow('Failed to generate share token');
  });

  test('respects custom expiryMs parameter', async () => {
    const supabase = buildMockSupabase({
      selectData: { share_token: null, share_expires_at: null },
    });

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const beforeCall = Date.now();

    const result = await getOrCreateShareToken(
      supabase as any,
      CAMPAIGN_ID,
      USER_ID,
      twoHoursMs,
    );

    const expiresAtMs = new Date(result.expiresAt).getTime();
    // Should expire roughly 2 hours from now (within 5-second tolerance)
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeCall + twoHoursMs - 5000);
    expect(expiresAtMs).toBeLessThanOrEqual(beforeCall + twoHoursMs + 5000);
  });

  test('passes correct campaignId and userId to supabase queries', async () => {
    const supabase = buildMockSupabase({
      selectData: { share_token: null, share_expires_at: null },
    });

    await getOrCreateShareToken(supabase as any, CAMPAIGN_ID, USER_ID);

    // Verify from('campaigns') was called
    expect(supabase.from).toHaveBeenCalledWith('campaigns');
  });
});
