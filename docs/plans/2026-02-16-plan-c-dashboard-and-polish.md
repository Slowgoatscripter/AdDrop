# Plan C: Dashboard + Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix campaign card mockup layout for desktop usability (dual-view with edit panel + mobile preview), fix inline editing readability, enrich the dashboard with property data, search/filter/sort, quick actions, and responsive layout. Fix theme consistency (hardcoded colors to tokens). Address accessibility gaps.

**Architecture:** Campaign cards get a two-panel desktop layout: wide edit/content panel on the left, mobile mockup preview on the right. Dashboard enhancement is primarily in src/app/dashboard/page.tsx with new client sub-components. Theme fixes target property-form.tsx and platform-selector.tsx.

**Tech Stack:** Next.js 15, React 19, Supabase, shadcn/ui, Tailwind CSS, Lucide React, Jest

**Prerequisite:** Plans A and B should be completed first.

---

## Task 0a: Fix EditableText contrast and usability (10 min)

**File:** `src/components/campaign/editable-text.tsx`

### Problem
The textarea uses `bg-background` which resolves to the app's dark theme background color, making text unreadable when editing inside white mockup interiors. The `min-h-[100px]` and narrow width make the edit experience cramped.

### Steps

1. In the textarea element (edit mode), replace `bg-background` with explicit readable styling:
   - Change: `className="w-full min-h-[100px] p-2 text-sm rounded border border-border bg-background ..."`
   - To: `className="w-full min-h-[120px] p-3 text-sm rounded-lg border-2 border-primary/30 bg-white text-gray-900 shadow-sm ..."`
2. Similarly fix the `<input>` element for single-line mode with the same explicit colors.
3. Make Save/Cancel buttons more prominent: add `variant="default"` to Save (filled), keep Cancel as `variant="ghost"`.
4. Add a subtle label above the textarea: `<span className="text-xs font-medium text-muted-foreground mb-1 block">Edit text</span>`
5. Increase the character count visibility with slightly larger text.

### Verify
- Textarea is clearly readable with white background and dark text regardless of surrounding mockup theme
- Save/Cancel buttons are easy to find and click
- Character count is visible

---

## Task 0b: Desktop dual-view layout for campaign cards (30 min)

**Files:**
- Modify: `src/components/campaign/campaign-tabs.tsx`
- Create: `src/components/campaign/card-layout-wrapper.tsx`
- Modify: All card components (remove `max-w-md` from outer wrapper, add layout prop)

### Problem
All cards are pinned to `max-w-md` (448px) in a single centered column. On desktop, this wastes space and makes inline editing awkward inside the narrow phone mockup.

### Design
A new `CardLayoutWrapper` component provides two layout modes:

**Desktop (lg+):** Two-panel side-by-side layout
- **Left panel (flex-1, min-w-0):** Full-width content area with the ad text displayed in a readable, comfortable editing surface. Contains: platform header, compliance/quality badges, the generated text (editable via EditableText), copy/export controls, violation details. This is NOT inside a phone frame — it's a clean document-style view.
- **Right panel (w-[375px] flex-shrink-0):** The existing phone/card mockup as a faithful preview. Read-only. Syncs with edits from the left panel in real-time.

**Mobile/Tablet (<lg):** Single column, cards render as they do today (mockup view with EditableText inside).

### Steps

1. Create `src/components/campaign/card-layout-wrapper.tsx`:
   ```typescript
   'use client';
   import { ReactNode } from 'react';

   interface CardLayoutWrapperProps {
     editPanel: ReactNode;    // Wide edit view (left on desktop)
     previewPanel: ReactNode; // Phone/card mockup (right on desktop)
   }

   export function CardLayoutWrapper({ editPanel, previewPanel }: CardLayoutWrapperProps) {
     return (
       <div className="w-full">
         {/* Desktop: side-by-side */}
         <div className="hidden lg:flex gap-6 items-start">
           <div className="flex-1 min-w-0">
             {editPanel}
           </div>
           <div className="w-[375px] flex-shrink-0 sticky top-4">
             {previewPanel}
           </div>
         </div>
         {/* Mobile: mockup only */}
         <div className="lg:hidden flex justify-center">
           <div className="w-full max-w-md">
             {previewPanel}
           </div>
         </div>
       </div>
     );
   }
   ```

