'use server'

import { requireAdminAction } from '@/lib/supabase/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function updateUserRole(userId: string, newRole: 'admin' | 'user') {
  const { user, supabase } = await requireAdminAction()

  // Prevent self-demotion
  if (userId === user.id) throw new Error('Cannot change your own role')

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  revalidatePath('/admin')
}

export async function toggleRateLimitExempt(userId: string, exempt: boolean) {
  const { supabase } = await requireAdminAction()

  const { error } = await supabase
    .from('profiles')
    .update({ rate_limit_exempt: exempt })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
}
