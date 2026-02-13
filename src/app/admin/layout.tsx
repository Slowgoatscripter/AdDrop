import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/sidebar'
import { AppHeader } from '@/components/nav/app-header'
import { FeedbackShell } from '@/components/feedback/feedback-shell'
import { Footer } from '@/components/nav/footer'

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

  if (profile?.role !== 'admin') redirect('/')

  const headerUser = {
    displayName: profile?.display_name ?? undefined,
    email: profile?.email ?? user.email ?? '',
    role: profile?.role ?? 'user',
  }

  return (
    <FeedbackShell>
      <div className="min-h-screen bg-background flex flex-col">
        <Sidebar />
        <div className="md:ml-60 flex-1 flex flex-col">
          <AppHeader variant="admin" user={headerUser} />
          <main className="flex-1 p-6">{children}</main>
          <Footer />
        </div>
      </div>
    </FeedbackShell>
  )
}
