import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
          Ad<span className="text-gold">Drop</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
          One listing. Every ad. Instantly.
        </p>

        <p className="text-base text-muted-foreground/70 mb-10 max-w-xl mx-auto">
          Turn any property listing into a complete marketing campaign across 12+ platforms — powered by AI.
        </p>

        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-gold text-background font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gold-muted transition-colors"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}
