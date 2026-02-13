# AI Workflow Test Bench — Design

**Date:** 2026-02-09
**Status:** Approved

## Overview

A new admin page at `/admin/test` where admins can select from saved property presets, manage custom presets, and fire the AI generation workflow — then get redirected to the existing `/create` results page to view the full CampaignKit output.

**Goal:** Eliminate repetitive manual property entry during AI workflow testing.

## Data Model

### Supabase Table: `test_presets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, default gen_random_uuid() |
| `name` | text | Display name (e.g. "Luxury Bozeman Home") |
| `listing_data` | jsonb | Full `ListingData` object |
| `created_by` | uuid | FK to auth.users |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

- RLS: admin-only read/write
- Ships with 3 seed presets (luxury, starter, rural)

## Seed Presets

1. **"Luxury Bozeman Home"** — $850K, 4bd/3ba, 2,800 sqft, Single Family. Mountain views, gourmet kitchen, heated garage.
2. **"Starter Condo in Missoula"** — $275K, 2bd/1ba, 950 sqft, Condo. Updated appliances, community pool, close to campus.
3. **"Rural Ranch in Helena"** — $525K, 3bd/2ba, 1,600 sqft on 5 acres, Ranch. Horse-ready, well water, workshop/barn.

## UI Design

### Admin Test Page (`/admin/test`)

- New "AI Test" sidebar nav item
- Page title: "AI Workflow Test Bench"
- **Preset grid:** Cards showing name, property type, price, city/state
  - Each card: Select, Edit (pencil), Delete (trash)
  - "Create Preset" button opens form
  - Selected preset highlights visually
- **Generate section:** Appears when preset selected
  - Shows preset summary (name, price, beds/baths, city)
  - "Generate Campaign" button fires the workflow

### Create/Edit Preset Form

- Compact form matching `ListingData` shape
- Address fields, price, beds, baths, sqft, property type
- Features list, description, selling points
- Photos as URLs (no upload)
- Save / Cancel buttons

## Integration with `/create`

1. Admin hits "Generate" on test page
2. Test page calls `/api/generate` with preset's `ListingData`
3. On success, stores `CampaignKit` in sessionStorage
4. Redirects to `/create?source=test`
5. Create page detects `source=test`, reads sessionStorage, renders results
6. "Back to Test Bench" link shown in test mode

### Why sessionStorage?

- `CampaignKit` too large for URL params
- Auto-clears on tab close
- Zero backend changes to existing `/create` page

## Server Actions

Following existing pattern in `users/actions.ts`:
- `getPresets()` — fetch all presets
- `createPreset(data)` — insert new preset
- `updatePreset(id, data)` — update existing
- `deletePreset(id)` — remove preset

## File Plan

### New Files

| File | Purpose |
|------|---------|
| `src/app/admin/test/page.tsx` | Test bench page |
| `src/app/admin/test/actions.ts` | Preset CRUD server actions |
| `src/components/admin/preset-card.tsx` | Preset display card |
| `src/components/admin/preset-form.tsx` | Create/edit form |
| `src/lib/types/preset.ts` | TestPreset type |

### Modified Files

| File | Change |
|------|--------|
| `src/components/admin/sidebar.tsx` | Add "AI Test" nav item |
| `src/app/create/page.tsx` | Handle `source=test` + sessionStorage |

## Out of Scope

- Test history / run log
- Side-by-side comparison of runs
- Automated regression testing
- Photo upload for presets (URL-only)
