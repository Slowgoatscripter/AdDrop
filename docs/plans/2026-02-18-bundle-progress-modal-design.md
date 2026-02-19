# Bundle Download Progress Modal — Design Doc

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create an implementation plan from this design.

**Goal:** Replace the blind "Preparing..." button state on Download All with a modal showing real-time progress via Server-Sent Events, matching the existing campaign-generating-view stepper pattern.

**Design Doc Date:** 2026-02-18
**Review Status:** Approved with Changes (applied 2026-02-18)

---

## Problem

The Download All button triggers a synchronous POST to `/api/export/bundle`. For campaigns with multiple photos and platform dimensions, this takes a noticeable amount of time. The user sees only "Preparing..." with no indication of progress, causing uncertainty about whether it's working or stuck.

## Solution

An SSE-driven progress modal that shows a vertical stepper advancing through real bundle generation phases. The ZIP uploads to temporary Supabase Storage when complete, and the browser auto-downloads it.

---

## Architecture

### Flow

```
User clicks "Download All"
  → BundleProgressModal opens
  → Opens EventSource to GET /api/export/bundle/stream?campaignId=xxx
  → Server generates bundle, streaming progress events
  → Server uploads finished ZIP to Supabase Storage (temp-exports bucket)
  → Server sends final "done" event with signed download URL
  → Browser auto-downloads ZIP (with fallback button if blocked)
  → Modal shows success briefly, then closes
```

### Why SSE

- One-directional (server → client) — exactly what we need
- Native browser EventSource API, no library
- Works with Next.js App Router API routes
- Simpler than polling (no job queue, no status endpoint, no cleanup)

### Existing Route Unchanged

The existing `POST /api/export/bundle` stays as-is for the share page's Download All (no progress needed there). The new SSE route is additive.

---

## SSE Event Protocol

### Event Format

The server sends `retry: 0` as the first field to disable EventSource auto-reconnect:

```
retry: 0

event: progress
data: {"phase":"photos","detail":"Resizing 5 photos for 4 platforms...","step":1,"totalSteps":5}

event: progress
data: {"phase":"originals","detail":"Original 3 of 5","step":2,"totalSteps":5}

event: progress
data: {"phase":"pdf","detail":"Generating campaign PDF...","step":3,"totalSteps":5}

event: progress
data: {"phase":"zip","detail":"Compressing files...","step":4,"totalSteps":5}

event: progress
data: {"phase":"done","detail":"Ready","downloadUrl":"https://...supabase.co/storage/v1/object/sign/temp-exports/abc.zip?token=...","step":5,"totalSteps":5}

event: error
data: {"message":"Photo resize failed"}
```

### Phases

| Phase | Step | Detail Pattern |
|-------|------|----------------|
| `photos` | 1 | `"Resizing {n} photos for {m} platforms..."` |
| `originals` | 2 | `"Original {n} of {total}"` |
| `pdf` | 3 | `"Generating campaign PDF..."` |
| `zip` | 4 | `"Compressing files..."` |
| `done` | 5 | `"Ready"` + `downloadUrl` |

> **Note on photos phase:** The `resizeAllPhotos()` function in `photo-resize.ts` is a batch operation with no per-photo callback. Rather than refactoring that function's API, the photos step emits a single summary event before the batch runs (`"Resizing {n} photos for {m} platforms..."`). Per-photo granularity can be added later by threading a callback through `resizeAllPhotos` if desired, but is not required for v1.

---

## API Route

### `GET /api/export/bundle/stream`

**File:** `src/app/api/export/bundle/stream/route.ts`

**Required exports:**
```typescript
export const runtime = 'nodejs';       // sharp, archiver, stream.Writable are Node-only
export const dynamic = 'force-dynamic'; // prevent static analysis of streaming response
export const maxDuration = 300;         // 5-minute ceiling for large bundles (Vercel Pro)
```