2. For each listing/social card, refactor to expose an "edit panel" view:
   - The edit panel shows: platform name/icon header, the generated text in a wide readable format with EditableText, compliance badges, character count, copy button
   - The preview panel is the existing mockup (phone frame for social, card frame for listings) — keep it read-only at the `max-w-md` size
   - Use `CardLayoutWrapper` to combine them

3. In `campaign-tabs.tsx`, change the tab content layout:
   - Remove `items-center` from tab content (let cards take full width)
   - Each card renders via `CardLayoutWrapper` on desktop

4. For cards that DON'T need dual view (simple cards like Google Ads text ads), keep the current centered layout.

### Implementation priority
Start with the listing cards (Zillow, Realtor, Homes/Trulia, MLS) and social cards (Instagram, Facebook, Twitter) since those benefit most from the wide edit view. Leave paid/print cards for a follow-up if needed.

### Verify
- On desktop (lg+): cards show side-by-side edit panel + mobile preview
- On mobile: cards show the mockup view as before
- Editing in the left panel updates the right panel preview
- Layout is responsive and doesn't break at breakpoints

---

## Task 1: Dashboard — Enrich campaign cards with property data (15 min)

**File:** `src/app/dashboard/page.tsx`

### Steps

1. In the campaign card rendering section, extract `listing_data` from each campaign object (check both `campaign.listing_data` and `campaign.generated_ads?.listing_data` as fallback).
2. Destructure the relevant fields: `address`, `price`, `beds`, `baths`, `sqft`, `propertyType`, `photos`.
3. Replace the current campaign name as primary title with the property `address` (fall back to `campaign.name` if no address).
4. Add a formatted price line below the title using `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`.
5. Add a stat line showing beds/baths/sqft: e.g., `3 bd | 2 ba | 1,850 sqft`. Use `Intl.NumberFormat` for sqft comma formatting. Only render stats that exist.
6. Add a small `propertyType` tag/badge (e.g., "Single Family", "Condo") using `<Badge variant="outline">`.
7. If `photos` array has at least one entry, render a thumbnail using `<Image>` from next/image with `width={80} height={60}` and `className="rounded object-cover"`. Add the domain to `next.config` `images.remotePatterns` if needed.
8. Wrap the photo + text in a flex row so the thumbnail sits to the left of the text content.

### Verify
- Cards display property address, price, stats, type badge, and thumbnail when data is present.
- Cards degrade gracefully when listing_data fields are missing.

---

## Task 2: Dashboard — Add platform icons to cards (10 min)

**File:** `src/app/dashboard/page.tsx`

### Steps

1. Parse `campaign.platform` — it is a comma-separated string (e.g., `"facebook,instagram,google"`). Split on comma and trim whitespace.
2. Create a mapping object from platform name to Lucide icon and color: `{ facebook: { icon: Facebook, color: 'text-blue-500' }, instagram: { icon: Instagram, color: 'text-pink-500' }, google: { icon: Globe, color: 'text-green-500' } }`. Import appropriate Lucide icons.
3. Render a row of small icon badges in the card footer area. Each badge is the icon at `size={14}` with its color class.
4. If `selectedPlatforms` exists in `generated_ads`, prefer that over the `platform` column.
5. Add a `title` attribute on each icon element with the platform name for hover context.

### Verify
- Platform icons appear on each card corresponding to the campaign's platforms.
- Icons display correct colors and names on hover.

---

## Task 3: Dashboard — Add compliance and quality badges to cards (10 min)

**File:** `src/app/dashboard/page.tsx`

### Steps

1. Extract `complianceResult` from `campaign.generated_ads` JSONB. Check for `complianceResult.violations` array or `complianceResult.pass` boolean.
2. If compliance passed (no violations or pass === true), show a green `<Badge>` with a `CheckCircle` icon and "Compliant".
3. If violations exist, show a yellow or red `<Badge>` with `AlertTriangle` icon and count like "2 violations".
4. Extract `qualityResult` from `campaign.generated_ads`. Look for an overall score (e.g., `qualityResult.overallScore` or `qualityResult.score`).
5. Show a quality score badge: green for 8+, yellow for 6-7, red for below 6. Display as "Quality: 8/10".
6. Position both badges in the card footer, next to platform icons, using a flex-wrap row with `gap-2`.

### Verify
- Compliance and quality badges render correctly for campaigns with generated ads.
- Campaigns without generated ads (drafts) show no badges — no errors.

---

## Task 4: Dashboard — Relative date formatting (5 min)

**File:** `src/app/dashboard/page.tsx`

### Steps

