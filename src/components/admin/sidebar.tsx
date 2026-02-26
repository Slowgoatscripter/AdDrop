'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut, FlaskConical, MessageSquare, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DropletIcon } from '@/components/ui/droplet-icon'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/test', label: 'AI Test', icon: FlaskConical },
  { href: '/admin/compliance-qa', label: 'Compliance QA', icon: ShieldCheck },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="hidden md:flex w-60 h-screen fixed left-0 top-0 bg-card/80 backdrop-blur-sm border-r border-border flex-col">
      <div className="p-4 border-b border-border">
        <Link href="/admin" className="text-lg font-bold text-gold flex items-center">
          AdDrop
          <DropletIcon size={8} className="ml-0.5 opacity-80" />
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-teal-muted/50 text-gold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
