import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className ?? 'px-6 py-3'}>
      <ol className="flex items-center gap-2 text-[13px] font-sans">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-cream/30">/</span>}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-cream/50 hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-cream">{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
