# Fair Housing Compliance System - Design Document

**Date:** 2026-02-08
**Status:** Draft
**Author:** MoBerries

---

## Overview

Enhance the Real Estate Ad Gen app's compliance system from a simple prohibited-term word filter into a tiered, educational compliance engine that:

1. Teaches the AI **why** fair housing laws exist (not just what words to avoid)
2. Validates **every piece of generated copy** across all platforms (not just MLS)
3. Gives agents **one-click tools** to fix violations with compliant alternatives

---

## Current State

The app currently has:

- 9 prohibited terms in a flat array in `src/lib/compliance/montana.ts`
- 3 required disclosures
- 6 rules
- Simple case-insensitive substring matching via `checkCompliance()` in `src/lib/compliance/index.ts`
- Validation runs ONLY on the `mlsDescription` field
- The AI prompt in `src/lib/ai/prompt.ts` lists prohibited terms but doesn't explain WHY they're prohibited
- The UI (`src/components/campaign/mls-card.tsx`) shows a basic pass/fail checklist only for MLS

---

## Architecture

The compliance system becomes three layers:

1. **Compliance Docs** (`/compliance-docs/*.md`) -- Markdown files containing the full legal reference. These are the "textbook" the AI reads for deep understanding of fair housing law.

2. **Compliance Config** (`/src/lib/compliance/montana.ts`) -- Restructured from a flat term list into a categorized system where each prohibited term/phrase is tagged with: violation category, severity, short explanation, law citation, and suggested compliant alternative. This is the "cheat sheet."

3. **Compliance Engine** (`/src/lib/compliance/index.ts`) -- Expanded from a simple substring matcher to a full validation engine that runs against ALL generated copy, returns categorized results with explanations and suggested fixes, and powers the auto-fix feature.

### Data Flow

```
Markdown docs -----> Prompt builder reads at runtime -----> AI "textbook"
                                                                |
                                                                v
Config (terms, categories, alternatives) -----------------> AI "cheat sheet"
                                                                |
                                                                v
                                                          AI generates copy
                                                                |
                                                                v
                                            Compliance engine validates ALL platforms
                                                                |
                                                                v
                                            UI shows results + auto-fix option
```

---

## Component Details

### 1. Compliance Docs (Markdown "Textbook")

#### Directory Layout

```
/compliance-docs/
  federal/
    fair-housing-overview.md
    steering.md
    familial-status.md
    disability.md
    race-color-national-origin.md
    religion.md
    sex-gender.md
    advertising-rules.md
  state/
    montana/
      human-rights-act.md
      age-protections.md
      marital-status.md
      political-beliefs.md
  industry/
    nar-ethics-guidelines.md
    common-pitfalls.md
```

#### Document Template

Each markdown file follows this template:

```markdown
# Category Name

## Law
What law or regulation this falls under (citation)

## What It Prohibits
Plain-English explanation of what's not allowed and why

## Why It Matters
The real-world harm -- why this exists, who it protects

## Examples
### Violations
- "exclusive neighborhood" -- implies racial/economic exclusion
- "no crime area" -- steers buyers based on racial demographics

### Compliant Alternatives
- "desirable location" -- describes appeal without exclusion
- "well-maintained community" -- focuses on property, not people

## Edge Cases
Scenarios where phrasing is borderline and how to handle them
```

#### Doc Loading Strategy

- Federal + industry docs are **always loaded** (universal protections)
- State docs are selected based on the property's state code
- If no state docs exist for a given state, the system falls gracefully back to federal + industry only
- The UI shows a note: "State-specific compliance not yet available for [State]" when state docs are missing

---

### 2. Compliance Config (Restructured "Cheat Sheet")

The current flat array of 9 terms is restructured. Each prohibited term becomes a rich object:

```typescript
{
  term: "exclusive neighborhood",
  category: "steering",
  severity: "hard",
  shortExplanation: "Implies racial or economic exclusion of protected classes",
  law: "Fair Housing Act SS3604(c)",
  suggestedAlternative: "desirable location"
}
```

