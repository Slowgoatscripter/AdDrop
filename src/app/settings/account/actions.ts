'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProfile() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, phone, company, role, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function updateProfile(data: {
  display_name?: string
  company?: string
  phone?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Only allow safe columns
  const safeData: Record<string, string> = {}
  if (data.display_name !== undefined) safeData.display_name = data.display_name
  if (data.company !== undefined) safeData.company = data.company
  if (data.phone !== undefined) safeData.phone = data.phone

  const { error } = await supabase
    .from('profiles')
    .update(safeData)
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/settings/account')
}

export async function requestEmailChange(newEmail: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.auth.updateUser({ email: newEmail })

  if (error) throw new Error(error.message)
}
