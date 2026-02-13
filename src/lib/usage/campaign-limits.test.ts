import { getCampaignUsage, BETA_CAMPAIGN_LIMIT, BETA_WINDOW_DAYS } from './campaign-limits'

type MockConfig = {
  profile: { role?: string; rate_limit_exempt?: boolean } | null
  count: number
  oldestCreatedAt?: string
}

function createSupabaseMock(config: MockConfig) {
  return {
    from: (table: string) => ({
      select: (_fields: string, options?: { count?: string; head?: boolean }) => {
        if (table === 'profiles') {
          return {
            eq: () => ({
              single: async () => ({ data: config.profile }),
            }),
          }
        }

        if (table === 'campaigns' && options?.head) {
          return {
            eq: () => ({
              gte: async () => ({ count: config.count }),
            }),
          }
        }

        if (table === 'campaigns') {
          return {
            eq: () => ({
              gte: () => ({
                order: () => ({
                  limit: () => ({
                    single: async () => ({
                      data: config.oldestCreatedAt
                        ? { created_at: config.oldestCreatedAt }
                        : null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }

        throw new Error(`Unexpected table in mock: ${table}`)
      },
    }),
  }
}

describe('getCampaignUsage', () => {
  test('returns exempt usage for admin users', async () => {
    const supabase = createSupabaseMock({
      profile: { role: 'admin', rate_limit_exempt: false },
      count: 99,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-1')

    expect(usage.isExempt).toBe(true)
    expect(usage.isLimited).toBe(false)
    expect(usage.used).toBe(0)
    expect(usage.limit).toBe(Infinity)
    expect(usage.remaining).toBe(Infinity)
    expect(usage.resetsAt).toBeNull()
  })

  test('returns regular usage when under limit', async () => {
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: false },
      count: 1,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-2')

    expect(usage.isExempt).toBe(false)
    expect(usage.isLimited).toBe(false)
    expect(usage.used).toBe(1)
    expect(usage.limit).toBe(BETA_CAMPAIGN_LIMIT)
    expect(usage.remaining).toBe(BETA_CAMPAIGN_LIMIT - 1)
    expect(usage.resetsAt).toBeNull()
  })

  test('computes reset timestamp when user is limited', async () => {
    const oldest = '2026-02-01T12:00:00.000Z'
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: false },
      count: 3,
      oldestCreatedAt: oldest,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-3')

    expect(usage.isLimited).toBe(true)
    expect(usage.used).toBe(3)
    expect(usage.remaining).toBe(0)
    expect(usage.resetsAt).not.toBeNull()
    expect(usage.resetsAt?.toISOString()).toBe(
      new Date(new Date(oldest).getTime() + BETA_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    )
  })
})