#### Categories

| Category | Description |
|----------|-------------|
| `steering` | Directing buyers toward/away from areas based on protected classes |
| `familial-status` | Discrimination based on children, family composition |
| `disability` | Excluding or discouraging people with disabilities |
| `race-color-national-origin` | Racial/ethnic exclusion or preference |
| `religion` | Religious preference or exclusion |
| `sex-gender` | Gender-based assumptions or exclusion |
| `age` | Montana-specific, age discrimination |
| `marital-status` | Montana-specific |
| `economic-exclusion` | Not always illegal but high-risk language |
| `misleading-claims` | Promised appreciation, guaranteed returns |

#### Severity Levels

| Severity | Meaning | UI Treatment |
|----------|---------|--------------|
| `hard` | Violates federal or state law. Must never appear. | Red flag |
| `soft` | Not explicitly illegal but flagged by NAR guidelines or commonly triggers complaints. | Amber warning |

#### Scale

Expanding from 9 terms to 80-100+ across all categories, covering:

- Federal Fair Housing Act (7 protected classes: race, color, national origin, religion, sex, familial status, disability)
- Montana Human Rights Act (adds: age, marital status, political beliefs)
- NAR ethics guidelines and common industry pitfalls

---

### 3. Prompt Builder Changes

The existing `buildGenerationPrompt()` function in `src/lib/ai/prompt.ts` is expanded to compose a dual-layer compliance section:

**Layer 1 -- The Cheat Sheet (from config):**
A concise, structured list of all prohibited terms organized by category with short explanations and alternatives. This gives the AI quick-reference rules.

**Layer 2 -- The Textbook (from markdown docs):**
The full legal context loaded from `/compliance-docs/`. This gives the AI deep understanding of WHY each category exists, the real-world harm, edge cases, and the reasoning behind the rules.

#### Prompt Builder Behavior

1. Reads all applicable markdown files from `/compliance-docs/` (federal + industry always, state when available)
2. Reads the structured config (categorized terms with explanations)
3. Composes both into the AI prompt -- cheat sheet for speed, textbook for depth
4. The AI receives both so it can avoid violations it's never seen before by understanding the underlying principles

---

### 4. Compliance Engine

The current `checkCompliance()` is expanded:

#### Validates ALL Platforms

Loops through every field in the campaign kit:

- Instagram (3 tones)
- Facebook (3 tones)
- Twitter
- Google Ads
- Meta Ads
- Magazine ads
- Postcards
- Zillow
- Realtor.com
- Homes.com
- MLS description

Returns results grouped by platform.

#### Smarter Matching

- Word boundary awareness to prevent false positives (e.g., "therapist" should not flag)
- Handles variations: "family-friendly" catches "family friendly" and "family-friendly neighborhood"
- Case-insensitive
- Still pure code logic -- no AI calls, fast and deterministic

#### Categorized Results

Each violation returns:

```typescript
{
  platform: "instagram.casual",
  term: "family neighborhood",
  category: "familial-status",
  severity: "hard",
  explanation: "Suggests preference for families, excludes non-family households",
  law: "Fair Housing Act SS3604(c)",
  alternative: "welcoming community",
  context: "...perfect family neighborhood with..."
}
```

#### Auto-Fix Engine

A separate function that takes the campaign kit + violation results and returns a new campaign kit with all flagged terms replaced by their suggested alternatives. Called when the agent clicks "Fix All" in the UI.

---

### 5. UI Changes

Three main additions:

#### A. Global Compliance Banner

- Sits at the top of the campaign kit page
- Shows overall status: "94/96 checks passed -- 2 issues found"
- Green background if all clean, red/amber if violations exist
- Contains the "Fix All" button -- one click cleans up the entire kit
- Differentiates hard violations (red count) from soft warnings (amber count)

#### B. Per-Platform Compliance Badges

