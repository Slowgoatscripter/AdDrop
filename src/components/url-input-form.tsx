'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function UrlInputForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a listing URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);

    try {
      setStatus('Scraping listing data...');
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const scrapeData = await scrapeRes.json();

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to scrape listing');
      }

      setStatus('Generating campaign kit with AI...');
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing: scrapeData.data }),
      });
      const genData = await genRes.json();

      if (!genData.success) {
        throw new Error(genData.error || 'Failed to generate campaign');
      }

      sessionStorage.setItem(`campaign-${genData.campaign.id}`, JSON.stringify(genData.campaign));
      router.push(`/campaign/${genData.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Generate Your Ad Campaign</CardTitle>
        <CardDescription>
          Paste a property listing URL and we&apos;ll create ready-to-post ads for selected platforms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://www.zillow.com/homedetails/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Working...' : 'Generate Ads'}
            </Button>
          </div>

          {loading && status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {status}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Supports Zillow, Realtor.com, Redfin, and most MLS listing pages.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
