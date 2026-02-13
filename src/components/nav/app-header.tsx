'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, LayoutDashboard, Plus, Settings } from 'lucide-react'

type HeaderUser = {
  displayName?: string
  email: string
  role: string
}

type AppHeaderProps = {
  variant?: 'landing' | 'app' | 'auth'
  user?: HeaderUser
}

export function AppHeader({ variant = 'landing', user }: AppHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
        <Link href="/" className="text-lg font-bold text-foreground tracking-tight">
          AdDrop
        </Link>

        <nav className="flex items-center gap-1">
          {variant === 'landing' && (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-sm rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}

          {variant === 'auth' && (
            <Link
              href="/"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
          )}

          {variant === 'app' && (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/create"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  pathname === '/create'
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="w-4 h-4" />
                Create
              </Link>
              <Link
                href="/settings"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  pathname?.startsWith('/settings')
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              {user && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
