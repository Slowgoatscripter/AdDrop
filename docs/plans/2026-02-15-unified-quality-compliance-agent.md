# Voice-Authenticity Quality Dimension

**Date:** 2026-02-15
**Status:** Design (Revised after team review)
**Goal:** Upgrade the quality scorer to GPT-5.2, add a voice-authenticity dimension that catches AI construction patterns, and elevate copy to sound like a knowledgeable real estate professional.

---

## Problem

### Weak model on quality scoring
The quality scorer runs on GPT-4o-mini — a model too weak to catch nuanced voice and construction patterns. It scores *what* is said (specificity, hooks, benefits) but not *how* it's phrased.

### Missing voice dimension
AI-generated copy passes all current checks while still reading like a narrator summarizing a brochure rather than a confident agent showing a home.

**Example of the problem:**
- Bad: "It's the kind of setup that handles real use—weeknight dinners, meal prep, and the occasional 'let's host' weekend."
- Better: "This kitchen handles real life. Weeknight dinners, meal prep, Sunday hosting—it's all here."
- Bad: "It's a room that protects your focus—whether your day includes remote work, creative projects, study, or simply a quiet place to reset."
- Better: "A dedicated office off the primary suite. Quiet, private, and away from the main living areas."

The problem isn't vocabulary (caught by existing rules). It's **sentence construction** — the AI defaults to distancing, narrator-like phrasing instead of grounded, present, confident language.

---

## Solution

### Upgrade the quality scorer model
Replace GPT-4o-mini with GPT-5.2 for quality scoring. Same pipeline, better model, stronger judgment on nuanced copy patterns.

### Add voice-authenticity as the 10th quality dimension
Teach the upgraded scorer to evaluate whether the copy sounds like a seasoned real estate professional using example-driven prompting.

### Keep compliance and quality separate
The compliance agent and quality scorer remain as separate API calls. They serve fundamentally different purposes (legal gatekeeper vs creative enhancer) and require different model temperatures.

---

## Architecture

### Current Pipeline (unchanged structure)
```
Generate (GPT-5.2, temp 0.7)
  → Regex quality check (instant, deterministic)
  → AI quality scoring (GPT-4o-mini, temp 0.3)  ← UPGRADE TO GPT-5.2
  → Merge regex + AI results
  → Auto-fix quality issues
  → Compliance check (GPT-5.2, temp 0)           ← UNCHANGED
  → Return campaign
```

### Why NOT merge quality + compliance
The original design proposed merging into one call. Team review identified three blockers:
1. **Temperature conflict** — Compliance needs temp 0 (deterministic, legal safety). Quality scoring needs temp 0.3 (nuanced judgment). Can't serve both in one call.
2. **Prompt dilution** — Compliance detection (rule-based) and voice evaluation (subjective) require different cognitive modes. Compliance accuracy should not compete for model attention.
3. **Zero integration burden** — Keeping them separate means no changes to existing types, UI components, or tests.

### Slim down the regex engine to format-only
The regex engine (`engine.ts`) currently does two jobs:
1. **Format/structural validation** — character limits, hashtag counts, CTA presence, formatting abuse (ALL CAPS, excessive punctuation). These are deterministic, binary checks that regex handles instantly and perfectly. **Keep these.**
2. **Language quality rules** — 80+ anti-pattern rules (AI slop, vague praise, euphemisms, pressure tactics, weak CTAs). These are redundant with the AI quality scorer, and the AI does it better because it understands context. Regex can't tell the difference between "charming craftsman bungalow" (fine) and "charming little home" (euphemism). **Remove these.**

After cleanup:
- `engine.ts` becomes a lightweight format validator (char limits, hashtags, CTA checks, formatting abuse)
- `rules.ts` shrinks to platform format definitions only — the 80+ word/phrase pattern rules are removed
- The AI scorer (GPT-5.2) owns all language quality: the existing 9 dimensions + voice-authenticity
- The merge step (`mergeQualityResults`) still combines format issues from regex with language issues from AI

---

## Voice-Authenticity: What "Good" Sounds Like

The quality we're targeting is **confidence + precision + restraint**. A seasoned agent doesn't oversell, doesn't narrate from outside, and trusts the feature to speak for itself.

### Principles

