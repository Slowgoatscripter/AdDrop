import { getCampaignUsage } from './campaign-limits'
import { TIER_LIMITS } from '@/lib/stripe/config'

type MockConfig = {
  profile: { role?: string; rate_limit_exempt?: boolean; subscription_tier?: string } | null
  count: number
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

  test('returns exempt usage for rate_limit_exempt users', async () => {
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: true },
      count: 99,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-1')

    expect(usage.isExempt).toBe(true)
    expect(usage.isLimited).toBe(false)
  })

  test('defaults to free tier when no subscription_tier', async () => {
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: false },
      count: 1,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-2')

    expect(usage.isExempt).toBe(false)
    expect(usage.isLimited).toBe(false)
    expect(usage.used).toBe(1)
    expect(usage.limit).toBe(TIER_LIMITS.free.campaigns)
    expect(usage.remaining).toBe(TIER_LIMITS.free.campaigns - 1)
    expect(usage.resetsAt).toBeNull()
  })

  test('uses pro tier limit for pro subscribers', async () => {
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: false, subscription_tier: 'pro' },
      count: 5,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-2')

    expect(usage.limit).toBe(TIER_LIMITS.pro.campaigns)
    expect(usage.remaining).toBe(TIER_LIMITS.pro.campaigns - 5)
    expect(usage.isLimited).toBe(false)
  })

  test('is limited when at tier cap and resetsAt is 1st of next month', async () => {
    const freeLimit = TIER_LIMITS.free.campaigns
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: false, subscription_tier: 'free' },
      count: freeLimit,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-3')

    expect(usage.isLimited).toBe(true)
    expect(usage.used).toBe(freeLimit)
    expect(usage.remaining).toBe(0)
    expect(usage.resetsAt).not.toBeNull()

    // resetsAt should be the 1st of next month
    const now = new Date()
    const expectedReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    expect(usage.resetsAt?.toISOString()).toBe(expectedReset.toISOString())
  })

  test('resetsAt is null when under limit', async () => {
    const supabase = createSupabaseMock({
      profile: { role: 'user', rate_limit_exempt: false, subscription_tier: 'free' },
      count: 0,
    }) as never

    const usage = await getCampaignUsage(supabase, 'user-4')

    expect(usage.isLimited).toBe(false)
    expect(usage.resetsAt).toBeNull()
  })
})
