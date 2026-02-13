'use server'

import { createClient } from '@/lib/supabase/server'
import {
  generateBackupCodes,
  storeBackupCodes,
  consumeBackupCode,
  getRemainingCount,
} from '@/lib/mfa/backup-codes'

export async function getMfaStatus() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', data: null }

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const remainingCodes = await getRemainingCount(supabase, user.id)

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return {
      data: {
        factors: factors?.totp ?? [],
        backupCodesRemaining: remainingCodes,
        isAdmin: profile?.role === 'admin',
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function enrollMfa() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', data: null }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator',
    })

    if (error) return { error: error.message, data: null }

    return {
      data: {
        id: data.id,
        totp: data.totp,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function verifyMfaEnrollment(factorId: string, code: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', data: null }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })

    if (error) return { error: error.message, data: null }

    return { data: { success: true }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function unenrollMfa(factorId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', data: null }

    const { error } = await supabase.auth.mfa.unenroll({ factorId })

    if (error) return { error: error.message, data: null }

    return { data: { success: true }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function generateNewBackupCodes() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', data: null }

    const codes = generateBackupCodes()
    await storeBackupCodes(supabase, user.id, codes)

    return { data: codes, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function verifyBackupCodeAction(code: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', data: null }

    const valid = await consumeBackupCode(supabase, user.id, code)
    if (!valid) return { error: 'Invalid or already used backup code', data: null }

    return { data: { success: true }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