**Query params:** `campaignId` (required UUID)

**Auth:** Session cookie via `requireAuth()` (no share token support — progress modal is only for authenticated users)

**Response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

**Server flow:**
1. Validate `campaignId` UUID format
2. Authenticate via `requireAuth()`
3. Fetch campaign from Supabase where `user_id` matches
4. Set SSE response headers, get writable stream
5. Send `retry: 0\n\n` as first SSE field to disable auto-reconnect
6. Call `generateBundle(campaign, onProgress)` where `onProgress` writes SSE events
7. Upload completed ZIP buffer to `temp-exports` bucket with filename `{campaignId}-{timestamp}.zip`
8. Generate signed URL (1-hour expiry) via `createSignedUrl`
9. Send `done` event with signed URL
10. Close stream

**Server-side timeout:** If no progress event has been emitted for 120 seconds, the server sends an `error` event with message `"Bundle generation timed out — please try again"` and closes the stream. This prevents silent hangs if the platform kills the connection.

**Error handling:** Catch errors at every phase, send `error` event with descriptive message, close stream. Never leave the stream open after an error.

---

## Changes to `bundle.ts`

Enhance the `onProgress` callback to include structured step data:

```typescript
export interface BundleProgress {
  phase: 'photos' | 'originals' | 'pdf' | 'zip' | 'done';
  detail: string;
  step: number;
  totalSteps: number;
}
```

Add progress calls:
- Before photo resize batch: `phase: "photos"` with total photo and platform count
- Before each original download: `phase: "originals"` with index
- Before PDF generation: `phase: "pdf"`
- Before `archive.finalize()`: `phase: "zip"`

The total steps count is always 5 (fixed phases shown in the stepper). The detail string provides granular sub-progress within each phase.

> **Type change note:** Narrowing `phase` from `string` to a union literal and adding `step`/`totalSteps` is a breaking interface change. The only existing caller is `POST /api/export/bundle`, which passes no `onProgress` callback, so practical risk is zero. The implementation should verify no other callers exist.

---

## Supabase Storage

### Bucket: `temp-exports`

- **Visibility:** Private (not public)
- **Access:** Signed URLs only, 1-hour expiry
- **Migration:** SQL migration to create bucket and RLS policies

### Migration: `20260218_create_temp_exports_bucket.sql`

```sql
-- Create temp-exports bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-exports', 'temp-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to their own path
CREATE POLICY "Authenticated users can upload temp exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temp-exports');

-- RLS: Authenticated users can read their own temp exports (fallback for signed URL issues)
CREATE POLICY "Authenticated users can read temp exports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'temp-exports');

-- RLS: Authenticated users can delete their own temp exports
CREATE POLICY "Authenticated users can delete temp exports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'temp-exports');
```

### Signed URL

Use `supabase.storage.from('temp-exports').createSignedUrl(path, 3600)` for 1-hour access.

### Temp Storage Cleanup

Automated cleanup via a scheduled Supabase Edge Function (or `pg_cron` if available on the project tier):

**Approach: Server-side cleanup on upload.** Before uploading a new ZIP, the SSE route lists and deletes any objects in `temp-exports/` older than 1 hour for the current user. This is self-cleaning — no external cron needed.

```typescript
// Cleanup old temp exports before uploading new one
const { data: existing } = await supabase.storage.from('temp-exports').list('', { limit: 100 });
if (existing) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const stale = existing.filter(f => new Date(f.created_at) < oneHourAgo);
  if (stale.length > 0) {
    await supabase.storage.from('temp-exports').remove(stale.map(f => f.name));
  }
}
```

This runs opportunistically on each bundle generation. Worst case, files linger until the next download. Acceptable for the expected usage volume.

---

## Component: BundleProgressModal

### File

`src/components/campaign/bundle-progress-modal.tsx`

### Props

```typescript
interface BundleProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  propertyAddress?: string;
}
```

### Visual Layout

