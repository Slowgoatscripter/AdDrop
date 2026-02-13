'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Shield } from 'lucide-react'

const navItems = [
  { href: '/settings/account', label: 'Account', icon: User },
  { href: '/settings/security', label: 'Security', icon: Shield },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-gold/10 text-gold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
