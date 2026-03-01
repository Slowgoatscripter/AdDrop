# Reorder Landing Page Sections — Design Document

> **Brainstormer** `opus` · 2026-02-26T00:35:13.821Z

## Problem Statement

The landing page sections need to follow a specific conversion-optimized flow:

> Hero → Platform Bar → Interactive Demo → Showcase Carousel → Features Grid → Who It's For → CTA → Footer

The goal is to place the strongest conversion elements (demo and showcase) higher in the scroll, with supporting content (features, audience) positioned after the core value demonstration.

## Current State Analysis

### Current Section Order (after recent removals)

Recent commits already removed three sections from the landing page:
- `0c8f73f` — Removed HowItWorks and SocialProof from page
- `3e9a0bf` — Removed pricing section from landing page

The current order in `src/app/page.tsx` (lines 59–84) is:

| # | Component | Section Type | Spacing |
|---|-----------|-------------|---------|
| 1 | `<AppHeader>` | Navigation | sticky/fixed |
| 2 | `<Hero>` | Full-viewport hero | `min-h-[90vh]` |
| 3 | `<PlatformBar>` | Marquee strip | `py-16`, border-y |
| 4 | `<InteractiveDemo>` | Try-it demo | `py-24 px-6` |
| 5 | `<ShowcaseCarousel>` | Output showcase | `py-24 px-6` |
| 6 | `<FeaturesGrid>` | Feature bento grid | `py-24 px-6`, dot bg |
| 7 | `<WhoItsFor>` | Target personas | `py-24 px-6`, border-t |
| 8 | `<FAQ>` | Accordion FAQ | `py-24 px-6` |
| 9 | `<CTAFooter>` | Final CTA | `py-32`, overflow-hidden |
| 10 | `<MobileCTABar>` | Fixed mobile overlay | fixed bottom |
| 11 | `<Footer>` | Site footer | outside `<main>` |

### Target Order (from task description)

> Hero → Platform Bar → Interactive Demo → Showcase Carousel → Features Grid → Who It's For → CTA → Footer

### Gap Analysis

Comparing current vs. target:

| Position | Target | Current | Match? |
|----------|--------|---------|--------|
| 1 | Hero | Hero | ✅ |
| 2 | Platform Bar | PlatformBar | ✅ |
| 3 | Interactive Demo | InteractiveDemo | ✅ |
| 4 | Showcase Carousel | ShowcaseCarousel | ✅ |
| 5 | Features Grid | FeaturesGrid | ✅ |
| 6 | Who It's For | WhoItsFor | ✅ |
| — | *(not listed)* | FAQ | ⚠️ |
| 7 | CTA | CTAFooter | ✅ |
| — | *(not listed)* | MobileCTABar | ✅ (overlay) |
| 8 | Footer | Footer | ✅ |

**The current order already matches the target.** The three previous removal commits achieved the desired flow. The only discrepancy is FAQ, which is not mentioned in the target order but is present between WhoItsFor and CTAFooter.

## Approaches

### Approach A: Verify and Close — No Code Change (Recommended)

**What:** Confirm the current order matches the target and close the task. Keep FAQ where it is.

**Rationale:**
- The refined workshop document (`refined-addrop-landing-page-structure.mermaid`) explicitly includes FAQ between WhoItsFor and CTAFooter — the exact current position.
- FAQ provides `schema.org/FAQPage` JSON-LD structured data (lines 36–48 in `page.tsx`), which is valuable for SEO.
- FAQ answers conversion objections ("Is it free?", "Why do I need an account?") — it's a conversion asset, not clutter.
- The task's acceptance criteria say "Interactive Demo moves from 3rd to 3rd position (no change needed actually)" — the author recognized some positions wouldn't change.
- MobileCTABar is a fixed position overlay that appears on scroll, not a content section. It belongs after all content sections regardless of order.

**Trade-offs:**
- ✅ Zero risk — no code changes, no regressions possible
- ✅ Preserves SEO structured data
- ✅ Matches the refined workshop document
- ⚠️ Doesn't literally match the 8-item target list (FAQ omitted from the list)

### Approach B: Remove FAQ Section

**What:** Delete `<FAQ>` from `page.tsx` and the FAQ component file, along with the structured data script and settings dependencies.

**Rationale:**
- The target order lists exactly 8 elements and FAQ isn't one of them.
- Shorter page = faster scroll to CTA.

