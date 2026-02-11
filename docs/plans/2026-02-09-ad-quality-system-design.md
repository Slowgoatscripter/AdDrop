# Ad Generation Quality System — Full Design

**Date:** 2026-02-09
**Status:** Approved
**Pattern:** Mirrors compliance system architecture (compliance/ → quality/)

---

## Overview

A two-layer quality checking system that ensures every generated ad is tailored to the property, optimized for the platform, and targeted to the right demographic. Runs alongside the existing compliance system — compliance is the legal gatekeeper, quality is the creative enhancer.

**Key behavior:** Auto-fix by default. The user sees polished output with a summary of what was improved. They can revert any individual fix.

---

## Architecture

### File Structure

```
src/lib/quality/
├── index.ts                  # Public API barrel export
├── rules.ts                  # ~80+ regex quality rules as TS objects
├── engine.ts                 # Regex-based quality checker
├── scorer.ts                 # AI scoring layer (9 subjective categories)
├── auto-fix.ts               # Auto-remediation (regex replacements + AI rewrites)
├── docs.ts                   # Server-only markdown doc loader
└── quality.test.ts           # Test suite

src/lib/types/
└── quality.ts                # TypeScript interfaces

ad-docs/
├── platforms/
│   ├── instagram.md
│   ├── facebook.md
│   ├── google-ads.md
│   ├── meta-ads.md
│   ├── twitter.md
│   ├── postcard.md
│   ├── magazine.md
│   └── listing-platforms.md
├── copywriting/
│   ├── hooks-and-headlines.md
│   ├── feature-to-benefit.md
│   ├── tone-definitions.md
│   └── cta-best-practices.md
└── targeting/
    ├── demographic-tailoring.md
    └── property-type-tailoring.md

src/components/campaign/
├── quality-badge.tsx
├── quality-banner.tsx
└── quality-details.tsx
```

---

## Type System

```typescript
// src/lib/types/quality.ts

type QualityCategory =
  | 'platform-format'
  | 'cta-effectiveness'
  | 'anti-pattern'
  | 'power-avoid-words'
  | 'formatting'
  | 'hook-strength'
  | 'specificity'
  | 'feature-to-benefit'
  | 'tone-consistency'
  | 'variation-redundancy'
  | 'platform-optimization'
  | 'demographic-fit'
  | 'property-type-fit'
  | 'emotional-triggers'

type QualityPriority = 'required' | 'recommended'

// Regex rule unit (mirrors ProhibitedTerm)
interface QualityRule {
  pattern: string
  category: QualityCategory
  priority: QualityPriority
  shortExplanation: string
  suggestedFix: string
  platforms?: string[]         // null = all platforms
  subcategory?: string         // e.g., 'vague-praise', 'euphemism', 'ai-slop'
}

// AI scoring result per category per platform
interface QualityScore {
  category: QualityCategory
  platform: string
  score: number                // 1-10
  priority: QualityPriority
  issue?: string
  suggestedFix?: string
  context?: string
}

// Unified issue format (both regex and AI produce these)
interface QualityIssue {
  platform: string
  category: QualityCategory
  priority: QualityPriority
  source: 'regex' | 'ai'
  issue: string
  suggestedFix: string
  context?: string
  score?: number               // AI only
  originalText?: string        // Before auto-fix (for revert)
  fixedText?: string           // After auto-fix (for revert)
}

// Per-platform result
interface PlatformQualityResult {
  platform: string
  issues: QualityIssue[]
  passed: boolean
}

// Campaign-wide result
interface CampaignQualityResult {
  platforms: PlatformQualityResult[]
  totalChecks: number
  totalPassed: number
  requiredIssues: number
  recommendedIssues: number
  allPassed: boolean
  overallScore?: number
  improvementsApplied: number  // Count of auto-fixes made
}
```

---

## Runtime Flow