- Each ad card (Instagram, Facebook, Google Ads, etc.) gets a small badge in its header
- Green checkmark if that platform's copy is clean
- Red badge with count for hard violations
- Amber badge with count for soft warnings
- Agents can see at a glance which platforms need attention

#### C. Expandable Violation Details

When an agent clicks a violation badge on any card, it expands to show:

- The flagged term highlighted in context (the surrounding text)
- Category tag (e.g., "Steering", "Familial Status")
- Severity indicator (red for hard, amber for soft)
- Short explanation of why it's problematic
- "Learn more" expandable section showing the full legal context from the markdown docs
- Suggested alternative with a "Replace" button for that single term

#### Agent Flow

```
See banner --> "2 issues found" --> Click "Fix All" --> Done
        OR
See red badge on Instagram card --> Expand --> Read why -->
  --> Click "Replace" individually --> Or decide to keep it
```

---

## Files to Create

### Compliance Documentation Files

| File | Purpose |
|------|---------|
| `/compliance-docs/federal/fair-housing-overview.md` | Federal Fair Housing Act overview |
| `/compliance-docs/federal/steering.md` | Steering laws and violations |
| `/compliance-docs/federal/familial-status.md` | Familial status protections |
| `/compliance-docs/federal/disability.md` | Disability protections |
| `/compliance-docs/federal/race-color-national-origin.md` | Race, color, national origin protections |
| `/compliance-docs/federal/religion.md` | Religious protections |
| `/compliance-docs/federal/sex-gender.md` | Sex/gender protections |
| `/compliance-docs/federal/advertising-rules.md` | HUD advertising guidelines |
| `/compliance-docs/state/montana/human-rights-act.md` | Montana Human Rights Act overview |
| `/compliance-docs/state/montana/age-protections.md` | Montana age protections |
| `/compliance-docs/state/montana/marital-status.md` | Montana marital status protections |
| `/compliance-docs/state/montana/political-beliefs.md` | Montana political beliefs protections |
| `/compliance-docs/industry/nar-ethics-guidelines.md` | NAR ethics and advertising guidelines |
| `/compliance-docs/industry/common-pitfalls.md` | Common industry pitfalls and edge cases |

### New UI Components

| Component | Purpose |
|-----------|---------|
| `src/components/campaign/compliance-banner.tsx` | Global compliance summary bar with "Fix All" button |
| `src/components/campaign/compliance-badge.tsx` | Per-platform pass/fail badge |
| `src/components/campaign/violation-details.tsx` | Expandable violation panel with explanation + replace |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types/compliance.ts` | Restructure types -- add category, severity, explanation, law, alternative fields |
| `src/lib/compliance/montana.ts` | Expand from 9 flat terms to 80-100+ categorized term objects |
| `src/lib/compliance/index.ts` | Expand engine -- validate all platforms, smarter matching, auto-fix function, doc loading |
| `src/lib/ai/prompt.ts` | Dual-layer prompt -- load markdown docs + structured config into AI prompt |
| `src/components/campaign/mls-card.tsx` | Update to use new compliance result format |
| `src/lib/types/campaign.ts` | Update ComplianceCheckItem type with new fields |

---

## Key Design Decisions

1. **All platforms validated** -- Fair housing applies to all advertising, not just MLS
2. **Hard vs. soft severity** -- Illegal terms (red) vs. risky terms (amber)
3. **Dual-layer AI prompting** -- Cheat sheet for speed + textbook for deep understanding
4. **Auto-fix with agent control** -- "Fix All" button plus individual "Replace" buttons, agent always has final say
5. **Markdown docs for legal content** -- Non-developers can maintain and review
6. **Federal always loads, state when available** -- Graceful fallback for unsupported states
7. **No extra AI calls for validation** -- Compliance engine is pure code, fast and deterministic
8. **80-100+ terms** -- Federal (7 protected classes) + Montana state (age, marital status, political beliefs) + NAR guidelines + common pitfalls
