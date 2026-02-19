'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface SharePopoverProps {
  campaignId: string;
}

export function SharePopover({ campaignId }: SharePopoverProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<'48h' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  const expiryLabel = expiresAt && !isExpired
    ? (() => {
        const ms = new Date(expiresAt).getTime() - Date.now();
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) return `Expires in ${days}d ${hours}h`;
        if (hours > 0) return `Expires in ${hours}h`;
        return 'Expires soon';
      })()
    : null;

  async function handleGenerate() {
    if (shareUrl && !isExpired) {
      const confirmed = window.confirm('This will invalidate the previous link. Continue?');
      if (!confirmed) return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/share`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiry }),
      });
      if (!res.ok) {
        toast.error('Failed to generate share link');
        return;
      }
      const data = await res.json();
      setShareUrl(data.shareUrl);
      setExpiresAt(data.expiresAt);
      toast.success('Share link generated!');
    } catch {
      toast.error('Failed to generate share link');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    const confirmed = window.confirm('Revoke this share link? Anyone with the link will lose access.');
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/share`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to revoke share link');
        return;
      }
      setShareUrl(null);
      setExpiresAt(null);
      toast.success('Share link revoked');
    } catch {
      toast.error('Failed to revoke share link');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy');
    } finally {
      setCopying(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">Share</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <h3 className="font-semibold text-sm">Share Campaign</h3>

        {shareUrl && !isExpired ? (
          <>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-muted rounded px-2 py-1.5 border truncate"
              />
              <Button size="sm" variant="outline" onClick={handleCopy} disabled={copying}>
                {copying ? '\u2026' : 'Copy'}
              </Button>
            </div>
            {expiryLabel && (
              <p className="text-xs text-muted-foreground">{expiryLabel}</p>
            )}
            <Button size="sm" variant="destructive" onClick={handleRevoke} disabled={loading} className="w-full">
              {loading ? 'Revoking\u2026' : 'Revoke Link'}
            </Button>
          </>
        ) : (
          <>
            {isExpired && (
              <p className="text-xs text-amber-600">Previous link has expired.</p>
            )}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Expires in:</label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value as '48h' | '7d' | '30d')}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="48h">48 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>
            <Button size="sm" onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? 'Generating\u2026' : 'Generate Link'}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