```
PHASE 1: GENERATION (enhanced prompt)
──────────────────────────────────────
buildGenerationPrompt(listing, compliance, quality)
  ├── Property details (existing)
  ├── Compliance cheat sheet (existing)
  ├── Compliance textbook (existing)
  ├── Quality cheat sheet ← buildQualityCheatSheet(qualityConfig)
  │     • Anti-patterns to avoid (grouped by subcategory)
  │     • Platform-specific requirements
  │     • Tone definitions with good/bad examples
  │     • Copywriting formulas (AIDA, PAS, BAB)
  │     • Demographic-specific guidance (if target specified)
  │     • Property-type-specific guidance
  └── Quality textbook ← loadQualityDocs(qualityConfig)
        • Platform guides from ad-docs/platforms/
        • Copywriting guides from ad-docs/copywriting/
        • Targeting guides from ad-docs/targeting/

OpenAI generates campaign → CampaignKit


PHASE 2A: REGEX QUALITY CHECK (instant)
───────────────────────────────────────
checkAllPlatformQuality(campaign, qualityConfig)
  ├── Extract all platform texts (reuse extractPlatformTexts from compliance)
  ├── For each text:
  │     ├── findQualityIssues(text, platform, rules)
  │     │     • Regex match against ~80+ quality rules
  │     │     • Word-boundary matching (same as compliance)
  │     │     • Returns QualityIssue[] with context snippets
  │     ├── checkPlatformFormat(text, platform)
  │     │     • Character limits, hashtag counts, CTA presence
  │     └── checkFormattingAbuse(text)
  │           • ALL CAPS, exclamation marks, abbreviations
  └── Aggregate into CampaignQualityResult (regex portion)


PHASE 2B: AI QUALITY SCORING (~2-3 sec)
───────────────────────────────────────
scoreAllPlatformQuality(campaign, qualityConfig)
  ├── Bundle all platform texts + property context + target demographic
  ├── Single API call scoring 9 AI categories:
  │     • Hook strength, Specificity, Feature-to-benefit
  │     • Tone consistency, Variation redundancy, Platform optimization
  │     • Demographic fit, Property-type fit, Emotional triggers
  ├── AI returns structured JSON: scores + issues per platform
  └── Convert scores < 7 into QualityIssue objects


PHASE 3: MERGE
──────────────
mergeQualityResults(regexResult, aiResult)
  ├── Combine issues from both sources
  ├── Deduplicate (regex + AI flag same thing)
  └── Calculate aggregate stats


PHASE 4: AUTO-FIX (default behavior)
────────────────────────────────────
autoFixQuality(campaign, qualityResult)
  ├── Regex issues: direct replacement
  │     • Cliche → remove or replace with specific description
  │     • Pressure tactic → remove
  │     • ALL CAPS → title case
  │     • AI slop words → remove/rephrase
  │
  ├── AI issues: send flagged copy back to AI with fix instructions
  │     • Weak hook → "Rewrite opening with [unique feature]"
  │     • Tone break → "Rewrite maintaining [tone]. Markers: [...]"
  │     • Feature-only → "Transform into lifestyle benefits for [demographic]"
  │     • Redundant variations → "Differentiate by [angle]"
  │
  ├── Deep clone campaign (never mutate original)
  ├── Store originalText/fixedText on each issue (for revert)
  └── Return corrected CampaignKit + updated QualityResult


PHASE 5: STORE
──────────────
campaign.qualityResult = mergedResult  // alongside campaign.complianceResult
```

---

## Quality Rule Definitions (rules.ts)

### Subcategory Organization

```typescript
// ~80+ rules organized by subcategory

const vaguePraiseRules: QualityRule[] = [
  { pattern: "has great potential", category: "anti-pattern", subcategory: "vague-praise",
    priority: "required", shortExplanation: "Vague — says nothing specific about the property",
    suggestedFix: "Replace with a specific feature or benefit" },
  { pattern: "the possibilities are endless", ... },
  { pattern: "must see to appreciate", ... },
  { pattern: "dream home", ... },
  // ...
]

const euphemismRules: QualityRule[] = [
  { pattern: "cozy", category: "anti-pattern", subcategory: "euphemism",
    priority: "required", shortExplanation: "Often perceived as code for 'small'",
    suggestedFix: "Use specific dimensions or describe the actual space" },
  { pattern: "quaint", ... },
  { pattern: "charming", ... },
  // ...
]

const pressureTacticRules: QualityRule[] = [...]
const assumptionRules: QualityRule[] = [...]
const meaninglessSuperlativeRules: QualityRule[] = [...]
const aiSlopRules: QualityRule[] = [...]
const avoidWordRules: QualityRule[] = [...]  // "fixer", "TLC", "nice"
```

