import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-background py-6">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          &copy; {year} AdDrop. All rights reserved.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