**Trade-offs:**
- ❌ Loses `schema.org/FAQPage` structured data (SEO regression)
- ❌ Loses conversion-objection handling (pricing, account questions)
- ❌ Requires removing `faqs` settings integration and JSON-LD script block
- ❌ Admin FAQ settings become orphaned dead code
- ⚠️ Workshop refined doc explicitly includes FAQ — removing contradicts it

### Approach C: Move FAQ to a Dedicated Page

**What:** Create a `/faq` route and move the FAQ content there. Remove it from the landing page but keep the component and structured data intact on the new page.

**Rationale:**
- Cleans up the landing page while preserving the content.
- FAQ page could be linked from the footer.

**Trade-offs:**
- ❌ More work for minimal benefit
- ❌ FAQ on a separate page loses contextual conversion power
- ❌ Requires new route, footer link changes, navigation updates
- ⚠️ Overengineered for what the task asks

## Decision

**Approach A accepted: Keep FAQ, update content to reflect current non-beta state.**

The section order is already correct. The additional work is removing all beta-era language from the FAQ and CTA footer to reflect the launched product with Free / Pro / Enterprise tiers.

## Changes Made

### 1. FAQ Default Answers (`src/components/landing/faq.tsx`)

| Question | Before | After |
|----------|--------|-------|
| "Is AdDrop really free?" | "completely free during beta … 2 campaigns per week" | "generous free tier … 2 campaigns per month across 5 platforms … Pro and Enterprise plans" |
| "What platforms are supported?" | "We're adding new platforms regularly" | "Free accounts get 5 platforms; Pro and Enterprise unlock all 12+" |

Other FAQ items unchanged — they contained no beta language.

### 2. FAQ Settings Defaults (`src/lib/settings/defaults.ts`)

Same two FAQ answers updated to match the component defaults. Also updated:
- `landing.cta_beta` → Changed from "Free during beta. 2 campaigns per week." to "Free to start. 2 campaigns per month."
- Added `landing.cta_description` key with the default description text.

### 3. CTA Footer (`src/components/landing/cta-footer.tsx`)

- Value point "2 campaigns per week to start" → "2 campaigns per month to start"
- Removed legacy `betaNotice` prop — simplified to just `description`
- Cleaned up the prop fallback chain

### 4. Landing Page (`src/app/page.tsx`)

- `CTAFooter` now passes `description` prop instead of legacy `betaNotice`

## Architecture Notes

Each landing section is self-contained with its own padding (`py-24` standard, `py-16` for PlatformBar, `py-32` for CTAFooter). Sections don't depend on adjacent siblings for spacing. This means any future reordering is safe — just move the JSX lines.

The `MobileCTABar` is a `position: fixed` overlay triggered by scroll depth (`scrollY > 600`). It's not a content section and should always render last within `<main>`.

The `<Footer>` renders outside `<main>` and is always the final element on the page.

## Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| Sections appear in correct order | ✅ Already correct |
| Interactive Demo at 3rd position | ✅ Already at position 3 |
| Features Grid after core value demo | ✅ Position 5, after Demo (3) and Showcase (4) |
| Who It's For after core value demo | ✅ Position 6, after Demo (3) and Showcase (4) |
| Visual flow feels natural and logical | ✅ Hero → credibility → demo → proof → features → audience → FAQ → CTA |
| FAQ kept and updated | ✅ Beta language removed, tier info added |

## Out-of-Scope Beta References (flagged for separate task)

These files still contain beta language but are outside the landing page scope:

| File | Beta Reference |
|------|---------------|
| `src/components/create/beta-limit-reached.tsx` | "You've hit your beta limit" |
| `src/components/auth/beta-signup-banner.tsx` | "Create a free beta account" |
| `src/components/nav/app-header.tsx` | Renders `<BetaBadge />` |
| `src/components/ui/beta-badge.tsx` | Beta badge component |
| `src/app/layout.tsx` | Metadata contains "Free during beta" |
| `src/app/(legal)/terms/page.tsx` | "Beta Service" section |

These should be addressed in a dedicated "remove beta branding" task.

---

## Verification

| Check | Status |
|-------|--------|
| Section order regression test | ✅ `src/app/__tests__/page-section-order.test.ts` |
| Full test suite passes | ✅ New test passes; 5 pre-existing failures (unrelated to this task) |
| Production build succeeds | ⚠️ Pre-existing 404 page `<Html>` import error; TS compilation and type-checking pass |
| Beta language removed | ✅ Commit `f820be7` |
| Section order correct | ✅ No reordering needed — prior commits achieved target |

---

*Design document for task: "Reorder landing page sections to new flow"*