### Platform Format Rules

```typescript
const platformFormats: Record<string, {
  maxChars?: number
  truncationPoint?: number
  maxHashtags?: number
  minHashtags?: number
  requiresCTA: boolean
}> = {
  'instagram.professional': { maxChars: 2200, truncationPoint: 125, maxHashtags: 30, minHashtags: 3, requiresCTA: true },
  'instagram.casual': { ... },
  'instagram.luxury': { ... },
  'facebook.professional': { maxChars: null, truncationPoint: 125, requiresCTA: true },
  'googleAds.headline': { maxChars: 30, requiresCTA: false },
  'googleAds.description': { maxChars: 90, requiresCTA: true },
  'metaAd.primaryText': { maxChars: 2200, truncationPoint: 125, requiresCTA: true },
  'metaAd.headline': { maxChars: 40, requiresCTA: false },
  'twitter': { maxChars: 280, requiresCTA: true },
  // ...
}
```

---

## AI Scoring Prompt

Single API call with structured JSON output:

```
You are a real estate advertising quality evaluator. Score the following
ad copy across 9 quality dimensions.

PROPERTY CONTEXT:
[listing data — address, price, features, property type]

TARGET DEMOGRAPHIC: [if specified]

PLATFORM COPY:
[all platform texts, labeled by platform]

Score each platform's copy on these dimensions (1-10):

1. HOOK STRENGTH: Does the opening grab attention with something specific
   and unique? (7+ = strong, <7 = needs work)
2. SPECIFICITY: Ratio of concrete details to generic claims?
3. FEATURE-TO-BENEFIT: Are features translated into lifestyle benefits?
4. TONE CONSISTENCY: Does [professional/casual/luxury] tone hold throughout?
5. VARIATION REDUNDANCY: Are tone variations genuinely different in structure
   and angle? (compare across variations)
6. PLATFORM OPTIMIZATION: Is copy tailored to platform conventions?
7. DEMOGRAPHIC FIT: Does copy match target buyer persona? [if demographic specified]
8. PROPERTY-TYPE FIT: Does vocabulary match property type?
9. EMOTIONAL TRIGGERS: Does copy use at least one evidence-backed emotional lever?

For any score below 7, provide:
- issue: what's wrong (1 sentence)
- suggestedFix: how to improve (1 sentence)
- context: the relevant snippet

Return as JSON: { platforms: { [platformKey]: { scores: [...] } } }
```

---

## UI Components

### quality-badge.tsx
- Green checkmark + score: "Quality 9/10"
- Sits alongside compliance badge on each ad card
- Click opens quality-details panel

### quality-banner.tsx
- Top of campaign page, below compliance banner
- "14 quality improvements applied across 23 ads"
- Breakdown: "8 cliches removed, 3 hooks strengthened, 2 tone adjustments, 1 CTA improved"
- Green if all required issues fixed, amber if recommended issues remain

### quality-details.tsx
- Expandable panel per platform
- Each improvement shows:
  - **Before:** original text (issue highlighted)
  - **After:** auto-fixed text
  - **Why:** explanation + category badge
- Revert button per individual fix
- Separate section for "recommended" suggestions (not auto-fixed)

### Layout alongside compliance:
```
┌─ Compliance Banner ────────────────┐
│ ✓ All platforms pass Fair Housing  │
└────────────────────────────────────┘
┌─ Quality Banner ───────────────────┐
│ 14 quality improvements applied    │
└────────────────────────────────────┘
┌─ Instagram Card ──────────────────┐
│  [Compliance ✓] [Quality 9/10]   │
│  Professional | Casual | Luxury   │
└───────────────────────────────────┘
```

---

## Ad Docs (Markdown Textbooks)

### ad-docs/platforms/ (8 files)
Each platform doc covers:
- Format constraints and best practices
- What makes great copy on THIS platform
- Platform-specific anti-patterns
- Example good vs bad ads