1. **Present, not narrating** — Write as if standing in the room showing the home. "This" not "It's a." Direct and grounded.
2. **Precise material/feature language** — Name the actual thing. "Wide-plank white oak floors" not "beautiful hardwood floors." "Quartzite counters" not "high-end countertops." Score precision relative to the detail available in the listing data — don't penalize generic language when it's a data limitation, not a voice failure.
3. **Economy of words** — Trust the feature. "10-foot ceilings. South-facing windows. Light all day." Don't explain why that's good.
4. **Implied lifestyle** — "The patio opens directly off the kitchen" implies entertaining without saying "perfect for entertaining."
5. **Rhythm and cadence** — Mix short declarative sentences with slightly longer ones. Not every sentence the same length.
6. **Quiet confidence** — Never tries too hard. No over-explaining, no stacking adjectives, no breathless enthusiasm.

### Tone-Awareness (Critical)

Voice-authenticity must be evaluated **relative to the intended tone**:

- **Professional tone** — Direct, authoritative, data-supported. The principles above apply fully.
- **Casual tone** — Conversational, uses contractions ("it's", "you'll"), fragments allowed, shorter sentences. The "it's" construction is sometimes appropriate here. Score casual copy against casual-voice standards, not professional ones.
- **Luxury tone** — Elevated, sensory, experiential. Longer sentences allowed, more descriptive language. Still no over-explaining, but "reveals" and "unfolds" are in-vocabulary for luxury.

The scorer prompt must include: "Evaluate voice-authenticity relative to the intended tone. Casual copy should sound conversational, not formal. Luxury copy can be more descriptive. Professional copy should be direct and authoritative."

### AI Anti-Patterns to Detect

**1. Distancing constructions:**
- "It's the kind of [noun] that [verb]..."
- "It's a [noun] that [verb]..."
- "There's a [noun] that..."

**2. Stacked benefit chains:**
- "Whether you're hosting friends, enjoying quiet mornings, or unwinding after a long day"
- "Perfect for entertaining, relaxing, or just enjoying the view"

**3. Narrator hedging:**
- "The kind of [X] that makes you [Y]"
- "The type of space where you can..."

**4. Over-qualifying:**
- "A thoughtfully designed space that seamlessly blends..."
- "A carefully curated collection of..."

**5. Implied reader emotions:**
- "You'll love..." / "You'll appreciate..."
- "Imagine coming home to..."
- "Picture yourself..."

### Before/After Examples for the Scorer Prompt

**Distancing construction → Grounded voice:**
| Before (AI pattern) | After (Agent voice) |
|---|---|
| It's the kind of kitchen that handles real use. | This kitchen handles real life. Weeknight dinners, meal prep, Sunday hosting. |
| It's a room that protects your focus. | Dedicated office off the primary suite. Quiet, private, away from the main living areas. |
| It's a backyard that feels like a retreat. | Fenced backyard with mature trees, flagstone patio, and a built-in firepit. |
| This is a home that offers both comfort and style. | Updated finishes throughout. Hardwood floors, new fixtures, clean lines. |
| The living room provides a perfect space for relaxation. | Living room with vaulted ceilings and a gas fireplace. |

**Over-explained → Trusting the feature:**
| Before | After |
|---|---|
| You'll love the abundance of natural light that floods every room. | South-facing windows. Light all day. |
| The spacious primary suite provides a private sanctuary for rest and relaxation. | Primary suite with sitting area, walk-in closet, and en-suite bath. |
| The outdoor space is perfect for entertaining guests on warm summer evenings. | Covered patio with built-in grill, directly off the kitchen. |

**Generic → Precise:**
| Before | After |
|---|---|
| Beautiful hardwood floors throughout. | Wide-plank white oak floors throughout the main level. |
| High-end kitchen finishes. | Quartzite counters, soft-close cabinetry, Bosch appliance package. |
| A well-maintained yard. | Professional landscaping with irrigation system, fenced on three sides. |

**Stacked benefit chains → Single clear statement:**
| Before | After |
|---|---|
| Whether you're hosting friends, enjoying quiet mornings, or unwinding after a long day, this patio has you covered. | Covered patio with ceiling fan and string light hookups. Seats eight comfortably. |
| Perfect for work, study, or creative projects. | Home office with built-in desk and shelving. Separate entrance. |