1. Create a helper function `formatRelativeDate(dateString: string): string` at the top of the file or in a utils file.
2. Calculate the difference between now and the date in milliseconds.
3. Return:
   - Under 1 minute: "Just now"
   - Under 1 hour: "X minutes ago"
   - Under 24 hours: "X hours ago"
   - Under 48 hours: "Yesterday"
   - Under 7 days: "X days ago"
   - 7+ days: formatted date with `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`
4. Replace the existing `toLocaleDateString()` call with `formatRelativeDate(campaign.created_at)`.
5. Add a `title` attribute on the date element with the full ISO date for hover precision.

### Verify
- Recent campaigns show relative time, older ones show full date.
- Hovering reveals the exact timestamp.

---

## Task 5: Dashboard — Add breadcrumbs (5 min)

**Files:** `src/app/dashboard/page.tsx`, `src/app/campaign/[id]/page.tsx` (if it exists)

### Steps

1. Import the existing `Breadcrumbs` component from `src/components/nav/breadcrumbs.tsx`.
2. Review the Breadcrumbs component API — check what props it expects (likely an array of `{ label, href }` objects).
3. In `src/app/dashboard/page.tsx`, add `<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard' }]} />` above the main content.
4. If a campaign detail page exists at `src/app/campaign/[id]/page.tsx`, add breadcrumbs there: `Home > Dashboard > [Property Address or Campaign Name]`.
5. Style the breadcrumbs container with `className="mb-4"` for spacing.

### Verify
- Breadcrumbs render on dashboard page.
- Navigation links work correctly.

---

## Task 6: Dashboard — Search and filter bar (20 min)

**Files:** NEW `src/components/dashboard/campaign-filters.tsx`, `src/app/dashboard/page.tsx`

### Steps

1. Create `src/components/dashboard/campaign-filters.tsx` as a `"use client"` component.
2. Import `useRouter`, `useSearchParams`, `usePathname` from `next/navigation`.
3. Add a text search `<Input>` with a search icon, placeholder "Search by address or name...". On change, debounce 300ms, then update URL param `?q=searchTerm` using `router.replace`.
4. Add a platform multi-select filter. Use a shadcn `<DropdownMenu>` or `<Popover>` with checkboxes for each platform (Facebook, Instagram, Google, etc.). Update URL param `?platforms=facebook,instagram`.
5. Add a status filter with radio-style buttons or a `<Select>` for: All, Draft, Generated, Exported. URL param: `?status=draft`.
6. Add a sort `<Select>` with options: Newest first, Oldest first, Price (high to low), Price (low to high). URL param: `?sort=newest`.
7. Wire all inputs to read their initial state from `searchParams` so the UI stays in sync with the URL.
8. In `src/app/dashboard/page.tsx`, read the search params from the `searchParams` prop (Next.js server component).
9. Update the Supabase query to apply filters:
   - `q` param: use `.or()` with `ilike` on `name` and `listing_data->>address`
   - `platforms` param: use `.contains()` or filter in JS after fetch
   - `status` param: use `.eq('status', status)`
   - `sort` param: use `.order()` with appropriate column and ascending/descending
10. Render `<CampaignFilters />` above the campaign list in the dashboard.

### Verify
- Typing in search filters campaigns by address or name.
- Platform, status, and sort filters update the displayed campaigns.
- URL params persist on page refresh.
- Empty states show "No campaigns match your filters" message.

---

## Task 7: Dashboard — Quick actions menu (15 min)

**Files:** `src/app/dashboard/page.tsx`, NEW `src/components/dashboard/campaign-actions.tsx`

### Steps

