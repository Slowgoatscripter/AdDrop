import { POST } from '../route';

jest.mock('@/lib/supabase/auth-helpers', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      }),
    },
    error: null,
  }),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'email-1' }) },
  })),
}));

jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      private body: string;
      constructor(_url: string, init?: { body?: string }) {
        this.body = init?.body ?? '';
      }
      async json() {
        return JSON.parse(this.body);
      }
    },
    NextResponse: {
      json(data: unknown, init?: { status?: number }) {
        return {
          status: init?.status ?? 200,
          async json() {
            return data;
          },
        };
      },
    },
  };
});

describe('Email route – error sanitization', () => {
  const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  test('returns generic message for invalid email and does NOT echo the address back', async () => {
    const maliciousEmail = '<script>alert("xss")</script>@evil.com';
    const request = {
      json: async () => ({ to: [maliciousEmail], message: 'test' }),
    };
    const params = {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }),
    };

    const response = await POST(request as any, params as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('One or more recipients are invalid');
    expect(json.error).not.toContain(maliciousEmail);
    expect(json.error).not.toContain('Invalid email:');
  });

  test('logs invalid email addresses server-side via console.warn', async () => {
    const badEmail = 'not-an-email';
    const request = {
      json: async () => ({ to: [badEmail] }),
    };
    const params = {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }),
    };

    await POST(request as any, params as any);

    expect(consoleSpy).toHaveBeenCalledWith('Invalid recipient emails:', [badEmail]);
  });
});
