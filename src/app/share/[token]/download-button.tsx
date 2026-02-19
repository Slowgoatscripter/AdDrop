'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface DownloadButtonProps {
  campaignId: string;
  shareToken: string;
  addressStreet?: string;
}

export function DownloadButton({ campaignId, shareToken, addressStreet }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/export/bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, shareToken }),
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${addressStreet?.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'Campaign'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silent fail for share pages - user can retry
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={downloading} size="sm" className="gap-2">
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download All
        </>
      )}
    </Button>
  );
}
