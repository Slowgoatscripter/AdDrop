# Bundle Download Progress Modal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the blind "Preparing..." Download All button with an SSE-driven progress modal showing real-time bundle generation steps.

**Architecture:** New SSE API route streams progress events from `generateBundle()` to a modal component. The finished ZIP uploads to a `temp-exports` Supabase Storage bucket, and the client auto-downloads via signed URL. Existing POST bundle route stays unchanged for the share page.

**Tech Stack:** Next.js 15 App Router (SSE streaming), sharp, archiver, Supabase Storage (signed URLs), React 19, TypeScript 5.9, shadcn/ui Dialog

**Design Doc:** `docs/plans/2026-02-18-bundle-progress-modal-design.md`

---

## Phase 1: Foundation (backend changes)

### Task 1: Supabase migration — create `temp-exports` bucket

**Files:**
- Create: `supabase/migrations/20260218_create_temp_exports_bucket.sql`

**Step 1: Write the migration**

Follow the pattern from `supabase/migrations/20260217_create_property_images_bucket.sql`. The bucket is private (not public) — access is via signed URLs only. Scope RLS policies to the user's own folder using `auth.uid()`.

```sql
-- Create temp-exports bucket (private — signed URL access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-exports', 'temp-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users upload own temp exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'temp-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can read their own temp exports
CREATE POLICY "Users read own temp exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can delete their own temp exports
CREATE POLICY "Users delete own temp exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'temp-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Step 2: Apply migration**

Run via Supabase dashboard or:
```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260218_create_temp_exports_bucket.sql
git commit -m "feat: add temp-exports storage bucket with RLS policies"
```

---

### Task 2: Update `BundleProgress` interface in `bundle.ts`

**Files:**
- Modify: `src/lib/export/bundle.ts` (lines 18-21, 43, 82, 86-87)

**Step 1: Update the `BundleProgress` interface**

Replace lines 18-21:

```typescript
export interface BundleProgress {
  phase: 'photos' | 'originals' | 'pdf' | 'zip' | 'done';
  detail: string;
  step: number;
  totalSteps: number;
}
```

**Step 2: Update the `photos` progress call**

Replace line 43:

```typescript
onProgress?.({ phase: 'photos', detail: `Resizing ${photos.length} photos for ${platformIds.length} platforms...`, step: 1, totalSteps: 5 });
```

**Step 3: Update the `originals` progress call**

Replace line 67:

```typescript
onProgress?.({ phase: 'originals', detail: `Saving original ${i + 1} of ${photos.length}...`, step: 2, totalSteps: 5 });
```

**Step 4: Update the `pdf` progress call**

Replace line 82:

```typescript
onProgress?.({ phase: 'pdf', detail: 'Generating campaign PDF...', step: 3, totalSteps: 5 });
```

**Step 5: Add `zip` phase event before `archive.finalize()`**

Insert before line 87 (`await archive.finalize()`):

```typescript
onProgress?.({ phase: 'zip', detail: 'Compressing files...', step: 4, totalSteps: 5 });
```

**Step 6: Verify existing POST route still works**

The existing `POST /api/export/bundle` calls `generateBundle(campaign)` with no `onProgress` — this still works because `onProgress` is optional (`?.` calls). No changes needed to that route.

**Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds. The type change from `string` to union literal is backward-compatible because the existing POST route doesn't pass `onProgress`.

**Step 8: Commit**

```bash
git add src/lib/export/bundle.ts
git commit -m "feat: enhance BundleProgress with typed phases and step tracking"
```

---

### Task 3: Create SSE streaming API route

**Files:**
- Create: `src/app/api/export/bundle/stream/route.ts`

**Step 1: Create the route file**

```typescript
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { CampaignKit } from '@/lib/types';
import { generateBundle, type BundleProgress } from '@/lib/export/bundle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');

  if (!campaignId || !uuidRegex.test(campaignId)) {
    return new Response(JSON.stringify({ error: 'Invalid campaign ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data: row, error } = await supabase
    .from('campaigns')
    .select('generated_ads')
    .eq('id', campaignId)
    .eq('user_id', user!.id)
    .single();

  if (error || !row) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const campaign = row.generated_ads as CampaignKit;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      // Disable EventSource auto-reconnect
      controller.enqueue(encoder.encode('retry: 0\n\n'));

      try {
        // Generate bundle with progress callbacks
        const onProgress = (progress: BundleProgress) => {
          sendEvent('progress', progress);
        };

        const zipBuffer = await generateBundle(campaign, onProgress);

        // Clean up stale temp exports for this user
        const userFolder = user!.id;
        const { data: existing } = await supabase.storage
          .from('temp-exports')
          .list(userFolder, { limit: 100 });

        if (existing && existing.length > 0) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const stale = existing.filter(f => new Date(f.created_at) < oneHourAgo);
          if (stale.length > 0) {
            await supabase.storage
              .from('temp-exports')
              .remove(stale.map(f => `${userFolder}/${f.name}`));
          }
        }

        // Upload ZIP to temp storage
        const filename = `${userFolder}/${campaignId}-${Date.now()}.zip`;
        const { error: uploadError } = await supabase.storage
          .from('temp-exports')
          .upload(filename, zipBuffer, {
            contentType: 'application/zip',
            upsert: true,
          });

        if (uploadError) {
          sendEvent('error', { message: 'Failed to prepare download file' });
          controller.close();
          return;
        }

        // Generate signed URL (1 hour)
        const { data: signedUrl, error: signError } = await supabase.storage
          .from('temp-exports')
          .createSignedUrl(filename, 3600);

        if (signError || !signedUrl) {
          sendEvent('error', { message: 'Failed to generate download link' });
          controller.close();
          return;
        }

        // Send done event with download URL
        sendEvent('progress', {
          phase: 'done',
          detail: 'Ready',
          step: 5,
          totalSteps: 5,
          downloadUrl: signedUrl.signedUrl,
        });

        controller.close();
      } catch (err) {
        console.error('Bundle stream error:', err);
        sendEvent('error', {
          message: err instanceof Error ? err.message : 'Bundle generation failed',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds, route appears as `ƒ /api/export/bundle/stream` in the output.

**Step 3: Commit**

```bash
git add src/app/api/export/bundle/stream/route.ts
git commit -m "feat: add SSE streaming endpoint for bundle generation progress"
```

---

## Phase 2: Frontend modal component

### Task 4: Create `BundleProgressModal` component

**Files:**
- Create: `src/components/campaign/bundle-progress-modal.tsx`

**Step 1: Create the component**

This component matches the vertical stepper pattern from `campaign-generating-view.tsx` (lines 139-183) but uses real SSE events instead of time-based progression. It uses the existing `Dialog` from `src/components/ui/dialog.tsx`.

```tsx
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

  // Determine which step index is active based on current phase
  const activeStepIndex = currentPhase
    ? STEPS.findIndex((s) => s.phase === currentPhase)
    : -1;

  useEffect(() => {
    if (!open) return;

    // Reset state
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

        // Auto-download
        triggerDownload(data.downloadUrl, propertyAddress || 'Campaign');

        // Fallback: if modal is still open after 2s, show manual button
        setTimeout(() => {
          setShowFallback(true);
        }, 2000);

        // Auto-close after 3s
        setTimeout(() => {
          onOpenChange(false);
        }, 3000);
      }
    });

    es.addEventListener('error', (e) => {
      // Check if it's a custom error event with data
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

    // Disable auto-reconnect on native onerror
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return; // Already handled
      es.close();
      eventSourceRef.current = null;
      setError('Connection lost. Please try again.');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [open, campaignId, propertyAddress, onOpenChange]);

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

    // Re-open by toggling — the useEffect will restart
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && currentPhase && currentPhase !== 'done' && !error) {
      // User trying to close mid-progress
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

        {/* Close confirmation overlay */}
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

        {/* Error state */}
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

        {/* Stepper */}
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
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[15px] top-[32px] w-px h-6',
                          isCompleted ? 'bg-primary' : 'bg-border'
                        )}
                      />
                    )}

                    {/* Step icon */}
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

                    {/* Step text */}
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

        {/* Download fallback button */}
        {isDone && showFallback && downloadUrl && (
          <div className="flex justify-center pt-2">
            <Button onClick={() => triggerDownload(downloadUrl, propertyAddress || 'Campaign')}>
              Download Ready — Click to Save
            </Button>
          </div>
        )}

        {/* Bottom status bar */}
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
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/campaign/bundle-progress-modal.tsx
git commit -m "feat: add BundleProgressModal with SSE-driven stepper and auto-download"
```

---

### Task 5: Wire modal into `campaign-shell.tsx`

**Files:**
- Modify: `src/components/campaign/campaign-shell.tsx` (lines 17, 43, 653-680, 721)

**Step 1: Add import**

After line 17 (`import { EmailModal } from './email-modal';`), add:

```typescript
import { BundleProgressModal } from './bundle-progress-modal';
```

**Step 2: Replace `bundling` state with modal state**

Replace line 43:

```typescript
// OLD: const [bundling, setBundling] = useState(false);
const [bundleModalOpen, setBundleModalOpen] = useState(false);
```

**Step 3: Remove `handleDownloadAll` function**

Delete lines 653-680 (the entire `handleDownloadAll` function).

**Step 4: Update the Download All button**

Replace line 721:

```tsx
<Button onClick={() => setBundleModalOpen(true)}>Download All</Button>
```

**Step 5: Render the modal**

After the `</div>` that closes the button row (after line 724), add:

```tsx
<BundleProgressModal
  open={bundleModalOpen}
  onOpenChange={setBundleModalOpen}
  campaignId={campaign!.id}
  propertyAddress={
    campaign!.listing?.address
      ? `${campaign!.listing.address.street}, ${campaign!.listing.address.city}, ${campaign!.listing.address.state}`
      : undefined
  }
/>
```

**Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds, no TypeScript errors.

**Step 7: Commit**

```bash
git add src/components/campaign/campaign-shell.tsx
git commit -m "feat: wire BundleProgressModal into campaign shell, remove old download handler"
```

---

## Phase 3: Verification

### Task 6: Full build verification

**Step 1: Clear caches and rebuild**

```bash
rm -rf .next
npm run build
```

Expected: Build succeeds with all routes compiled. Verify `ƒ /api/export/bundle/stream` appears in the output.

**Step 2: Verify existing POST bundle route still works**

The `POST /api/export/bundle` route should be unaffected — it still exists at `src/app/api/export/bundle/route.ts` and calls `generateBundle(campaign)` with no `onProgress`. Verify it appears as `ƒ /api/export/bundle` in the build output.

**Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from bundle progress modal integration"
```

Only commit if there were actual fixes. If build passed clean, skip this step.

---

## Summary

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| 1: Foundation | 1-3 | Supabase bucket, enhanced BundleProgress, SSE route |
| 2: Frontend | 4-5 | Modal component, campaign shell integration |
| 3: Verification | 6 | Clean build, route confirmation |

**Total: 6 tasks across 3 phases.**

**Files created (3):**
- `supabase/migrations/20260218_create_temp_exports_bucket.sql`
- `src/app/api/export/bundle/stream/route.ts`
- `src/components/campaign/bundle-progress-modal.tsx`

**Files modified (2):**
- `src/lib/export/bundle.ts`
- `src/components/campaign/campaign-shell.tsx`
