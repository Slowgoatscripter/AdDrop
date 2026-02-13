import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
              {profile?.role}
            </span>
            <span className="text-sm text-muted-foreground">
              {profile?.display_name || profile?.email}
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