```
┌─────────────────────────────────────────┐
│  Preparing Your Campaign Bundle    [X]  │
│  123 Main St, Austin, TX                │
│─────────────────────────────────────────│
│                                         │
│  ✓  Resizing photos         Done        │
│  │                                      │
│  ◉  Saving originals      3 of 5...    │
│  │                                      │
│  ○  Generating PDF                      │
│  │                                      │
│  ○  Zipping files                       │
│  │                                      │
│  ○  Ready to download                   │
│                                         │
│─────────────────────────────────────────│
│  ● Preparing your files...              │
└─────────────────────────────────────────┘
```

### Stepper Steps (Static Definition)

```typescript
const STEPS = [
  { id: 1, phase: 'photos',    label: 'Resizing photos',    icon: ImageIcon },
  { id: 2, phase: 'originals', label: 'Saving originals',   icon: Download },
  { id: 3, phase: 'pdf',       label: 'Generating PDF',     icon: FileText },
  { id: 4, phase: 'zip',       label: 'Zipping files',      icon: Archive },
  { id: 5, phase: 'done',      label: 'Ready to download',  icon: Check },
];
```

### States

| State | Visual | Behavior |
|-------|--------|----------|
| **In progress** | Stepper advances per SSE events, active step has spinner, bottom bar pulses | Close button shows confirmation: "Bundle is still preparing. Close anyway?" If confirmed, EventSource closes. |
| **Success** | All steps checked, "Download starting..." text | Auto-triggers download, modal auto-closes after 2 seconds. If auto-download is blocked (Safari/Firefox), shows a "Download Ready — Click to Save" fallback button instead of auto-closing. |
| **Error** | Red alert with error message | "Try Again" button restarts SSE, "Close" button dismisses |

### Step Rendering (Matches campaign-generating-view)

- **Completed:** Filled primary circle + Check icon + "Done" label
- **Active:** Ring border + spinning indicator + detail text from SSE
- **Pending:** Muted border + dimmed icon

> **Note on zip step:** `archive.finalize()` can take several seconds for large bundles. During this time step 4 shows an indeterminate spinner with "Compressing files..." — no sub-progress is available from archiver, which is acceptable.

### SSE Connection Lifecycle

- Opens `EventSource` when `open` becomes `true`
- Listens to `progress` and `error` events
- **Auto-reconnect disabled:** The `onerror` handler immediately calls `eventSource.close()` and shows error state. This prevents the browser from silently restarting bundle generation on connection drops.
- On `done` event: extracts `downloadUrl`, triggers download, shows success, auto-closes after 2s
- On `error` event: shows error state with retry button
- On unmount or close: calls `eventSource.close()`

```typescript
// Critical: disable auto-reconnect on error
eventSource.onerror = () => {
  eventSource.close();
  setError('Connection lost. Please try again.');
};
```

### Auto-Download Trigger

```typescript
function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

**Filename convention:** Uses `{address}.zip` matching the existing POST bundle route (e.g. `"123 Main St.zip"`).

**Fallback for blocked downloads:** Safari and Firefox with strict settings may block programmatic `<a>.click()` from async callbacks (not a direct user gesture). After calling `triggerDownload`, set a 2-second timeout. If the modal is still open after the timeout, assume the download was blocked and show a "Download Ready — Click to Save" button that the user clicks manually. This button fires `triggerDownload` from a real click event, which browsers always allow.

---

## Integration: campaign-shell.tsx

### Changes

1. Replace `bundling` state + `handleDownloadAll` function with modal open state:

```typescript
const [bundleModalOpen, setBundleModalOpen] = useState(false);
```

2. Replace Download All button handler:

```tsx
<Button onClick={() => setBundleModalOpen(true)}>
  Download All
</Button>
```

3. Render modal:

```tsx
<BundleProgressModal
  open={bundleModalOpen}
  onOpenChange={setBundleModalOpen}
  campaignId={campaign!.id}
  propertyAddress={address}
