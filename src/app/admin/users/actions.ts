'use server'

import { requireAdminAction } from '@/lib/supabase/auth-helpers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { clearExemptionCache } from '@/lib/rate-limit'

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

  // Proactively clear the Redis-cached exemption status so the change takes
  // effect immediately instead of waiting up to 60 s for TTL expiry.
  await clearExemptionCache(userId)

  revalidatePath('/admin/users')
}

export async function overrideUserTier(userId: string, tier: 'free' | 'pro' | 'enterprise') {
  // Verify admin privileges (with MFA enforcement via requireAdminAction)
  await requireAdminAction()

  // Use service role client — subscription_tier may not be in the authenticated GRANT UPDATE list
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceSupabase
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  revalidatePath('/admin')
}
