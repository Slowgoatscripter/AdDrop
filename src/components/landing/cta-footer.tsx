import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTAFooter() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to drop your next campaign?
        </h2>
        <p className="text-muted-foreground mb-10">
          Stop spending hours writing ad copy. Let AdDrop handle it in seconds.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-gold text-background font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gold-muted transition-colors"
        >
          Start Creating Ads
          <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-6 text-xs text-muted-foreground/50">
          No account required. Free to try.
        </p>
      </div>
    </section>
  );
}
