import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SettingsNav } from './settings-nav'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

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

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <Link href="/dashboard" className="text-lg font-bold text-foreground">AdDrop</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
            {profile?.role}
          </span>
          <span className="text-sm text-muted-foreground">
            {profile?.display_name || profile?.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6 flex gap-8">
        <aside className="w-48 shrink-0">
          <h2 className="text-lg font-bold text-foreground mb-4">Settings</h2>
          <SettingsNav />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
