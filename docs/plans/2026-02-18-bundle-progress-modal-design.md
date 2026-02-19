# Bundle Download Progress Modal — Design Doc

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create an implementation plan from this design.

**Goal:** Replace the blind "Preparing..." button state on Download All with a modal showing real-time progress via Server-Sent Events, matching the existing campaign-generating-view stepper pattern.

**Design Doc Date:** 2026-02-18

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
  → Browser auto-downloads ZIP
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

```
event: progress
data: {"phase":"photos","detail":"Photo 2 of 5 — Instagram 1080×1080","step":1,"totalSteps":5}

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
| `photos` | 1 | `"Photo {n} of {total} — {platform} {width}×{height}"` |
| `originals` | 2 | `"Original {n} of {total}"` |
| `pdf` | 3 | `"Generating campaign PDF..."` |
| `zip` | 4 | `"Compressing files..."` |
| `done` | 5 | `"Ready"` + `downloadUrl` |

---

## API Route

### `GET /api/export/bundle/stream`

**File:** `src/app/api/export/bundle/stream/route.ts`

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
5. Call `generateBundle(campaign, onProgress)` where `onProgress` writes SSE events
6. Upload completed ZIP buffer to `temp-exports` bucket with filename `{campaignId}-{timestamp}.zip`
7. Generate signed URL (1-hour expiry) via `createSignedUrl`
8. Send `done` event with signed URL
9. Close stream

**Error handling:** Catch errors, send `error` event, close stream.

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
- Before each photo resize: `phase: "photos"` with photo index and platform name
- Before each original download: `phase: "originals"` with index
- Before PDF generation: `phase: "pdf"`
- Before `archive.finalize()`: `phase: "zip"`

The total steps count is always 5 (fixed phases shown in the stepper). The detail string provides granular sub-progress within each phase.

---

## Supabase Storage

### Bucket: `temp-exports`

- **Visibility:** Private (not public)
- **Access:** Signed URLs only, 1-hour expiry
- **Cleanup:** Supabase lifecycle policy or cron to delete objects older than 1 hour
- **Migration:** Create bucket via SQL migration or Supabase dashboard

### Signed URL

Use `supabase.storage.from('temp-exports').createSignedUrl(path, 3600)` for 1-hour access.

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
│  ● AI is preparing your files...        │
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
| **In progress** | Stepper advances per SSE events, active step has spinner, bottom bar pulses | Modal cannot be dismissed (prevent accidental close) |
| **Success** | All steps checked, "Download starting..." text | Auto-triggers download, modal auto-closes after 2 seconds |
| **Error** | Red alert with error message | "Try Again" button restarts SSE, "Close" button dismisses |

### Step Rendering (Matches campaign-generating-view)

- **Completed:** Filled primary circle + Check icon + "Done" label
- **Active:** Ring border + spinning indicator + detail text from SSE
- **Pending:** Muted border + dimmed icon

### SSE Connection Lifecycle

- Opens `EventSource` when `open` becomes `true`
- Listens to `progress` and `error` events
- On `done` event: extracts `downloadUrl`, triggers `<a>` click download, shows success, auto-closes after 2s
- On `error` event: shows error state with retry button
- On unmount or close: calls `eventSource.close()`
- On connection drop (EventSource `onerror`): shows error state

### Auto-Download Trigger

```typescript
function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

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
| Auth failure | SSE returns 401, modal shows "Session expired" error |
| Campaign not found | SSE returns 404, modal shows "Campaign not found" error |
| Photo fetch fails | Server skips that photo, continues (existing behavior in bundle.ts) |
| Sharp resize fails | Server sends error event, modal shows error with retry |
| Supabase upload fails | Server sends error event, modal shows error with retry |
| Network drop | EventSource auto-reconnects (browser default), or shows error after timeout |
| User closes modal mid-process | EventSource closes, server-side generation completes but result is discarded |

---

## Files Affected

| File | Change |
|------|--------|
| `src/app/api/export/bundle/stream/route.ts` | **New** — SSE endpoint |
| `src/lib/export/bundle.ts` | **Modify** — enhance BundleProgress interface with step/totalSteps |
| `src/components/campaign/bundle-progress-modal.tsx` | **New** — modal component |
| `src/components/campaign/campaign-shell.tsx` | **Modify** — swap handleDownloadAll for modal |
| `supabase/migrations/20260218_create_temp_exports_bucket.sql` | **New** — temp-exports bucket |

---

## Out of Scope

- Share page Download All progress (stays as synchronous POST)
- Per-card Download Photo progress (single photo, fast enough)
- Bundle content customization (select which platforms to include)
- Download history / re-download from storage
