import Link from 'next/link'
import { DropletIcon } from '@/components/ui/droplet-icon'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4 text-xs text-muted-foreground">
        <DropletIcon size={12} className="opacity-40" />
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-teal-light transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-teal-light transition-colors">Privacy</Link>
          <Link href="/cookies" className="hover:text-teal-light transition-colors">Cookies</Link>
          <Link href="/disclaimer" className="hover:text-teal-light transition-colors">Disclaimer</Link>
        </nav>
        <p>&copy; {currentYear} AdDrop. All rights reserved.</p>
      </div>
    </footer>
  )
}
