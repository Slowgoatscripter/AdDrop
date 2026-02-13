'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ListingData } from '@/lib/types/listing'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')
  return { user, supabase }
}

export async function getPresets() {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('test_presets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createPreset(name: string, listingData: ListingData) {
  const { user, supabase } = await requireAdmin()

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
  const { supabase } = await requireAdmin()

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
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('test_presets')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/test')
}

export async function reseedPresets() {
  const { supabase } = await requireAdmin()

  const { error: deleteError } = await supabase
    .from('test_presets')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) throw new Error(deleteError.message)

  revalidatePath('/admin/test')
}
