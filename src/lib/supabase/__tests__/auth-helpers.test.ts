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
import { requireAdmin } from '../auth-helpers'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function buildMockSupabase(overrides: {
  user?: object | null
  authError?: object | null
  profileRole?: string | null
  profileError?: object | null
  currentLevel?: string | null
  aalError?: object | null
} = {}) {
  const {
    user = { id: 'user-123', email: 'admin@example.com' },
    authError = null,
    profileRole = 'admin',
    profileError = null,
    currentLevel = 'aal2',
    aalError = null,
  } = overrides

  const mockGetAuthenticatorAssuranceLevel = jest.fn().mockResolvedValue({
    data: aalError ? null : { currentLevel },
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
