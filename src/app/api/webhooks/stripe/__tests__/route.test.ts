/**
 * Tests that console.error calls in the Stripe webhook route log only
 * sanitized {code, message} objects, NOT full Supabase error objects
 * that may contain schema details (details, hint, schema, etc.).
 */

// A representative Supabase error with sensitive fields that must NOT appear in logs
const RICH_SUPABASE_ERROR = {
  code: 'PGRST116',
  message: 'The result contains 0 rows',
  details: 'Results contain 0 rows, application/vnd.pgrst.object+json requires 1 row',
  hint: null,
  schema: 'public',
};

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------

// Mock next/server (no Web APIs in Jest/jsdom)
jest.mock('next/server', () => ({
  NextRequest: class {
    private _text: string;
    constructor(_url: string, init?: { body?: string }) {
      this._text = init?.body ?? '';
    }
    async text() { return this._text; }
    get headers() {
      return { get: (key: string) => key === 'stripe-signature' ? 'sig_test' : null };
    }
  },
  NextResponse: {
    json(data: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, async json() { return data; } };
    },
  },
}));

// Supabase mock: idempotency check returns null (event not seen), then upsert errors
const mockSupabaseSingle = jest.fn();
const mockSupabaseInsert = jest.fn().mockResolvedValue({ error: null });
const mockSupabaseUpsert = jest.fn().mockResolvedValue({ error: RICH_SUPABASE_ERROR });

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () =>
            table === 'stripe_webhook_events'
              ? Promise.resolve({ data: null, error: null }) // not seen before
              : mockSupabaseSingle(),
        }),
      }),
      upsert: () => mockSupabaseUpsert(),
      update: () => ({ eq: () => Promise.resolve({ error: RICH_SUPABASE_ERROR }) }),
      insert: () => mockSupabaseInsert(),
    }),
  })),
}));

// Stripe mock: constructEvent succeeds, subscriptions.retrieve returns minimal subscription
const mockSubscriptionItem = {
  price: { id: 'price_test_123' },
  current_period_start: Math.floor(Date.now() / 1000) - 86400,
  current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
};
const mockStripeSubscription = {
  id: 'sub_test_123',
  customer: 'cus_test_123',
  status: 'active',
  cancel_at_period_end: false,
  items: { data: [mockSubscriptionItem] },
};

jest.mock('@/lib/stripe/client', () => ({
  getStripe: jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn((_body: string, _sig: string, _secret: string) => ({
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-test-123' },
            subscription: 'sub_test_123',
          },
        },
      })),
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
    },
  })),
}));

jest.mock('@/lib/stripe/config', () => ({
  getTierFromPriceId: jest.fn(() => 'pro'),
  getBillingCycleFromPriceId: jest.fn(() => 'monthly'),
}));

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

import { POST } from '../route';

describe('Stripe webhook route – console.error sanitization', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  test('console.error does NOT log the full Supabase error object (with details/hint/schema)', async () => {
    const body = JSON.stringify({ id: 'evt_test_123', type: 'checkout.session.completed' });
    const request = {
      text: async () => body,
      headers: { get: (key: string) => key === 'stripe-signature' ? 'sig_test' : null },
    };

    await POST(request as any);

    // console.error must have been called (the upsert failed)
    expect(consoleSpy).toHaveBeenCalled();

    // None of the console.error calls may contain the raw Supabase error object
    for (const call of consoleSpy.mock.calls) {
      for (const arg of call) {
        if (arg && typeof arg === 'object') {
          expect(arg).not.toHaveProperty('details');
          expect(arg).not.toHaveProperty('hint');
          expect(arg).not.toHaveProperty('schema');
        }
      }
    }
  });

  test('console.error logs an object with only code and message fields', async () => {
    const body = JSON.stringify({ id: 'evt_test_123', type: 'checkout.session.completed' });
    const request = {
      text: async () => body,
      headers: { get: (key: string) => key === 'stripe-signature' ? 'sig_test' : null },
    };

    await POST(request as any);

    // Find the console.error call that logged the subscriptions upsert error
    const errorCall = consoleSpy.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('subscriptions upsert failed'),
    );
    expect(errorCall).toBeDefined();

    const loggedError = errorCall![1];
    expect(loggedError).toEqual({ code: 'PGRST116', message: 'The result contains 0 rows' });
  });
});
