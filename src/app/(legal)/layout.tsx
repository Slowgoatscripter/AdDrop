import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/nav/footer'

export const metadata: Metadata = {
  robots: 'noindex',
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link href="/" className="font-serif text-lg font-bold text-foreground tracking-tight">
            AdDrop
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-sm max-w-none
          prose-headings:font-serif prose-headings:text-foreground prose-headings:font-semibold
          prose-h1:text-3xl prose-h1:mb-2
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-2
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-li:text-muted-foreground
          prose-strong:text-foreground
          prose-a:text-gold prose-a:no-underline hover:prose-a:underline
          prose-table:text-sm
          prose-th:text-foreground prose-th:font-medium prose-th:text-left prose-th:pb-2 prose-th:border-b prose-th:border-border/40
          prose-td:text-muted-foreground prose-td:py-2 prose-td:border-b prose-td:border-border/20
        ">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  )
}
