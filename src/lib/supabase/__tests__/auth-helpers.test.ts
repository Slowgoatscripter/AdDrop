/**
 * @jest-environment node
 */

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Polyfill Web APIs for Next.js
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextEncoder, TextDecoder })

if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici')
  Object.assign(global, { Request, Response, Headers, fetch: async () => new Response() })
}

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireMFA, requireAdminAction } from '../auth-helpers'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function buildMockSupabase(overrides: {
  user?: object | null
  authError?: object | null
  profileRole?: string | null
  profileError?: object | null
  currentLevel?: string | null
  nextLevel?: string | null
  aalError?: object | null
} = {}) {
  const {
    user = { id: 'user-123', email: 'admin@example.com' },
    authError = null,
    profileRole = 'admin',
    profileError = null,
    currentLevel = 'aal2',
    nextLevel = 'aal2',
    aalError = null,
  } = overrides

  const mockGetAuthenticatorAssuranceLevel = jest.fn().mockResolvedValue({
    data: aalError ? null : { currentLevel, nextLevel },
    error: aalError,
  })

  const mockFrom = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: profileError ? null : (profileRole !== null ? { role: profileRole } : null),
      error: profileError,
    }),
  })

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authError ? null : user },
        error: authError,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel,
      },
    },
    from: mockFrom,
  }

  return mockSupabase
}

describe('requireAdmin()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    const mockSupabase = buildMockSupabase({ authError: { message: 'Not authenticated' } })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result.user).toBeNull()
    expect(result.error).not.toBeNull()
    const response = result.error as Response
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Authentication required')
  })

  it('returns 401 when user is null without error', async () => {
    const mockSupabase = buildMockSupabase({ user: null })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result.user).toBeNull()
    expect(result.error).not.toBeNull()
    const response = result.error as Response
    expect(response.status).toBe(401)
  })

  it('returns 403 when user role is not admin', async () => {
    const mockSupabase = buildMockSupabase({ profileRole: 'user' })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result.user).toBeNull()
    expect(result.error).not.toBeNull()
    const response = result.error as Response
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when profile does not exist', async () => {
    const mockSupabase = buildMockSupabase({ profileRole: null })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result.user).toBeNull()
    const response = result.error as Response
    expect(response.status).toBe(403)
  })

  it('returns 403 when MFA level is not aal2', async () => {
    const mockSupabase = buildMockSupabase({ currentLevel: 'aal1' })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result.user).toBeNull()
    expect(result.error).not.toBeNull()
    const response = result.error as Response
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('MFA required')
  })

  it('returns user and supabase with null error for valid admin with MFA', async () => {
    const adminUser = { id: 'admin-123', email: 'admin@example.com' }
    const mockSupabase = buildMockSupabase({ user: adminUser })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result.error).toBeNull()
    expect(result.user).toEqual(adminUser)
    expect(result.supabase).toBeDefined()
  })

  it('returns the same shape as requireAuth (user, supabase, error)', async () => {
    const mockSupabase = buildMockSupabase()
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdmin()

    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('supabase')
    expect(result).toHaveProperty('error')
  })
})

describe('requireMFA()', () => {
  it('returns verified:true when currentLevel is aal2', async () => {
    const mockSupabase = buildMockSupabase({ currentLevel: 'aal2', nextLevel: 'aal2' })

    const result = await requireMFA(mockSupabase as any)

    expect(result.verified).toBe(true)
  })

  it('returns verified:false, enrolled:true when enrolled but not verified this session', async () => {
    const mockSupabase = buildMockSupabase({ currentLevel: 'aal1', nextLevel: 'aal2' })

    const result = await requireMFA(mockSupabase as any)

    expect(result.verified).toBe(false)
    expect((result as { verified: false; enrolled: boolean }).enrolled).toBe(true)
  })

  it('returns verified:false, enrolled:false when no MFA factors enrolled', async () => {
    const mockSupabase = buildMockSupabase({ currentLevel: 'aal1', nextLevel: 'aal1' })

    const result = await requireMFA(mockSupabase as any)

    expect(result.verified).toBe(false)
    expect((result as { verified: false; enrolled: boolean }).enrolled).toBe(false)
  })

  it('returns verified:false when aalData is null (API error — safe default)', async () => {
    const mockSupabase = buildMockSupabase({ aalError: { message: 'MFA API error' } })

    const result = await requireMFA(mockSupabase as any)

    expect(result.verified).toBe(false)
    expect((result as { verified: false; enrolled: boolean }).enrolled).toBe(false)
  })
})

describe('requireAdminAction()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws Not authenticated when user is null', async () => {
    const mockSupabase = buildMockSupabase({ user: null })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    await expect(requireAdminAction()).rejects.toThrow('Not authenticated')
  })

  it('throws Not authenticated when auth errors', async () => {
    const mockSupabase = buildMockSupabase({ authError: { message: 'session expired' } })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    await expect(requireAdminAction()).rejects.toThrow('Not authenticated')
  })

  it('throws Not authorized when user role is not admin', async () => {
    const mockSupabase = buildMockSupabase({ profileRole: 'user' })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    await expect(requireAdminAction()).rejects.toThrow('Not authorized')
  })

  it('throws MFA required when currentLevel is not aal2', async () => {
    const mockSupabase = buildMockSupabase({ currentLevel: 'aal1', nextLevel: 'aal2' })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    await expect(requireAdminAction()).rejects.toThrow('MFA required')
  })

  it('throws MFA required when aalData is null (API error)', async () => {
    const mockSupabase = buildMockSupabase({ aalError: { message: 'MFA error' } })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    await expect(requireAdminAction()).rejects.toThrow('MFA required')
  })

  it('returns user, supabase, profile for valid admin with verified MFA', async () => {
    const adminUser = { id: 'admin-123', email: 'admin@example.com' }
    const mockSupabase = buildMockSupabase({ user: adminUser, currentLevel: 'aal2', nextLevel: 'aal2' })
    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await requireAdminAction()

    expect(result.user).toEqual(adminUser)
    expect(result.supabase).toBeDefined()
    expect(result.profile).toBeDefined()
  })
})
