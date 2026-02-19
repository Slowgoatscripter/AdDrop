'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Download, FileText, Archive, Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BundleProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  propertyAddress?: string;
}

const STEPS = [
  { id: 1, phase: 'photos', label: 'Resizing photos', icon: ImageIcon },
  { id: 2, phase: 'originals', label: 'Saving originals', icon: Download },
  { id: 3, phase: 'pdf', label: 'Generating PDF', icon: FileText },
  { id: 4, phase: 'zip', label: 'Zipping files', icon: Archive },
  { id: 5, phase: 'done', label: 'Ready to download', icon: Check },
] as const;

type Phase = (typeof STEPS)[number]['phase'];

export function BundleProgressModal({
  open,
  onOpenChange,
  campaignId,
  propertyAddress,
}: BundleProgressModalProps) {
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const activeStepIndex = currentPhase
    ? STEPS.findIndex((s) => s.phase === currentPhase)
    : -1;

  useEffect(() => {
    if (!open) return;

    setCurrentPhase(null);
    setDetail('');
    setError(null);
    setDownloadUrl(null);
    setShowFallback(false);
    setConfirmClose(false);

    const es = new EventSource(
      `/api/export/bundle/stream?campaignId=${encodeURIComponent(campaignId)}`
    );
    eventSourceRef.current = es;

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setCurrentPhase(data.phase);
      setDetail(data.detail || '');

      if (data.phase === 'done' && data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        es.close();
        eventSourceRef.current = null;

        triggerDownload(data.downloadUrl, propertyAddress || 'Campaign');

        setTimeout(() => {
          setShowFallback(true);
        }, 2000);

        setTimeout(() => {
          onOpenChangeRef.current(false);
        }, 3000);
      }
    });

    es.addEventListener('error', (e: Event) => {
      const messageEvent = e as MessageEvent;
      if (messageEvent.data) {
        try {
          const data = JSON.parse(messageEvent.data);
          setError(data.message || 'Bundle generation failed');
        } catch {
          setError('Bundle generation failed');
        }
      } else {
        setError('Connection lost. Please try again.');
      }
      es.close();
      eventSourceRef.current = null;
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      es.close();
      eventSourceRef.current = null;
      setError('Connection lost. Please try again.');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [open, campaignId, propertyAddress]);

  function triggerDownload(url: string, name: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.zip`;
    a.click();
  }

  function handleRetry() {
    setError(null);
    setCurrentPhase(null);
    setDetail('');
    setDownloadUrl(null);
    setShowFallback(false);

    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && currentPhase && currentPhase !== 'done' && !error) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  function handleConfirmClose() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setConfirmClose(false);
    onOpenChange(false);
  }

  const isInProgress = currentPhase !== null && currentPhase !== 'done' && !error;
  const isDone = currentPhase === 'done';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDone ? 'Download Ready' : error ? 'Download Failed' : 'Preparing Your Campaign Bundle'}
          </DialogTitle>
          {propertyAddress && (
            <DialogDescription className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {propertyAddress}
            </DialogDescription>
          )}
        </DialogHeader>

        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="text-center space-y-3 p-6">
              <p className="text-sm font-medium">Bundle is still preparing. Close anyway?</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setConfirmClose(false)}>
                  Keep waiting
                </Button>
                <Button variant="destructive" size="sm" onClick={handleConfirmClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRetry}>
                Try Again
              </Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {!error && (
          <div className="py-4">
            <ol className="relative space-y-0">
              {STEPS.map((step, idx) => {
                const isCompleted = activeStepIndex > idx || isDone;
                const isActive = activeStepIndex === idx && !isDone;
                const isPending = activeStepIndex < idx && !isDone;
                const isLast = idx === STEPS.length - 1;
                const Icon = step.icon;

                return (
                  <li key={step.id} className="relative flex items-start gap-3 pb-6 last:pb-0">
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[15px] top-[32px] w-px h-6',
                          isCompleted ? 'bg-primary' : 'bg-border'
                        )}
                      />
                    )}

                    <div className="relative flex-shrink-0">
                      {isCompleted ? (
                        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : isActive ? (
                        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 border-primary bg-primary/10">
                          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full border bg-muted/50">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isCompleted && 'text-primary',
                            isActive && 'text-foreground',
                            isPending && 'text-muted-foreground'
                          )}
                        >
                          {step.label}
                        </span>
                        {isCompleted && (
                          <span className="text-xs text-primary">Done</span>
                        )}
                        {isActive && (
                          <span className="text-xs text-muted-foreground animate-pulse">
                            In progress...
                          </span>
                        )}
                      </div>
                      {isActive && detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {detail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {isDone && showFallback && downloadUrl && (
          <div className="flex justify-center pt-2">
            <Button onClick={() => triggerDownload(downloadUrl, propertyAddress || 'Campaign')}>
              Download Ready — Click to Save
            </Button>
          </div>
        )}

        {isInProgress && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Preparing your files...</span>
          </div>
        )}

        {isDone && !showFallback && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Download starting...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