1. Create `src/components/dashboard/campaign-actions.tsx` as a `"use client"` component.
2. Import `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from shadcn.
3. Import `MoreVertical`, `Eye`, `FileDown`, `FileSpreadsheet`, `Trash2` icons from Lucide.
4. Props: `campaignId: string`, `campaignName: string`.
5. Render a `<DropdownMenu>` triggered by a `<Button variant="ghost" size="icon">` with `<MoreVertical />`.
6. Menu items:
   - **View**: `<Link href={/campaign/${campaignId}}>` wrapped in DropdownMenuItem with `<Eye />` icon.
   - **Export PDF**: onClick handler that calls an export API or triggers download (stub for now with a toast "PDF export coming soon").
   - **Export CSV**: Same pattern, stub with toast.
   - **Delete**: onClick opens a confirmation dialog.
7. For delete confirmation, use shadcn `<AlertDialog>` with title "Delete Campaign", description "Are you sure you want to delete '{campaignName}'? This action cannot be undone.", and Confirm/Cancel buttons.
8. On delete confirm, call a server action or API route that deletes from Supabase `campaigns` table by id. Then `router.refresh()` to update the list.
9. Add `<CampaignActions campaignId={campaign.id} campaignName={campaign.name} />` to each campaign card, positioned top-right with absolute positioning.

### Verify
- Three-dot menu appears on each card.
- View navigates to the campaign detail page.
- Delete shows confirmation and removes the campaign on confirm.
- Export options show placeholder toasts.

---

## Task 8: Dashboard — Grid/list view toggle (15 min)

**Files:** NEW `src/components/dashboard/view-toggle.tsx`, `src/app/dashboard/page.tsx`

### Steps

1. Create `src/components/dashboard/view-toggle.tsx` as a `"use client"` component.
2. Import `LayoutGrid`, `List` icons from Lucide.
3. Accept a prop `onChange: (view: 'grid' | 'list') => void` and `defaultView: 'grid' | 'list'`.
4. Use `useState` initialized from `localStorage.getItem('dashboard-view') || defaultView`.
5. Render two icon buttons side by side with active state styling (e.g., `bg-muted` for active, ghost for inactive).
6. On click, update state, save to `localStorage`, and call `onChange`.
7. In the dashboard, this needs to be a client boundary. Create a wrapper client component `src/components/dashboard/campaign-grid.tsx` that:
   - Receives the campaigns data as a prop (serialized from server component).
   - Manages grid/list view state.
   - Renders `<ViewToggle />` in the filter bar area.
   - In **list view**: render campaigns in a vertical stack with compact rows (similar to current layout but enhanced with the new card data).
   - In **grid view**: render campaigns in a responsive CSS grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`) with photo-forward card layout.
8. Pass campaigns from the server component to this client wrapper.

### Verify
- Toggle switches between grid and list views.
- Preference persists across page refreshes via localStorage.
- Both views display all campaign card data correctly.
- Responsive: grid collapses to fewer columns on smaller screens.

---

## Task 9: Dashboard — Summary stats bar (10 min)

**Files:** NEW `src/components/dashboard/stats-bar.tsx`, `src/app/dashboard/page.tsx`

### Steps

1. Create `src/components/dashboard/stats-bar.tsx` as a server component (or accept data as props).
2. In the dashboard page, query Supabase for aggregate data:
   - Total campaigns: `campaigns.length` or a count query.
   - This month: filter by `created_at` >= first day of current month.
   - Most used platform: count occurrences across all `platform` values, find the max.
   - Average quality score: extract `qualityResult.overallScore` from each campaign's `generated_ads`, compute average.
3. Render four stat cards in a responsive grid (`grid-cols-2 md:grid-cols-4 gap-4`).
4. Each card: icon + label on top, large number below. Use shadcn `<Card>` with padding.
5. Icons: `BarChart3` for total, `CalendarDays` for this month, `Trophy` for most used platform, `Star` for avg quality.
6. Place the stats bar between the welcome section and the campaign list.

### Verify
- Stats display correct aggregate values.
- Stats update as campaigns are added/removed.
- Cards are responsive and look good on mobile.

---

## Task 10: Fix .dark CSS variables in globals.css (10 min)

**File:** `src/app/globals.css`

### Steps

1. Open `globals.css` and locate the `.dark` class selector block.
2. Review the `:root` variables — the app uses a bespoke dark theme with gold/cream/sage palette as the default.
3. Decision: If the app is dark-only (no light mode toggle), the cleanest fix is to **remove the `.dark` block entirely** so there are no conflicting generic defaults.
4. If a light mode may be needed in the future, instead update `.dark` variables to exactly match `:root` values, making `.dark` a no-op.
5. Search the codebase for any `dark:` Tailwind prefixes. If none are used meaningfully, removing `.dark` is safe.
6. Verify `<html>` tag in the root layout — if it has `class="dark"`, the `.dark` block is actively applying. Either remove the class or fix the variables.

### Verify
- No visual changes to the app (the correct bespoke dark theme still renders).
- No conflicting CSS variable values between `:root` and `.dark`.

---

## Task 11: Convert property-form.tsx to theme tokens (15 min)

**File:** `src/components/campaign/property-form.tsx`

### Steps

