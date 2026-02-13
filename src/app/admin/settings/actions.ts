'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { settingsDefaults } from '@/lib/settings/defaults'

export async function loadSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, updated_at')
    .order('key')

  if (error) throw new Error(error.message)

  // Merge DB overrides with defaults
  const merged: Record<string, unknown> = { ...settingsDefaults }
  for (const row of data || []) {
    merged[row.key] = row.value
  }

  return merged
}

export async function saveSettings(entries: Record<string, unknown>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')

  // Batch upsert all entries
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }))

  const { error } = await supabase
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) throw new Error(error.message)

  // Bust cache and revalidate relevant paths
  revalidateTag('app-settings')
  revalidatePath('/admin/settings')
  revalidatePath('/')
}

export async function resetSettings(keys: string[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')

  const { error } = await supabase
    .from('app_settings')
    .delete()
    .in('key', keys)

  if (error) throw new Error(error.message)

  revalidateTag('app-settings')
  revalidatePath('/admin/settings')
  revalidatePath('/')
}