**Narrator hedging → Direct description:**
| Before | After |
|---|---|
| The kind of kitchen that makes you want to cook. | Gas range, pot filler, and a 10-foot island with prep sink. |
| The type of neighborhood where kids still ride bikes. | Cul-de-sac with sidewalks. Three parks within walking distance. |

**Condo/Multi-family examples:**
| Before | After |
|---|---|
| This unit boasts stunning city views from every room. | Corner unit, 14th floor. Downtown skyline views from the living room and primary bedroom. |
| The HOA takes care of everything so you can just relax. | HOA covers water, trash, exterior maintenance, and pool. $285/month. |

**Land/Lot examples:**
| Before | After |
|---|---|
| A beautiful piece of land with endless possibilities. | 2.3 acres, R-1 zoned, flat and buildable. Public water and sewer at the street. |
| This lot awaits your dream home. | Cleared lot with existing driveway, septic perc approved, mountain views to the west. |

---

## Voice-Authenticity Scoring Criteria

**Score 9-10:** Copy reads like a top-producing agent wrote it. Precise, confident, grounded. You can't tell AI was involved.

**Score 7-8:** Mostly strong. Occasional generic phrasing but overall voice is consistent and professional.

**Score 5-6:** Mixed. Some lines land, others feel narrated or over-explained. Inconsistent voice.

**Score 3-4:** Reads like AI with a real estate template. Distancing constructions, stacked adjectives, explaining obvious benefits.

**Score 1-2:** Generic AI output. "It's a home that offers..." throughout. No real estate fluency.

---

## Auto-Fix Strategy

**Voice-authenticity is score-only in v1. No auto-fix.**

Voice rewrites are fundamentally harder than swapping a prohibited term or adding a CTA. They risk:
- Changing meaning or losing property details
- Replacing one AI pattern with another
- Introducing compliance violations after the compliance check has already passed

**v1 behavior:**
- Scores below 5 are flagged for human review
- Issues include specific callouts (which sentences triggered the low score, what pattern was detected)
- No automated rewriting

**v2 consideration (future):**
- Once scoring accuracy is proven and calibrated, explore auto-fix for mechanical patterns only (e.g., "It's a [noun] that [verb]" → direct construction)

---

## What Changes

### Files to modify:
- `src/lib/quality/scorer.ts` — Upgrade model from GPT-4o-mini to GPT-5.2, add voice-authenticity as 10th dimension with examples and rubric, add tone parameter
- `src/lib/types/quality.ts` — Add `voice-authenticity` to score categories
- `src/lib/ai/generate.ts` — Pass tone context to quality scorer call
- `src/lib/quality/engine.ts` — Strip down to format-only validation (remove all language pattern matching, keep char limits, hashtag counts, CTA checks, formatting abuse)
- `src/lib/quality/rules.ts` — Remove 80+ word/phrase anti-pattern rules, keep only platform format definitions (character limits, hashtag ranges, CTA requirements)
- `src/lib/quality/auto-fix.ts` — Remove regex-based language fixes (anti-pattern removal, AI slop word stripping). Keep format-level fixes only (ALL CAPS → title case, excessive punctuation trimming)

### Files that do NOT change:
- `src/lib/compliance/agent.ts` — Untouched
- `src/lib/types/compliance.ts` — Untouched
- All UI consumer components — Unchanged

---

## Risks

- **Self-scoring blind spot:** GPT-5.2 generates the copy, then GPT-5.2 scores voice. The model may not recognize its own default constructions. Mitigated by strong before/after examples that force comparison against explicit references, and by running the scorer as a separate call with its own context.
- **Tone mis-scoring:** Without tone-awareness, casual copy gets penalized for using constructions that are appropriate for casual voice. Mitigated by passing tone context to the scorer and including tone-specific guidance.
- **Precision vs data availability:** The scorer might penalize generic descriptions when the listing data simply doesn't include that level of detail. Mitigated by rubric note: "Score precision relative to available listing data."

---

## Success Criteria

1. Quality scorer upgraded to GPT-5.2 — measurable improvement in scoring accuracy
2. Voice-authenticity catches AI construction patterns including distancing language, stacked benefit chains, narrator hedging, and implied reader emotions — evaluated relative to the intended tone
3. Generated copy reads with more confidence, precision, and restraint
4. Existing compliance tests pass without modification
5. No changes to compliance agent or pipeline structure
6. No increase in Fair Housing violations slipping through
