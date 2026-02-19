# Campaign Presentation Change Document (v2)

**Date:** 2026-02-16 (updated with owner feedback)
**Review Team:** 4-agent frontend dev team + owner review session
**Scope:** Full review of the post-generation campaign presentation UI
**Note:** Major pipeline changes are planned. A smaller integration review team will re-assess after those land.

---

## Executive Summary

The campaign presentation has solid architecture and component decomposition, but falls short on **mockup parity across platforms** and has **dangerous silent error handling** on compliance features. The owner review surfaced 6 additional UX priorities: full-text visibility for social posts, a proper Twitter/X mockup, removing the print ad tilt, upgrading online listing cards, and building an MLS mockup. Combined with the team's findings, this doc covers the full scope of presentation changes needed.

| Severity | Count |
|----------|-------|
| Critical | 9 |
| High | 20 |
| Medium | 37 |
| Low | 24+ |

---

## Owner-Directed Changes (NEW)

These come directly from the product owner and take priority alongside critical fixes.

### O-1. Instagram & Facebook: Users cannot see full generated text
- **Severity:** Critical
- **Files:** `instagram-card.tsx`, `facebook-card.tsx`
- **Problem:** Instagram truncates captions at 125 characters with a decorative "... more" that does nothing. Facebook truncates at 180 characters with a decorative "See More" that also does nothing. The user paid for this generated copy and has no way to read it inside the mockup. The only escape hatch is the copy button, which copies to clipboard blindly.
- **Current behavior:**
  - Instagram: `truncateCaption(currentCaption, 125)` → renders `... more` as a non-interactive `<span>`
  - Facebook: `truncatePost(text)` at 180 chars → renders `See More` with `cursor-pointer` but no `onClick`
- **Fix:** Make "... more" (IG) and "See More" (FB) clickable to expand the full text inline within the mockup. Toggle back to truncated view on a second click. This mirrors how the real platforms work and lets users read their full ad copy in context.

### O-2. Twitter/X needs a proper platform mockup
- **Severity:** Critical
- **Files:** `ad-card.tsx` (currently used), new `twitter-card.tsx` needed
- **Problem:** Instagram and Facebook have beautiful phone-frame mockups with realistic UI chrome. Twitter/X uses the generic `ad-card.tsx` fallback — just a plain text box with a title. This inconsistency makes the Social Media tab feel half-finished.
- **Fix:** Build a dedicated `twitter-card.tsx` with:
  - Phone frame (reuse `PhoneFrame` component)
  - Twitter/X post layout: avatar, display name, @handle, timestamp, post text, image area, action bar (reply, repost, like, bookmark, share icons with seeded counts)
  - 280-character limit badge (already partially supported via `characterLimit` prop)
  - Tone switching support
  - Quality + compliance badge integration via `AdCardWrapper`

### O-3. Print ad presentation: Remove the tilt
- **Severity:** High
- **Files:** `print-ad-card.tsx`
- **Problem:** Both full-page and half-page print ads are rotated 1.5 degrees via inline `transform: 'rotate(1.5deg)'`. The owner finds this distracting rather than charming.
- **Current code:** Lines 84-91 apply `transform: 'rotate(1.5deg)'` with a two-layer box shadow and a paper-edge gradient shimmer.
- **Fix:** Remove the rotation. Present print ads flat with a clean elevated-paper look instead:
  - Remove `transform: 'rotate(1.5deg)'` from inline styles
  - Keep the box shadow (it provides good depth without the tilt)
  - Keep the paper-edge gradient shimmer if it looks good flat
  - Consider a subtle `hover:scale-[1.01]` or `hover:shadow-lg` transition for interactivity instead of the static tilt

