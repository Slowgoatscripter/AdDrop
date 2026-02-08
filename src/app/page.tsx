import { UrlInputForm } from '@/components/url-input-form';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
          RealEstate Ad Gen
        </h1>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          Turn any property listing into a complete marketing campaign in seconds.
        </p>
      </div>

      <UrlInputForm />

      <footer className="mt-12 text-center text-xs text-slate-400 space-y-1">
        <p>Generates ads for Instagram, Facebook, Google, Twitter/X, Zillow, print &amp; more.</p>
        <p>Montana MLS compliant. Powered by AI.</p>
      </footer>
    </main>
  );
}
