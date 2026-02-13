import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  href: string;
  label: string;
}

/**
 * Simple back-navigation link with an arrow icon.
 */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Link>
  );
}