### O-4. Online listing cards (Zillow, Realtor.com, Homes.com/Trulia) look plain
- **Severity:** High
- **Files:** `ad-card.tsx` (currently used), new dedicated cards needed
- **Problem:** These platforms all use the same generic `ad-card.tsx` — a plain text box with no platform branding, no images, no listing-style layout. Compared to the Instagram/Facebook/Google mockups, these feel like afterthoughts.
- **Fix:** Build dedicated mockup cards for online listings:
  - **`zillow-card.tsx`**: Zillow listing detail mockup — photo area, price overlay, beds/baths/sqft bar, "Zestimate" badge area, description section with agent info footer. Use Zillow's blue (#006AFF) branding.
  - **`realtor-card.tsx`**: Realtor.com listing mockup — similar structure, red branding (#D92228), "Realtor.com" header bar.
  - **`homes-trulia-card.tsx`**: Combined card for Homes.com/Trulia — green (#4CAF50) or teal branding, listing-style layout.
  - All should use `AdCardWrapper`, support tone switching, quality/compliance badges, and display the generated listing description in a realistic context.

### O-5. MLS card needs a proper mockup
- **Severity:** High
- **Files:** `mls-card.tsx`
- **Problem:** The MLS description is shown as raw text in a `bg-secondary` box. No mockup, no MLS-style presentation. For an audience of real estate agents, the MLS is arguably the most important platform — it deserves a polished presentation.
- **Fix:** Build an MLS detail mockup:
  - Header bar styled like a generic MLS system (neutral/professional, grid-style layout)
  - Property photo area with listing number badge
  - Structured fields: Status, List Price, Address, Beds/Baths/SqFt, Lot Size, Year Built
  - The generated MLS description rendered in a monospace or system font area (how agents actually see it)
  - Agent/broker attribution section
  - Character count (MLS systems have strict limits, often 1000-4000 chars depending on the MLS)

### O-6. Postcard presentation
- **Status:** Approved as-is. Owner is satisfied with the current postcard mockup including the stack effect, front/back layout, and postal indicia details. No changes needed.

### O-7. Quality suggestions and compliance rewrites must appear INLINE with each card — not as top banners
- **Severity:** Critical
- **Files:** `campaign-shell.tsx`, `campaign-tabs.tsx`, `quality-banner.tsx`, `quality-details.tsx`, `compliance-banner.tsx`, `violation-details.tsx`, all card components, `ad-card-wrapper.tsx`
- **Problem (updated per owner feedback):** Two issues:
  1. Quality scoring data is generated but never surfaced (the original wiring gap).
  2. **More importantly:** Even when wired, showing quality suggestions and compliance rewrites as top-level banners gives the user no context. They're told "Facebook has 2 quality issues" but aren't shown the actual ad copy being referenced. The feedback is disconnected from the content.
- **Owner direction:** Quality suggestions and compliance feedback should appear **next to each platform's ad mockup**, not as banners at the top. The user should see the specific text being evaluated right alongside the suggestion/violation.
- **Fix — revised approach:**
  - **Remove or demote top-level banners:** `QualityBanner` and `ComplianceBanner` should either be removed from the shell level OR reduced to a minimal summary line (e.g., "3 platforms have quality suggestions" with no detail). The detail belongs with the cards.
  - **Expand per-card quality/compliance sections:** Each platform card (via `AdCardWrapper`) should show an expandable panel below the mockup with:
    - Quality suggestions for THAT platform's specific text, with the relevant ad copy snippet quoted inline
    - Compliance violations for THAT platform, with the offending text highlighted in context
    - Before/after diffs for auto-applied changes
    - Replace/Revert buttons right next to the content they affect
  - **Wire quality data per-card:** Build `buildPlatformQualityResult()` in `campaign-tabs.tsx` (analogous to `buildPlatformResult()` for compliance) and pass `qualityResult` to each card component.
  - The user experience should be: look at the Instagram mockup → see quality suggestions right below it referencing the exact caption text → fix or accept right there.
- **Related items:** Supersedes H-17, H-18, H-19. Adjusts the integration reviewer's P0 recommendation.

### O-8. Dashboard: Historical campaigns are not clickable
- **Severity:** Critical
- **File:** `src/app/dashboard/page.tsx`
- **Problem:** The dashboard lists historical campaigns (name, platform, date, status) but the campaign cards are plain `<div>` elements with zero navigation — no `<Link>`, no `onClick`, no `href`. Users can see their campaigns but cannot view any of them. This is a dead end in the core user journey.
- **Current code:** Line 74 renders `<div key={campaign.id} className="p-4 border border-border rounded-lg bg-muted/30">` — a non-interactive container.
- **Data flow is ready:** `/campaign/[id]` already loads campaigns from Supabase by ID via `CampaignShell.loadCampaign()`. The DB fetch path works. Only the navigation link from the dashboard is missing.
- **Fix:** Replace the outer `<div>` with `<Link href={`/campaign/${campaign.id}`}>` and add hover/focus styles for interactivity feedback. Consider adding a chevron icon or "View" affordance to signal clickability.

---

## Error Handling Gap Analysis (EXPANDED)

This section provides detailed documentation of every silent failure path in `campaign-shell.tsx`. These are particularly important given upcoming pipeline changes.

### Error Path Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    campaign-shell.tsx                            │
│                                                                 │
│  LOAD PHASE                                                     │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────┐  │
│  │ Supabase DB  │────▶│ sessionStorage   │────▶│ "Not Found"│  │
│  │ fetch        │fail │ fallback         │fail │ UI shown   │  │
│  │              │     │                  │     │            │  │
│  │ Silent fail  │     │ Silent fail      │     │ ✓ Visible  │  │
│  │ console.error│     │ removes bad item │     │            │  │
│  └──────────────┘     └──────────────────┘     └────────────┘  │
│                                                                 │
│  ACTION PHASE                                                   │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────┐  │
│  │ Fix All      │     │ Replace term     │     │ Export     │  │
│  │              │     │                  │     │            │  │
│  │ !res.ok →    │     │ Replace succeeds │     │ No try/    │  │
│  │ silent return│     │ Re-check fails → │     │ catch at   │  │
│  │ No feedback  │     │ console.error    │     │ all        │  │
│  │ No toast     │     │ Stale compliance │     │ Corrupt    │  │
│  │ No error UI  │     │ data persists    │     │ download   │  │
│  └──────────────┘     └──────────────────┘     └────────────┘  │
│                                                                 │
│  PERSISTENCE                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ All fixes write to sessionStorage ONLY                   │   │
│  │ DB-loaded campaigns never persist fixes back to Supabase │   │
│  │ Tab close = all fixes lost                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### E-1. Supabase DB Fetch Failure (Lines 53-68)
- **Trigger:** Database error, network timeout, missing row, malformed `generated_ads` JSON
- **Current behavior:** `catch` logs to console, falls through silently to sessionStorage. If `data?.generated_ads` is falsy (row exists but field is null), also falls through silently.
- **User sees:** Nothing — seamless fallback to sessionStorage. If sessionStorage also empty, eventually sees "Campaign not found."
- **Risk:** Low for UX (fallback works), but the user has no idea they're viewing potentially stale sessionStorage data instead of the DB version.
- **Fix:** Show a subtle info banner: "Loaded from local cache" when falling back to sessionStorage, so users know the source.

### E-2. sessionStorage Parse Failure (Lines 72-79)
- **Trigger:** Corrupted JSON in sessionStorage (rare but possible from interrupted writes)
- **Current behavior:** `catch` silently removes the bad item. `campaign` stays `null`.
- **User sees:** "Campaign not found." — no explanation of what happened.
- **Risk:** Low frequency, but confusing when it happens. User just generated a campaign, gets told it doesn't exist.
- **Fix:** Show a more specific message: "Campaign data was corrupted. Please generate again." with a direct link to `/create`.

### E-3. Fix All API Failure (Line 98)
- **Trigger:** `/api/compliance/check` returns non-200 (server error, timeout, rate limit)
- **Current behavior:** `if (!res.ok) return;` — silent early return. `isFixing` resets in `finally` block so spinner stops, but no feedback.
- **User sees:** Button says "Fix All" → briefly shows "Fixing..." → goes back to "Fix All". Nothing happened. No error, no toast, no explanation.
- **Risk:** **HIGH.** User thinks compliance was fixed when it wasn't. They may proceed to publish non-compliant ads.
- **Fix:** Show error toast: "Auto-fix failed — please try again or fix issues manually." Set a `fixError` state that ComplianceBanner can display as a persistent warning.

### E-4. Replace Term — Compliance Re-check Failure (Lines 197-198)
- **Trigger:** Replace succeeds locally, but the follow-up `POST /api/compliance/check` fails
- **Current behavior:** Text replacement is committed to state and sessionStorage. Compliance re-check failure is caught and logged to console only. The old `complianceResult` stays in state — now stale.
- **User sees:** Green "Replaced 'X' with 'Y'" confirmation. Compliance badges/banner still show the OLD violation data. The replaced term may still show as flagged.
- **Risk:** **HIGH.** Misleading compliance status. User sees stale violations for text that's already been fixed, OR compliance passes when new text actually introduced a new violation.
- **Fix:** On re-check failure, show amber warning: "Term replaced, but compliance status may be outdated. Click to re-check." Add a manual "Re-check Compliance" button.

### E-5. Export with No Error Handling (Lines 232-245)
- **Trigger:** `/api/export` returns non-200 (server error, unsupported format, campaign too large)
- **Current behavior:** No `try/catch`, no `!res.ok` check. `res.blob()` resolves with the error response body. Browser downloads a corrupt file.
- **User sees:** A file downloads, but it's garbage (HTML error page saved as .pdf or .csv). No error message.
- **Risk:** **MEDIUM-HIGH.** User gets a broken file with no explanation. They may try to use it or send it to clients.
- **Fix:** Wrap in `try/catch`. Check `!res.ok` before blob. Show toast: "Export failed — please try again." On success, show brief "Downloaded!" confirmation.

### E-6. Replace Button Race Condition (violation-details.tsx)
- **Trigger:** User double-clicks Replace before the async operation completes
- **Current behavior:** `handleReplace` calls `onReplace(...)` and immediately sets `setFixed(true)`. No async awareness. The button has no disabled/loading state.
- **User sees:** Green confirmation instantly. But two `handleReplace` calls fire to the parent, potentially causing duplicate regex replacements or race conditions in the compliance re-check.
- **Risk:** **MEDIUM.** Could corrupt ad copy with double-replacements.
- **Fix:** Disable Replace button immediately on click. Add loading spinner. Only show green confirmation after the parent `onReplace` promise resolves.

### E-7. Persistence Gap — Fixes Not Saved to Database
- **Trigger:** User fixes compliance issues on a DB-loaded campaign, then closes/refreshes
- **Current behavior:** All fix operations write to sessionStorage only. The Supabase row is never updated.
- **User sees:** On refresh, the campaign reloads from Supabase with the ORIGINAL unfixed violations. All manual and auto-fixes are gone.
- **Risk:** **HIGH.** Users will be frustrated when their work disappears. Especially damaging if they fixed 10+ violations across platforms.
- **Fix:** After any successful fix operation (Fix All or individual Replace), persist the updated `generated_ads` back to Supabase. Show a save indicator.

---

## CRITICAL Issues (8)

### From Owner Review
- **C-1 (O-1).** Instagram & Facebook full text not accessible — "... more" and "See More" are non-interactive
- **C-2 (O-2).** Twitter/X has no platform mockup — uses generic fallback, inconsistent with other socials
- **C-8 (O-7).** Quality scores not visible at page level — quality agent runs but results aren't surfaced to the user (wasted API call)
- **C-9 (O-8).** Dashboard campaigns are not clickable — users cannot view historical campaigns despite data flow being ready

### From Team Review
- **C-3.** Silent failure on Fix All compliance action — `if (!res.ok) return` with zero feedback (see E-3)
- **C-4.** No error state on compliance banner — if check fails, banner disappears entirely (see E-1, E-3)
- **C-5.** Hard violations collapsed by default — legal liability hidden behind tiny expandable link
- **C-6.** `.dark` CSS variables are generic defaults that break the brand
- **C-7.** Missing `relative` on print-ad parent container — absolute element escapes bounds

---

## HIGH Issues (20)

### Owner-Directed UX
- **H-1 (O-3).** Print ad tilt must be removed — present flat with clean elevated-paper look
- **H-2 (O-4).** Online listing cards (Zillow, Realtor.com, Homes.com/Trulia) need dedicated mockups
- **H-3 (O-5).** MLS card needs a proper MLS-style mockup

### Error Handling & Data Integrity
- **H-4.** handleExport has no error handling — corrupt downloads (see E-5)
- **H-5.** handleReplace silently swallows re-check errors — stale compliance data (see E-4)
- **H-6.** No undo/history for Fix All — irreversible bulk rewrite with no recovery (see E-3)
- **H-7.** Compliance fixes not persisted to DB — refresh loses all work (see E-7)

### Accessibility
- **H-8.** Suggested alternative text `text-green-400` — fails WCAG AA contrast
- **H-9.** AutoFixSummary before/after diff relies on color alone — needs labels/icons for colorblind users

### Mockup Fidelity
- **H-10.** No confirmation dialog on Fix All — destructive action fires immediately
- **H-11.** Instagram carousel dots hardcoded to 5 — don't reflect actual photos
- **H-12.** Google Ads missing character limit display — headline (30) and description (90)
- **H-13.** `font-playfair` may not be loaded — verify Next.js font config
- **H-14.** Legacy `ad-card.tsx` needs migration to `AdCardWrapper` after new mockups built

### Theme & Styling
- **H-15.** property-form.tsx uses hardcoded colors instead of theme tokens
- **H-16.** platform-selector.tsx uses hardcoded colors instead of theme tokens

### Quality System
- **H-17.** QualityBanner not rendered at shell level — buried inside tabs
- **H-18.** QualityBanner has no action button — informational only, no CTA
- **H-19.** 15 quality categories in flat list is overwhelming — needs grouping

### Compliance Replace UX
- **H-20.** Replace button has no loading/disabled state — race conditions (see E-6)

---

## MEDIUM Issues (37)

### Layout & Navigation
| # | Issue | File(s) | Recommendation |
|---|-------|---------|----------------|
| M-1 | No auth/ownership check on campaign page | `campaign/[id]/page.tsx` | Add server-side auth check like create page |
| M-2 | No violation count indicators on tab headers | `campaign-tabs.tsx` | Add red dot/count badge on tabs with issues |
| M-3 | No quality score display in Strategy tab | `marketing-card.tsx` | Surface quality score summary |
| M-4 | No loading/feedback state during export | `campaign-shell.tsx` | Add exporting state, disable buttons, show spinner |
| M-5 | No generation progress indicator | `mls-input-form.tsx` | Show progress beyond "Generating..." button text |
| M-6 | No photo fallback in property header | `property-header.tsx` | Show placeholder when photos array is empty |
| M-7 | Form validation only HTML `required` | `property-form.tsx` | Add client-side validation (price > 0, reasonable ranges) |

### Compliance & Quality UX
| # | Issue | File(s) | Recommendation |
|---|-------|---------|----------------|
| M-8 | Badge combines hard+soft into single number | `compliance-badge.tsx` | Show separate counts or "2/1" format |
| M-9 | No tooltip/aria-label on badges | `compliance-badge.tsx` | Add descriptive tooltips |
| M-10 | 12 violation category colors overlap perceptually | `violation-details.tsx` | Add icons per category, don't rely on color alone |
| M-11 | Violations not sorted by severity | `violation-details.tsx` | Group hard first, then soft |
| M-12 | "Fixed" state is local useState, can desync | `violation-details.tsx` | Derive from actual data instead |
| M-13 | Fix All progress not shown per-platform | `compliance-banner.tsx` | Show step indicator during fix |
| M-14 | Quality score buried mid-sentence | `quality-banner.tsx` | Give score its own visual treatment (gauge/badge) |
| M-15 | Category breakdown string can get very long | `quality-banner.tsx` | Cap at top 3 + "and N more" |
| M-16 | No "Revert All" for quality changes | `quality-details.tsx` | Add bulk revert option |
| M-17 | No "Re-apply" after reverting a quality fix | `quality-details.tsx` | Add re-apply button |
| M-18 | "Why this matters" content is generic | `quality-details.tsx` | Provide category-specific rationale |
| M-19 | No score context (what does 7/10 mean?) | `quality-badge.tsx` | Tooltip: "Great (8+)" / "Needs Work (6-7)" / "Poor (<6)" |

### Mockup Cards
| # | Issue | File(s) | Recommendation |
|---|-------|---------|----------------|
| M-20 | Hardcoded agent phone/license in print | `print-ad-card.tsx`, `postcard-card.tsx` | Derive from listing data |
| M-21 | "JUST LISTED" banner is hardcoded | `postcard-card.tsx` | Make configurable (Price Reduced, Open House, etc.) |
| M-22 | Postcard back text may overflow | `postcard-card.tsx` | Add `overflow-y-auto` or truncation |
| M-23 | Half-page print layout aspect ratio conflicts | `print-ad-card.tsx` | Test at various breakpoints |
| M-24 | Meta primary text has no character limit display | `meta-ad-card.tsx` | Add badge (125 recommended / 2000 max) |
| M-25 | "Jane Doe" hardcoded in Meta card | `meta-ad-card.tsx` | Use listing data or generic placeholder |
| M-26 | Unused ViolationDetails import | `google-ads-card.tsx` | Remove dead import |

### Accessibility
| # | Issue | File(s) | Recommendation |
|---|-------|---------|----------------|
| M-27 | MoreHorizontal icon not wrapped in button | `instagram-card.tsx`, `facebook-card.tsx` | Add button wrapper or aria-hidden |
| M-28 | Action icons lack aria-labels | `instagram-card.tsx`, `facebook-card.tsx` | Add aria-labels or aria-hidden |
| M-29 | Phone/browser frame chrome not aria-hidden | `phone-frame.tsx`, `browser-frame.tsx` | Add `aria-hidden="true"` to decorative elements |
| M-30 | Tone switcher lacks radiogroup semantics | `tone-switcher.tsx` | Add `role="radiogroup"` and `aria-pressed` |

### Design Consistency
| # | Issue | File(s) | Recommendation |
|---|-------|---------|----------------|
| M-31 | Card max-width varies across platforms | All cards | Document intent or normalize outer wrapper |
| M-32 | Error state uses hardcoded light colors | `mls-input-form.tsx` | Use `bg-destructive/10` theme tokens |
| M-33 | Dark mode strategy is ambiguous | `globals.css`, `tailwind.config.ts` | Clarify: remove `.dark` vars or design proper light mode |
| M-34 | `seededRandom` copy-pasted across 3 files | `instagram-card.tsx`, `facebook-card.tsx`, `meta-ad-card.tsx` | Extract to shared utility |
| M-35 | Cards return `null` with no empty state | `google-ads-card.tsx`, `print-ad-card.tsx`, `postcard-card.tsx` | Add graceful empty state UI |
| M-36 | No lazy loading on external images | `mockup-image.tsx` | Add `loading="lazy"` to `<img>` element |
| M-37 | `transition-all` on platform selector cards | `platform-selector.tsx` | Use `transition-colors` for consistency |

---

## Owner-Directed: Inline Ad Copy Editing + Redo with Tone (NEW)

### O-9. Users must be able to edit ad copy text inline
- **Severity:** Critical
- **Files:** All platform card components, `campaign-shell.tsx`, `campaign-tabs.tsx`
- **Problem:** Users cannot edit any generated ad copy. The text is read-only across every platform card. If a user wants to tweak a headline, fix a phrase, or customize copy for their voice, they have no way to do it within the app. They'd have to copy the text out, edit it externally, and lose the mockup context entirely.
- **Fix:** Add inline editing to every platform card's text content:
  - Click-to-edit or an "Edit" button on each text field (caption, post text, headline, description, body copy)
  - Editable state with a text area styled to match the mockup context
  - Save/cancel buttons with the edited text persisting to the campaign state
  - Persist edits back to Supabase (update the `generated_ads` JSONB)
  - After editing, re-run compliance check on the modified text and update badges
  - Mark the campaign as "user-edited" so the system knows not to overwrite custom copy
- **Important:** Edited text must be carried forward into any subsequent agent calls (redo, tone change, compliance rewrite). The user's edits are the new source of truth.

### O-10. "Redo with Tone" button per platform
- **Severity:** High
- **Files:** All platform card components, new API endpoint needed, `campaign-shell.tsx`
- **Problem:** If a user doesn't like the generated copy for a specific platform, they have no option to regenerate just that platform's ad with a different tone or approach. Their only option is to regenerate the entire campaign.
- **Fix:** Add a "Redo" or "Regenerate" button per platform card:
  - Button with a dropdown/selector for tone (Professional, Casual, Luxury, Witty, etc.)
  - Fires a targeted API call to regenerate ONLY that platform's ad copy with the selected tone
  - The API call receives the current listing data + any user edits as context
  - On success, update that platform's copy in the campaign state and persist to DB
  - Re-run compliance and quality checks on the new copy
  - Show loading state on just that card while regeneration happens
  - Keep the old copy accessible via an "Undo" option for ~30 seconds
- **Architecture note:** This requires a new lightweight API endpoint (e.g., `POST /api/regenerate-platform`) that takes `{ campaignId, platform, tone, currentCopy?, listingData }` and returns updated copy for just that platform. This is much cheaper than regenerating the full campaign.

---

## Dashboard Improvements (NEW — from review team)

All suggestions approved by owner. Organized by implementation effort.

### Quick Wins
| # | Suggestion | Description |
|---|-----------|-------------|
| D-1 | **Make campaign cards clickable** | Wrap in `<Link href="/campaign/{id}">`. Already documented as O-8/C-9. |
| D-2 | **Enrich cards with property data** | Show address (primary title), price, beds/baths/sqft, property type from `listing_data` JSONB already in DB |
| D-3 | **Platform icons on cards** | Parse platform column, render small colored icons per platform using existing `PlatformOption` icons |
| D-4 | **Compliance status badge on cards** | Extract `complianceResult` from `generated_ads` JSONB, show green check or yellow warning |
| D-5 | **Relative date formatting** | "2 hours ago" / "Yesterday" for recent, full date for >7 days. Add `updated_at` if different from `created_at` |
| D-6 | **Add breadcrumbs** | Component exists at `src/components/nav/breadcrumbs.tsx` but isn't used. Add: Home > Dashboard > [Property Address] |

### Medium Effort
| # | Suggestion | Description |
|---|-----------|-------------|
| D-7 | **Search/filter/sort bar** | Text search by address, filter by platform/status, sort by date/price. Use URL search params for shareability |
| D-8 | **Quick actions menu per card** | Three-dot menu: View, Export PDF/CSV, Duplicate, Delete (with confirmation) |
| D-9 | **Quality score on cards** | Show `qualityResult.overallScore` from JSONB as color-coded score indicator |
| D-10 | **Grid/list view toggle** | Grid shows photo thumbnails from `listing_data.photos`, list is compact. Persist preference in localStorage |
| D-11 | **Dashboard summary stats bar** | 3-4 stat cards: total campaigns, this month, most-used platform, avg quality score |
| D-12 | **Better CTA placement** | FAB on mobile, "+" card at end of grid, gray out when usage limit reached |

### Larger Effort
| # | Suggestion | Description |
|---|-----------|-------------|
| D-13 | **Status lifecycle expansion** | Add "reviewed" and "published" states. Show as progress indicator pill on cards |
| D-14 | **Bulk operations** | Multi-select with checkboxes, bulk export PDF/CSV, bulk delete |
| D-15 | **Pinned/recent campaigns** | Quick-access section at top for active listings. Track in localStorage or DB |
| D-16 | **Responsive layout** | 2-column grid on desktop, touch-friendly mobile cards with 44px min tap targets |
| D-17 | **WelcomeCard improvements** | "How it works" 3-step flow, sample output preview, social proof, more prominent CTA |
| D-18 | **BetaUsageCard engagement** | Usage streaks, countdown timer for limit reset, motivational copy at 0 remaining |

---

## Pipeline Integration Findings

### Quality Data — Partially Fixed, Partially Broken
The quality pipeline was redesigned. Shell-level quality is now addressed via a new `QualitySuggestionsPanel` with Apply/Dismiss actions. However:
- **Per-card quality data is still NOT wired.** `campaign-tabs.tsx` has no `buildPlatformQualityResult()`. Cards still receive `undefined` for `qualityResult`.
- **AdCardWrapper renders `QualityBadge` but NOT `QualityDetails`** — there is no slot for per-card quality issue drill-down.
- **Legacy cards (`ad-card.tsx`, `mls-card.tsx`) have no quality support at all.**

### New Issues from Recent Changes
| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| N-1 | `alert()` used for compliance conflicts | High | `handleApplySuggestion` uses browser `alert()` when a suggestion introduces a violation. Blocking modal, not toast/inline. |
| N-2 | Compliance revert logic bug | Critical | Compares against ALL campaign violations, not just NEW ones from the suggestion. Pre-existing violations cause every suggestion to be rejected. |
| N-3 | QualitySuggestionsPanel hardcoded colors | Medium | Uses `bg-gray-100`, `text-gray-700`, `bg-amber-100` etc. Not theme tokens. Breaks dark mode/brand. |
| N-4 | Apply button has no async/loading state | High | No loading spinner, no disabled-while-processing. UI appears frozen during compliance re-check. |
| N-5 | Backward-compat conditional may hide quality data | Medium | If campaign has both `qualityResult` AND `qualitySuggestions` (even empty array), QualityBanner is hidden. Transition-period campaigns could lose score display. |
| N-6 | Half-page print ad text cutoff | High | Owner reports text cut off on the left side of the half-page magazine mockup. Likely caused by `rotate(1.5deg)` + `overflow-hidden` clipping, compounded by missing `relative` on parent (C-7). Investigation pending. |

### What's Fixed Since Original Review
| # | Original Issue | Status |
|---|---------------|--------|
| H-17 | QualityBanner not rendered at shell level | FIXED — replaced by QualitySuggestionsPanel |
| H-18 | QualityBanner has no action button | FIXED — Apply/Dismiss per suggestion |
| C-4 (partial) | No error state on compliance banner | PARTIAL — shows warning when rewrite fails, but Fix All error state still missing |
| Types | CampaignKit missing quality suggestion types | FIXED — QualitySuggestion, QualityConstraintViolation added |

### What Remains Open (card-level, zero changes detected)
All platform card components are IDENTICAL to the original review. Zero fixes implemented:
- Instagram/Facebook "See More" still non-interactive (C-1/O-1)
- Print ad still tilted (O-3)
- No new mockup cards built (O-2, O-4, O-5)
- Export error handling still missing (E-5)
- Persistence still sessionStorage-only (E-7)
- Replace button still has no loading state (E-6)

### Inline Feedback Architecture — Current vs. Desired

**Current per-card feedback:**
```
AdCardWrapper Header:  [ComplianceBadge] [QualityBadge]
AdCardWrapper Footer:  [ViolationDetails] (compliance only, no quality details)
```

**Desired per-card feedback (per owner direction):**
```
AdCardWrapper Header:  [ComplianceBadge] [QualityBadge]
AdCardWrapper Footer:  [ViolationDetails] → [QualityDetails]
                       Both with context text, both independently collapsible
                       Hard violations auto-expanded
```

**Key changes needed:**
1. Add `QualityDetails` rendering in `AdCardWrapper` footer
2. Build `buildPlatformQualityResult()` in `campaign-tabs.tsx`
3. Migrate `ad-card.tsx` and `mls-card.tsx` to `AdCardWrapper`
4. Remove local `fixed`/`reverted` state — derive from actual data
5. Auto-expand hard violations
6. Demote shell-level banners to minimal summary lines

---

## Positive Observations (Preserve These)

- **Postcard mockup** — Owner approved. Stack effect, front/back layout, postal indicia are all solid.
- **Instagram & Facebook phone-frame mockups** — Excellent platform fidelity (just need the expand fix)
- **Google Ads browser-frame mockup** — Accurate SERP simulation
- **seededRandom engagement numbers** — Clever realistic touch
- **Component decomposition** — Clean separation of concerns
- **Server/client boundaries** — Properly managed in App Router
- **Tab organization** — Intuitive 5-category + Strategy grouping
- **AdCardWrapper** — Great structural consistency for mockup cards
- **Compliance integration architecture** — Sound per-card design (just needs error handling)

---

## Recommended Implementation Priority

### Phase 1: Critical UX + Error Safety
1. **N-2 (CRITICAL BUG):** Fix compliance revert logic — compare before/after violation counts, not total violations
2. **O-1:** Make IG/FB "See More" / "... more" interactive (expand/collapse full text)
3. **O-7:** Wire per-card quality data (build `buildPlatformQualityResult`, add `QualityDetails` to `AdCardWrapper`, demote shell banners to summary lines)
4. **N-6:** Fix half-page print ad text cutoff (left side clipping)
5. **C-5:** Auto-expand hard violations in `ViolationDetails`
6. **H-4, H-5, E-4, E-5:** Export + replace error handling
7. **H-7, E-7:** Persist fixes to Supabase (not just sessionStorage)
8. **N-1, N-4, H-20, E-6:** Replace `alert()` with toast, add loading states to Apply/Replace buttons

### Phase 2: New Mockups + Core Features
1. **O-9:** Inline ad copy editing with persistence (all platform cards)
2. **O-10:** "Redo with Tone" button per platform card + new API endpoint
3. **O-2:** Build `twitter-card.tsx` with phone-frame mockup
4. **O-3:** Remove print ad tilt, present flat
5. **O-4:** Build `zillow-card.tsx`, `realtor-card.tsx`, `homes-trulia-card.tsx`
6. **O-5:** Build MLS detail mockup in `mls-card.tsx`
7. **H-14:** Migrate remaining `ad-card.tsx` usage to new dedicated cards

### Phase 3: Dashboard Quick Wins
1. **D-1/O-8:** Make campaign cards clickable
2. **D-2:** Enrich cards with property data (address, price, beds/baths)
3. **D-3:** Platform icons on cards
4. **D-4:** Compliance status badge on cards
5. **D-5:** Relative date formatting
6. **D-6:** Add breadcrumbs

### Phase 4: High-Priority Polish
1. **H-6:** Undo support for Fix All
2. **H-11, H-12, H-13:** Mockup accuracy (carousel dots, char limits, font)
3. **H-8, H-9:** Accessibility contrast fixes
4. Re-run quality scoring after compliance fixes

### Phase 5: Dashboard Medium Effort
1. **D-7:** Search/filter/sort bar
2. **D-8:** Quick actions menu per card
3. **D-9:** Quality score on cards
4. **D-10:** Grid/list view toggle
5. **D-11:** Dashboard summary stats bar
6. **D-12:** Better CTA placement

### Phase 6: Theme & Consistency
1. **C-6:** Fix `.dark` CSS variables
2. **H-15, H-16:** Convert hardcoded colors to theme tokens
3. **M-31 through M-37:** Design consistency items

### Phase 7: Polish, Accessibility & Dashboard Backlog
1. Medium accessibility items (M-27 through M-30)
2. Medium UX items (M-1 through M-7)
3. Dashboard larger items: D-13 through D-18 (status lifecycle, bulk ops, pinned campaigns, responsive, welcome/usage card improvements)
4. Remaining medium and low items

---

*Generated by 4-agent frontend review team on 2026-02-16*
*Updated with owner feedback on 2026-02-16*
*Agents: mockup-reviewer, layout-reviewer, compliance-reviewer, consistency-reviewer*