1. Search the file for all hardcoded color classes. Target replacements:
   - `bg-white` → `bg-card`
   - `text-slate-900` → `text-foreground`
   - `text-slate-700` → `text-card-foreground`
   - `text-slate-500` → `text-muted-foreground`
   - `text-slate-400` → `text-muted-foreground`
   - `border-slate-200` → `border-border`
   - `border-slate-300` → `border-border`
   - `bg-slate-50` → `bg-muted`
   - `bg-slate-100` → `bg-muted`
   - `hover:bg-slate-50` → `hover:bg-muted`
   - `hover:bg-slate-100` → `hover:bg-muted`
   - `focus:ring-slate-*` → `focus:ring-ring`
2. Apply each replacement carefully. Some may appear in conditional classes — preserve the conditional logic.
3. Check for any `dark:` prefixes that should be removed since the theme tokens handle both modes.

### Verify
- Property form renders with the correct dark theme colors (gold/cream/sage palette).
- No visual regressions — inputs, labels, sections all look correct.
- No remaining slate/white hardcoded classes in the file.

---

## Task 12: Convert platform-selector.tsx to theme tokens (10 min)

**File:** `src/components/campaign/platform-selector.tsx`

### Steps

1. Search the file for hardcoded color classes. Target replacements:
   - `bg-white` → `bg-card`
   - `text-slate-900` → `text-foreground`
   - `text-slate-700` → `text-card-foreground`
   - `text-slate-500` → `text-muted-foreground`
   - `border-slate-200` → `border-border`
   - `bg-slate-50` → `bg-muted`
   - `hover:bg-slate-50` → `hover:bg-muted`
   - `hover:border-slate-300` → `hover:border-border`
2. Apply replacements, preserving conditional logic and dynamic classes.
3. Remove unnecessary `dark:` prefixes.

### Verify
- Platform selector cards render with correct theme colors.
- Selected and unselected states are visually distinct.
- No remaining hardcoded slate/white classes.

---

## Task 13: Fix quality-suggestions-panel.tsx hardcoded colors (10 min)

**File:** `src/components/campaign/quality-suggestions-panel.tsx`

### Steps

1. Search for hardcoded color classes. Target replacements:
   - `bg-gray-100` → `bg-muted`
   - `text-gray-700` → `text-muted-foreground`
   - `text-gray-500` → `text-muted-foreground`
   - `bg-amber-100` → `bg-yellow-500/10` (theme-aware amber tint)
   - `text-amber-700` → `text-yellow-500` (visible on dark background)
   - `bg-emerald-50` → `bg-green-500/10`
   - `border-emerald-200` → `border-green-500/20`
   - `text-emerald-700` → `text-green-500`
   - `bg-red-50` → `bg-destructive/10`
   - `text-red-700` → `text-destructive`
2. For category badges or score indicators, use opacity-based colors (e.g., `bg-green-500/10 text-green-400`) that work on dark backgrounds.
3. Ensure sufficient contrast for all text on the dark background.

### Verify
- Quality suggestions panel renders with theme-consistent colors.
- Score categories (good, warning, poor) are visually distinguishable.
- Text is readable on the dark background.

---

## Task 14: Fix mls-input-form.tsx error state colors (5 min)

**File:** `src/components/mls-input-form.tsx`

### Steps

1. Find the error state styling block (likely a conditional class with `bg-red-50 border-red-200 text-red-700`).
2. Replace with theme-aware destructive tokens:
   - `bg-red-50` → `bg-destructive/10`
   - `border-red-200` → `border-destructive/20`
   - `text-red-700` → `text-destructive`
3. If there are success states with green colors, apply similar treatment:
   - `bg-green-50` → `bg-green-500/10`
   - `border-green-200` → `border-green-500/20`
   - `text-green-700` → `text-green-500`

### Verify
- Error messages display with visible red tint on the dark background.
- Error state is clearly distinguishable from normal state.

---

## Task 15: Accessibility — Phone and browser frame aria-hidden (5 min)

**Files:** `src/components/phone-frame.tsx`, `src/components/browser-frame.tsx`

### Steps

1. In `phone-frame.tsx`, locate the status bar element (battery, signal, time indicators) and the home indicator (bottom bar). Add `aria-hidden="true"` to their container divs.
2. In `browser-frame.tsx`, locate the tab bar and browser chrome elements (URL bar, navigation buttons, dots). Add `aria-hidden="true"` to their container divs.
3. These are purely decorative elements that should not be announced by screen readers.

### Verify
- Screen reader testing (or DOM inspection) confirms decorative elements are hidden from accessibility tree.
- Visual appearance is unchanged.

