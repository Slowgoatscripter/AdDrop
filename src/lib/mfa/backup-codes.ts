import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { SupabaseClient } from '@supabase/supabase-js'

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(4)
    const hex = bytes.toString('hex').toUpperCase()
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
  })
}

export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code.replace('-', '').toUpperCase(), 10)
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.replace('-', '').toUpperCase(), hash)
}

// Store codes using service_role or server client
export async function storeBackupCodes(supabase: SupabaseClient, userId: string, codes: string[]) {
  // Delete existing codes first
  await supabase.from('mfa_backup_codes').delete().eq('user_id', userId)

  const hashes = await Promise.all(codes.map(async (code) => ({
    user_id: userId,
    code_hash: await hashBackupCode(code),
  })))

  const { error } = await supabase.from('mfa_backup_codes').insert(hashes)
  if (error) throw error
}

export async function consumeBackupCode(supabase: SupabaseClient, userId: string, code: string): Promise<boolean> {
  const { data: codes } = await supabase
    .from('mfa_backup_codes')
    .select('id, code_hash')
    .eq('user_id', userId)
    .is('used_at', null)

  if (!codes) return false

  for (const stored of codes) {
    if (await verifyBackupCode(code, stored.code_hash)) {
      await supabase.from('mfa_backup_codes').update({ used_at: new Date().toISOString() }).eq('id', stored.id)
      return true
    }
  }
  return false
}

export async function getRemainingCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('mfa_backup_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('used_at', null)
  return count ?? 0
}
