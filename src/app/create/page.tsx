import { MlsInputForm } from '@/components/mls-input-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreatePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Create Your Campaign
          </h1>
          <p className="text-muted-foreground">
            Enter your property details and we&apos;ll generate ads for every platform.
          </p>
        </div>

        <MlsInputForm />
      </div>
    </main>
  );
}