---

## Task 16: Accessibility — Tone switcher radiogroup semantics (5 min)

**File:** `src/components/tone-switcher.tsx` (or similar name)

### Steps

1. Find the wrapper element that contains the tone option buttons.
2. Add `role="radiogroup"` to the wrapper element.
3. Add `aria-label="Select tone"` to the wrapper element.
4. On each individual tone button, add `aria-pressed={selectedTone === tone}` (for toggle buttons) or switch to `role="radio"` with `aria-checked={selectedTone === tone}`.
5. Ensure each button also has an accessible label (the tone name text should suffice if visible).

### Verify
- Wrapper has `role="radiogroup"` and `aria-label`.
- Each tone button communicates its selected state to assistive technology.

---

## Task 17: Accessibility — Fix violation-details text-green-400 contrast (5 min)

**File:** `src/components/violation-details.tsx`

### Steps

1. Go to approximately line 116 where `text-green-400` is used for a suggested alternative.
2. Replace `text-green-400` with `text-green-300` or `text-emerald-300` — these provide better contrast on dark backgrounds while still reading as "green/positive".
3. Alternatively, use `text-green-500` if the background is dark enough (check against `bg-surface` or `bg-card`).
4. Verify the contrast ratio meets WCAG AA (4.5:1 for normal text, 3:1 for large text) using a contrast checker.

### Verify
- Suggested alternative text is readable with sufficient contrast.
- Green color still communicates "positive/suggested" semantics visually.

---

## Task 18: Accessibility — Add aria-labels to social card icons (10 min)

**Files:** `src/components/instagram-card.tsx`, `src/components/facebook-card.tsx`

### Steps

1. In both files, find the `<MoreHorizontal />` icon. If it is not wrapped in a `<button>`, either:
   - Wrap it in `<button aria-label="More options" className="...">` or
   - Add `aria-hidden="true"` if it is purely decorative.
2. Find interactive icons (Heart, MessageCircle, Send, Bookmark, ThumbsUp, Share, etc.) and add `aria-label` attributes:
   - Heart: `aria-label="Like"`
   - MessageCircle: `aria-label="Comment"`
   - Send: `aria-label="Share"`
   - Bookmark: `aria-label="Save"`
   - ThumbsUp: `aria-label="Like"`
   - Share2: `aria-label="Share"`
3. For icons that are purely decorative (e.g., inside text that already describes the action), add `aria-hidden="true"` instead.
4. If icons are clickable but not wrapped in buttons, wrap them in `<button>` elements with appropriate aria-labels.

### Verify
- All interactive icons have accessible labels.
- Decorative icons are hidden from the accessibility tree.
- No unlabeled interactive elements remain in either component.

---

## Task 19: Accessibility — Add tooltips to badges (10 min)

**Files:** `src/components/compliance-badge.tsx`, quality badge component (check for `src/components/quality-badge.tsx` or inline in other files)

### Steps

1. Import `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from shadcn (`@/components/ui/tooltip`).
2. In `compliance-badge.tsx`, wrap the badge element with:
   ```tsx
   <Tooltip>
     <TooltipTrigger asChild>
       {/* existing badge */}
     </TooltipTrigger>
     <TooltipContent>
       <p>{violations.length} compliance violation{violations.length !== 1 ? 's' : ''}</p>
     </TooltipContent>
   </Tooltip>
   ```
3. Also add `aria-label` directly on the badge: `aria-label={`${violations.length} compliance violation${violations.length !== 1 ? 's' : ''}`}`.
4. For quality badges, add tooltip with: `Quality score: ${score}/10` and matching `aria-label`.
5. Ensure a `<TooltipProvider>` exists high enough in the component tree (check root layout). If not, wrap locally.

### Verify
- Hovering over compliance badge shows violation count tooltip.
- Hovering over quality badge shows score tooltip.
- Screen readers announce the badge purpose via aria-label.

---

## Completion Checklist

- [ ] All 19 tasks implemented
- [ ] `npm run build` passes with no errors
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No hardcoded slate/white/gray color classes remain in converted files
- [ ] All accessibility attributes added and verified
- [ ] Dashboard renders correctly with enriched cards, filters, and stats
- [ ] Grid/list toggle works and persists preference
- [ ] Quick actions menu works (View, Delete with confirmation)
- [ ] Breadcrumbs display on dashboard and campaign pages
- [ ] Run existing test suite — no regressions