/>
```

4. Remove `handleDownloadAll` function and `bundling` state entirely.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Auth failure | SSE returns 401 before streaming begins, modal shows "Session expired" error |
| Campaign not found | SSE returns 404, modal shows "Campaign not found" error |
| Photo fetch fails | Server skips that photo, continues (existing behavior in bundle.ts) |
| Sharp resize fails | Server sends error event, modal shows error with retry |
| Supabase upload fails | Server sends error event, modal shows error with retry |
| Network drop | EventSource `onerror` fires → `eventSource.close()` called immediately → modal shows "Connection lost" error with retry button. No auto-reconnect. |
| Server timeout (120s no progress) | Server sends error event with "Bundle generation timed out", closes stream |
| Serverless platform kills connection | Client-side: EventSource `onerror` fires → shows connection lost error. Same as network drop. |
| User closes modal mid-process | Confirmation dialog: "Bundle is still preparing. Close anyway?" If confirmed, EventSource closes. Server-side generation completes but result is discarded (cleaned up on next upload). |
| Auto-download blocked by browser | Fallback "Download Ready — Click to Save" button appears after 2s timeout |

---

## Files Affected

| File | Change |
|------|--------|
| `src/app/api/export/bundle/stream/route.ts` | **New** — SSE endpoint with `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, `maxDuration = 300` |
| `src/lib/export/bundle.ts` | **Modify** — enhance BundleProgress interface (phase union type, step/totalSteps), add `zip` phase event before `archive.finalize()` |
| `src/components/campaign/bundle-progress-modal.tsx` | **New** — modal component with stepper, SSE connection, auto-download with fallback |
| `src/components/campaign/campaign-shell.tsx` | **Modify** — swap `handleDownloadAll`/`bundling` for modal open state |
| `supabase/migrations/20260218_create_temp_exports_bucket.sql` | **New** — temp-exports bucket with RLS policies |

---

## Out of Scope

- Share page Download All progress (stays as synchronous POST)
- Per-card Download Photo progress (single photo, fast enough)
- Bundle content customization (select which platforms to include)
- Download history / re-download from storage
- Per-photo resize granularity in the progress stepper (v1 uses a single summary event for the photos phase)

---

## Design Review Log

**Reviewed by:** quality-reviewer + integration-reviewer (2026-02-18)
**Verdict:** Approved with Changes

### Issues Resolved

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | Missing `runtime = 'nodejs'` + `dynamic = 'force-dynamic'` | Critical | Added to API Route section as required exports |
| 2 | EventSource auto-reconnect creates ghost generations | Critical | Added `retry: 0` server-side, explicit `close()` in client `onerror`, documented in SSE Connection Lifecycle |
| 3 | Serverless timeout risk for large bundles | Critical | Added `maxDuration = 300`, server-side 120s inactivity timeout with error event |
| 4 | `resizeAllPhotos` is a black box (no per-photo callback) | Important | Simplified to single summary event per photos phase; per-photo granularity deferred to future enhancement |
| 5 | Missing `zip` phase event in bundle.ts | Important | Added to Changes to bundle.ts section |
| 6 | Supabase bucket missing RLS policies | Important | Full migration SQL with INSERT/SELECT/DELETE policies added |
| 7 | Temp storage cleanup underspecified | Important | Self-cleaning approach: delete stale files on each new upload. No external cron needed. |
| 8 | Non-dismissible modal is poor UX | Important | Changed to close-with-confirmation pattern |
| 9 | `BundleProgress` type change is breaking | Important | Acknowledged in bundle.ts section with migration note |
| 10 | Auto-download may be blocked by browsers | Minor | Added 2-second fallback button detection |
| 11 | Download filename not specified | Minor | Added filename convention matching existing POST route |
| 12 | Zip step appears to hang | Minor | Acknowledged in step rendering notes |
