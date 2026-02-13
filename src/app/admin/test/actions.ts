'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ListingData } from '@/lib/types/listing'
import { settingsDefaults } from '@/lib/settings/defaults'

export async function getPresets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  const { data, error } = await supabase
    .from('test_presets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createPreset(name: string, listingData: ListingData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  const { error } = await supabase
    .from('test_presets')
    .insert({
      name,
      listing_data: listingData,
      created_by: user.id,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/test')
}

export async function updatePreset(id: string, name: string, listingData: ListingData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  const { error } = await supabase
    .from('test_presets')
    .update({
      name,
      listing_data: listingData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/test')
}

export async function deletePreset(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  const { error } = await supabase
    .from('test_presets')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/test')
}

export async function reseedPresets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  // Delete all existing presets for this user
  const { error: deleteError } = await supabase
    .from('test_presets')
    .delete()
    .eq('created_by', user.id)

  if (deleteError) throw new Error(deleteError.message)

  // Insert defaults
  const defaults = settingsDefaults['presets.default'] as Array<{
    name: string
    listing_data: ListingData
  }>

  const rows = defaults.map((p) => ({
    name: p.name,
    listing_data: p.listing_data,
    created_by: user.id,
  }))

  const { error: insertError } = await supabase
    .from('test_presets')
    .insert(rows)

  if (insertError) throw new Error(insertError.message)

  revalidatePath('/admin/test')
}