### ad-docs/copywriting/ (4 files)
- **hooks-and-headlines.md** — Headline formulas, opening patterns, "8 words or fewer" rule
- **feature-to-benefit.md** — "So what?" test, benefit laddering, transformation examples
- **tone-definitions.md** — Professional/casual/luxury markers, tone-breaking patterns, vocabulary lists
- **cta-best-practices.md** — Verb-first CTAs, audience-specific CTAs, platform-specific CTAs

### ad-docs/targeting/ (2 files)
- **demographic-tailoring.md** — 5 buyer personas (first-time, luxury, investor, downsizer, family) with tone, emphasis, language, and triggers for each
- **property-type-tailoring.md** — 6 property types (condo, single-family, luxury estate, townhouse, land, multi-family) with vocabulary, selling points, and what to avoid

---

## Integration Points

### prompt.ts changes
- Import `buildQualityCheatSheet()` and `loadQualityDocs()`
- Add quality sections after compliance sections in the prompt
- Pass demographic and property type context to quality cheat sheet

### generate.ts changes
- After `checkAllPlatforms()` (compliance), add:
  - `checkAllPlatformQuality()` (regex)
  - `scoreAllPlatformQuality()` (AI)
  - `mergeQualityResults()`
  - `autoFixQuality()`
- Store `campaign.qualityResult`

### campaign.ts type changes
- Add `qualityResult?: CampaignQualityResult` to CampaignKit

### Component changes
- Add quality-badge to each ad card component
- Add quality-banner to campaign results page
- Add quality-details as expandable panel

---

## Implementation Plan

### Phase 1: Foundation (types + rules + docs)
1. Create `src/lib/types/quality.ts` — all interfaces
2. Create `src/lib/quality/rules.ts` — ~80+ regex rules organized by subcategory
3. Create all 14 markdown docs in `ad-docs/`
4. Create `src/lib/quality/docs.ts` — doc loader (mirror compliance/docs.ts)
5. Create `src/lib/quality/index.ts` — barrel export

### Phase 2: Regex Engine
6. Create `src/lib/quality/engine.ts` — regex checker (mirror compliance/engine.ts)
   - `findQualityIssues()` — pattern matching with context extraction
   - `checkPlatformFormat()` — character limits, hashtag counts, CTA presence
   - `checkFormattingAbuse()` — ALL CAPS, exclamation marks
   - `checkAllPlatformQuality()` — orchestrator
7. Create `src/lib/quality/quality.test.ts` — tests for regex layer

### Phase 3: AI Scoring
8. Create `src/lib/quality/scorer.ts` — AI scoring layer
   - `scoreAllPlatformQuality()` — single API call, structured JSON response
   - `mergeQualityResults()` — combine regex + AI results, deduplicate
9. Add tests for AI scoring (mock API responses)

### Phase 4: Auto-Fix
10. Create `src/lib/quality/auto-fix.ts` — remediation layer
    - Regex fixes: direct replacement (like compliance auto-fix)
    - AI fixes: targeted rewrite requests back to AI
    - Deep clone, store before/after for revert
11. Add tests for auto-fix

### Phase 5: Prompt Integration
12. Update `src/lib/ai/prompt.ts` — add quality cheat sheet + textbook sections
13. Update `src/lib/ai/generate.ts` — wire quality check + auto-fix into pipeline
14. Update `src/lib/types/campaign.ts` — add qualityResult to CampaignKit

### Phase 6: UI
15. Create `src/components/campaign/quality-badge.tsx`
16. Create `src/components/campaign/quality-banner.tsx`
17. Create `src/components/campaign/quality-details.tsx`
18. Update ad card components to show quality badge
19. Update campaign results page layout

### Phase 7: Testing & Polish
20. End-to-end integration tests
21. Verify quality + compliance run together without conflicts
22. Performance check (total generation time with both systems)

---

## Future Sessions (Noted)

- **Image Selection Agent** — AI picks which photos to use for which ad
- **Per-Ad Redo** — User requests a specific change or full regeneration of a single ad
- **Additional States** — Quality rules that vary by market/region

---

## Research Sources

Quality categories derived from research by two specialized agents:
- **Platform Researcher:** Platform-specific ad standards across all 12+ platforms
- **Copywriting Researcher:** Copywriting craft, anti-patterns, tone definitions, demographic/property tailoring

Both researchers cross-validated findings. Final 14 categories (5 regex, 9 AI) represent consensus.
