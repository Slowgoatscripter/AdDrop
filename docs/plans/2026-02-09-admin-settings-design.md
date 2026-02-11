# Admin Settings Page — Design

**Date:** 2026-02-09
**Status:** Approved with Changes (post design review)

## Overview

A tabbed settings page at `/admin/settings` with three tabs: AI Settings, Compliance, and Landing Page. All settings stored in a single Supabase `app_settings` key-value table. The app falls back to hardcoded defaults when no DB override exists.

## Storage

### Supabase Table: `app_settings`

| Column | Type | Notes |
|--------|------|-------|
| `key` | text | Primary key (e.g. `ai.model`, `landing.hero_title`) |
| `value` | jsonb | The setting value |
| `updated_at` | timestamptz | Last modified |
| `updated_by` | uuid | FK to auth.users |

- RLS: **public reads** (SELECT for all), **admin-only writes** (INSERT/UPDATE/DELETE require admin role)
- No seed data — defaults come from code
- App works identically with empty table

### Settings Server Utility (`src/lib/settings/server.ts`)

- `getSetting(key)` → returns `DB value ?? defaults[key]` (never returns null)
- `getSettings(prefix?)` → returns `{...defaults, ...DB overrides}` merged object
- Wrapped in `unstable_cache` with tag `'app-settings'` and 60s TTL
- `saveSettings` action calls `revalidateTag('app-settings')` after write
- Batch upsert: all keys saved in a single Supabase call per tab

### Validation (enforced on save)

| Setting | Min | Max | Step |
|---------|-----|-----|------|
| `ai.temperature` | 0.0 | 1.5 | 0.1 |
| `ai.quality_temperature` | 0.0 | 1.0 | 0.1 |
| `ai.max_tokens` | 1000 | 32000 | — |
| `compliance.max_description_length` | 100 | 10000 | — |
| `landing.stats` | 4 items (fixed) | 4 items | — |
| `landing.faq` | 0 items | — | — |

## Tab 1: AI Settings

| Setting | Key | Type | Default |
|---------|-----|------|---------|
| Generation Model | `ai.model` | select | `gpt-5.2` |
| Temperature | `ai.temperature` | slider | `0.7` |
| Max Tokens | `ai.max_tokens` | number | `16000` |
| Quality Scoring Model | `ai.quality_model` | select | `gpt-4o-mini` |
| Quality Scoring Temp | `ai.quality_temperature` | slider | `0.3` |

Quality settings apply to both `scorer.ts` and `auto-fix.ts` (they share the same model/temperature).

## Tab 2: Compliance Settings

| Setting | Key | Type | Default |
|---------|-----|------|---------|
| Enable Compliance | `compliance.enabled` | toggle | `true` |
| State | `compliance.state` | select | `MT` |
| Max Description Length | `compliance.max_description_length` | number | `1000` |
| Category Toggles | `compliance.categories` | multi-toggle | All 11 enabled |

**Exact category names** (must match `ViolationCategory` type):
steering, familial-status, disability, race-color-national-origin, religion, sex-gender, age, marital-status, political-beliefs, economic-exclusion, misleading-claims

**UX note:** Disabling compliance shows a warning: "Disabling compliance removes fair housing protection from all generated ads."

## Tab 3: Landing Page

### Hero Section
| Setting | Key | Default |
|---------|-----|---------|
| Title Prefix | `landing.hero_title_prefix` | `Ad` |
| Title Accent | `landing.hero_title_accent` | `Drop` |
| Tagline | `landing.hero_tagline` | `Your Listing. 12 Platforms. Zero Effort.` |
| Description | `landing.hero_description` | `Enter your property details...` |
| CTA Button Text | `landing.hero_cta` | `Start Creating Ads` |

Split title into prefix + accent to avoid ambiguity in rendering.

### Social Proof Stats (fixed 4 items, icons hardcoded by index)
| Setting | Key | Default |
|---------|-----|---------|
| Stats Array | `landing.stats` | `[{value:"12+",label:"Ad Platforms"}, ...]` |

Icons mapped by position: [0]=Globe, [1]=FileText, [2]=ShieldCheck, [3]=Zap

### FAQ
| Setting | Key | Default |
|---------|-----|---------|
| FAQ Items | `landing.faq` | `[{question:"...",answer:"..."}, ...]` |

### CTA Footer
| Setting | Key | Default |
|---------|-----|---------|
| Headline | `landing.cta_headline` | `Your Next Listing Deserves Better Marketing` |
| CTA Text | `landing.cta_text` | `Create Your First Campaign` |
| Beta Notice | `landing.cta_beta` | `Free during beta. No account needed. Seriously.` |

## Data Flow: Landing Page

```
src/app/page.tsx (server component, async)
  → calls getSettings('landing') once
  → passes settings as props to:
    → Hero (client component — receives text as props)
    → SocialProof (receives stats as props)
    → FAQ (client component — receives faqs as props)
    → CTAFooter (receives text as props)
```

All landing components accept optional props with defaults. This avoids each component independently querying Supabase.

## File Plan

### New Files
| File | Purpose |
|------|---------|
| `src/lib/types/settings.ts` | Settings types and key enum |
| `src/lib/settings/defaults.ts` | All hardcoded defaults in one place |
| `src/lib/settings/server.ts` | `getSettings()` / `getSetting()` with caching |
| `src/app/admin/settings/actions.ts` | Server actions: loadSettings, saveSettings |
| `src/components/admin/settings-tabs.tsx` | Tab container |
| `src/components/admin/ai-settings-form.tsx` | AI settings form |
| `src/components/admin/compliance-settings-form.tsx` | Compliance settings form |
| `src/components/admin/landing-settings-form.tsx` | Landing page text form |
| `supabase/migrations/20260209_create_app_settings.sql` | Table + RLS (public read, admin write) |

### Modified Files
| File | Change |
|------|--------|
| `src/app/admin/settings/page.tsx` | Replace placeholder with settings tabs |
| `src/app/page.tsx` | Fetch landing settings, pass as props |
| `src/lib/ai/generate.ts` | Read model/temp/tokens from settings |
| `src/lib/ai/prompt.ts` | Read compliance config from settings |
| `src/lib/quality/scorer.ts` | Read quality model/temp from settings |
| `src/lib/quality/auto-fix.ts` | Read quality model/temp from settings |
| `src/lib/compliance/engine.ts` | Read enabled/state/categories from settings |
| `src/components/campaign/campaign-shell.tsx` | Pass compliance config as props from server parent |
| `src/components/landing/hero.tsx` | Accept text props with defaults |
| `src/components/landing/social-proof.tsx` | Accept stats props with defaults |
| `src/components/landing/faq.tsx` | Accept faqs props with defaults |
| `src/components/landing/cta-footer.tsx` | Accept text props with defaults |

## Out of Scope
- Settings history / audit log
- Per-user settings
- Settings import/export
- Image upload
- Section reordering / visibility toggles
- Landing page preview in admin
- Landing sections beyond Hero, Stats, FAQ, CTA Footer
