import { createClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/admin/users-table'
import type { Profile } from '@/lib/types/admin'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Users</h1>
      <UsersTable
        profiles={(profiles || []) as Profile[]}
        currentUserId={user!.id}
      />
    </div>
  )
}
