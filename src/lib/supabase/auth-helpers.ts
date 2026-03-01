import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Canonical MFA check — single source of truth for all admin MFA enforcement.
 * Uses `currentLevel === 'aal2'` as the definitive gate.
 * Returns `enrolled` flag so callers can distinguish "needs challenge" from "needs enrollment".
 */
export type MFAResult =
  | { verified: true }
  | { verified: false; enrolled: boolean }

export async function requireMFA(
  supabase: SupabaseClient
): Promise<MFAResult> {
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aalData?.currentLevel === 'aal2') {
    return { verified: true }
  }

  // enrolled = user has a TOTP factor but hasn't verified this session
  const enrolled = aalData?.nextLevel === 'aal2'
  return { verified: false, enrolled }
}

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase, error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  return { user, supabase, error: null }
}

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase, error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { user: null, supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // Enforce MFA (AAL2) for admin API actions
  const mfa = await requireMFA(supabase)
  if (!mfa.verified) {
    return { user: null, supabase, error: NextResponse.json({ error: 'MFA required' }, { status: 403 }) }
  }

  return { user, supabase, error: null }
}

export async function requireAdminAction() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')

  // Enforce MFA (AAL2) for admin Server Actions
  const mfa = await requireMFA(supabase)
  if (!mfa.verified) throw new Error('MFA required')

  return { user, supabase, profile }
}
