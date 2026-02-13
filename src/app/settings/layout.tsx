import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/nav/app-header'
import { SettingsNav } from './settings-nav'
import { FeedbackShell } from '@/components/feedback/feedback-shell'
import { Footer } from '@/components/nav/footer'

export default async function SettingsLayout({
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

  const headerUser = {
    displayName: profile?.display_name ?? undefined,
    email: profile?.email ?? user.email ?? '',
    role: profile?.role ?? 'user',
  }

  return (
    <FeedbackShell>
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader variant="app" user={headerUser} />
        <div className="flex-1 max-w-4xl mx-auto p-6 flex gap-8 w-full">
          <aside className="w-48 shrink-0 hidden md:block">
            <h2 className="text-lg font-bold text-foreground mb-4">Settings</h2>
            <SettingsNav />
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <Footer />
      </div>
    </FeedbackShell>
  )
}
