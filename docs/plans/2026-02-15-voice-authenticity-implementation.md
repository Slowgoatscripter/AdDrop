# Voice-Authenticity Quality Dimension — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the quality scorer to GPT-5.2, add voice-authenticity as the 10th scoring dimension, and strip the regex engine down to format-only validation.

**Architecture:** Keep the existing two-layer quality pipeline (regex pre-pass + AI scoring + merge). Upgrade the AI scorer model from GPT-4o-mini to GPT-5.2. Add voice-authenticity with tone-aware scoring and example-driven prompting. Remove language pattern rules from regex, leaving only format/structural checks.

**Tech Stack:** TypeScript, OpenAI API (GPT-5.2), Jest

---

## Task 1: Strip language rules from `rules.ts`, keep format definitions only

**Files:**
- Modify: `src/lib/quality/rules.ts` (lines 1-837)
- Test: `src/lib/quality/quality.test.ts`

**Step 1: Write the failing test**

Update the rules test to expect only format-related exports:

```typescript
// In quality.test.ts, replace the "quality rules" describe block
describe('platformFormats', () => {
  it('should export platform format definitions', () => {
    expect(platformFormats).toBeDefined();
    expect(Object.keys(platformFormats).length).toBeGreaterThan(0);
  });

  it('should have required fields for each platform format', () => {
    Object.entries(platformFormats).forEach(([platform, format]) => {
      expect(format.maxChars).toBeDefined();
      expect(typeof format.maxChars).toBe('number');
    });
  });

  it('should NOT export language quality rules', () => {
    // qualityRules should no longer exist — language quality is AI-only
    expect(() => require('../quality/rules').qualityRules).not.toThrow();
    // If it still exports, it should be empty or undefined
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: FAIL — qualityRules still exports 80+ rules

**Step 3: Strip `rules.ts` to format-only**

Remove all language rule arrays (vague praise, euphemisms, pressure tactics, assumptions, superlatives, AI slop, avoid words, weak CTAs). Keep only:
- `platformFormats` object (lines 727-837)
- `PlatformFormat` type reference
- Formatting regex rules (excessive `!`, emoji, dollar signs, ellipsis, ALL CAPS) — these are structural, not language

The file should export:
```typescript
export const formattingRules: QualityRule[] = [
  // Only the 4-5 regex-based formatting rules (excessive !, emoji, etc.)
];

export const platformFormats: Record<string, PlatformFormat> = {
  // All 26 platform format definitions (unchanged)
};
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/quality/rules.ts src/lib/quality/quality.test.ts
git commit -m "refactor: strip language rules from rules.ts, keep format definitions only"
```

---

## Task 2: Strip `engine.ts` to format-only validation

**Files:**
- Modify: `src/lib/quality/engine.ts` (lines 1-333)
- Test: `src/lib/quality/quality.test.ts`

**Step 1: Write the failing test**

Update engine tests to reflect format-only behavior:

```typescript
describe('checkAllPlatformQuality (format-only)', () => {
  it('should catch format violations (character limits)', () => {
    const campaign = buildMockCampaign({ twitter: 'x'.repeat(300) });
    const result = checkAllPlatformQuality(campaign);
    const twitterIssues = result.platforms.find(p => p.platform === 'twitter');
    expect(twitterIssues?.issues.some(i => i.category === 'formatting')).toBe(true);
  });

  it('should catch formatting abuse (ALL CAPS)', () => {
    const campaign = buildMockCampaign({ 'instagram.professional': 'THIS ENTIRE SENTENCE IS IN CAPS AND IS TOO LONG' });
    const result = checkAllPlatformQuality(campaign);
    expect(result.platforms.some(p => p.issues.some(i => i.category === 'formatting'))).toBe(true);
  });

  it('should NOT flag language anti-patterns (AI handles those now)', () => {
    const campaign = buildMockCampaign({ 'instagram.professional': 'This home nestled in the hills boasts stunning views and a cozy interior.' });
    const result = checkAllPlatformQuality(campaign);
    // No language issues — "nestled in", "boasts", "stunning", "cozy" are now AI-only
    const languageIssues = result.platforms.flatMap(p => p.issues).filter(i =>
      ['anti-pattern', 'vague-praise', 'euphemism', 'pressure-tactic', 'assumption', 'meaningless-superlative', 'avoid-word', 'weak-cta'].includes(i.subcategory || '')
    );
    expect(languageIssues.length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: FAIL — engine still catches language patterns

**Step 3: Strip `engine.ts` to format-only**

Remove `findQualityIssues()` function (or empty it to return `[]`). Keep:
- `buildRuleRegex()` — still needed for formatting rules
- `extractContext()` — still needed
- `checkPlatformFormat()` — character limits, hashtag counts, CTA presence (unchanged)
- `checkFormattingAbuse()` — ALL CAPS, excessive punctuation (unchanged)
- `extractPlatformTexts()` — shared utility used by both engine and scorer (unchanged)
- `checkAllPlatformQuality()` — update to only call `checkPlatformFormat` + `checkFormattingAbuse`, skip `findQualityIssues`

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/quality/engine.ts src/lib/quality/quality.test.ts
git commit -m "refactor: strip engine.ts to format-only validation, language checks moved to AI scorer"
```

---

## Task 3: Strip `auto-fix.ts` language fixes, keep format fixes only

**Files:**
- Modify: `src/lib/quality/auto-fix.ts` (lines 1-216)
- Test: `src/lib/quality/quality.test.ts`

**Step 1: Write the failing test**

```typescript
describe('autoFixQuality (format-only)', () => {
  it('should fix formatting abuse (ALL CAPS → title case)', () => {
    const issue: QualityIssue = {
      category: 'formatting',
      priority: 'required',
      originalText: 'BEAUTIFUL HOME IN GREAT LOCATION',
      rule: 'all-caps',
      platform: 'instagram.professional',
    };
    const result = autoFixTextRegex('BEAUTIFUL HOME IN GREAT LOCATION', [issue]);
    expect(result).not.toBe('BEAUTIFUL HOME IN GREAT LOCATION');
  });

  it('should NOT attempt AI language rewrites', () => {
    // autoFixTextAI should no longer be called for language issues
    // This is implicitly tested by removing the function
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`

**Step 3: Strip language fixes from `auto-fix.ts`**

- Remove `autoFixTextAI()` function entirely (or keep as no-op returning original text)
- In `autoFixTextRegex()`: remove anti-pattern phrase removal logic, keep only ALL CAPS → title case and excessive punctuation trimming
- In `autoFixQuality()`: remove the AI fix call path, only apply regex format fixes
- Update the auto-fix model reference removal (was using `gpt-4o-mini`)

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/quality/auto-fix.ts src/lib/quality/quality.test.ts
git commit -m "refactor: strip language auto-fixes, keep format fixes only"
```

---

## Task 4: Add `voice-authenticity` to quality types

**Files:**
- Modify: `src/lib/types/quality.ts` (lines 1-82)

**Step 1: Update types**

Add `'voice-authenticity'` to the `QualityCategory` union type. Add a `tone` field to `QualityScore` for tone-aware scoring:

```typescript
// Add to QualityCategory union (line ~1-15)
export type QualityCategory =
  | 'hook-strength'
  | 'specificity'
  | 'feature-to-benefit'
  | 'tone-consistency'
  | 'variation-redundancy'
  | 'platform-optimization'
  | 'demographic-fit'
  | 'property-type-fit'
  | 'emotional-triggers'
  | 'voice-authenticity'   // ← NEW
  // ... existing format categories
  | 'formatting'
  | 'anti-pattern'
  | 'vague-praise'
  | 'euphemism'
  | 'pressure-tactic'
  | 'assumption'
  | 'meaningless-superlative'
  | 'avoid-word'
  | 'weak-cta';
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

**Step 3: Commit**

```bash
git add src/lib/types/quality.ts
git commit -m "feat: add voice-authenticity to QualityCategory type"
```

---

## Task 5: Upgrade scorer to GPT-5.2 and add voice-authenticity dimension

**Files:**
- Modify: `src/lib/quality/scorer.ts` (lines 1-432)
- Test: `src/lib/quality/quality.test.ts`

**Step 1: Write the failing test**

```typescript
describe('AI Quality Scorer (voice-authenticity)', () => {
  it('should include voice-authenticity in scoring categories', () => {
    const categories = getAIScoringCategories();
    expect(categories).toContain('voice-authenticity');
    expect(categories.length).toBe(10);
  });

  it('should use gpt-5.2 model', () => {
    // Verify the model constant
    expect(QUALITY_SCORER_MODEL).toBe('gpt-5.2');
  });

  it('should accept tone parameter in scoreAllPlatformQuality', async () => {
    // Mock OpenAI to verify tone is included in the prompt
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ platforms: {} }) } }],
    });
    // ... setup mock
    await scoreAllPlatformQuality(mockCampaign, mockListing, undefined, 'professional');
    const prompt = mockCreate.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('voice-authenticity');
    expect(prompt).toContain('professional');
  });

  it('should include voice-authenticity examples in scoring prompt', () => {
    const prompt = buildScoringPrompt('test property', 'test text', undefined, 'professional');
    expect(prompt).toContain('voice-authenticity');
    expect(prompt).toContain('Distancing construction');
    expect(prompt).toContain('Present, not narrating');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: FAIL — no voice-authenticity category, model is gpt-4o-mini

**Step 3: Implement the changes in `scorer.ts`**

**3a. Update model constant** (line ~170):
```typescript
const QUALITY_SCORER_MODEL = 'gpt-5.2';  // was 'gpt-4o-mini'
```

**3b. Add voice-authenticity to categories array** (line ~35-45):
```typescript
const AI_QUALITY_CATEGORIES = [
  'hook-strength',
  'specificity',
  'feature-to-benefit',
  'tone-consistency',
  'variation-redundancy',
  'platform-optimization',
  'demographic-fit',
  'property-type-fit',
  'emotional-triggers',
  'voice-authenticity',  // ← NEW
] as const;
```

**3c. Add tone parameter to `scoreAllPlatformQuality`** (line ~170):
```typescript
export async function scoreAllPlatformQuality(
  campaign: CampaignKit,
  listing?: ListingData,
  demographic?: string,
  tone?: 'professional' | 'casual' | 'luxury',  // ← NEW
): Promise<CampaignQualityResult> {
```

**3d. Add voice-authenticity scoring instructions to `buildScoringPrompt`** (line ~77-132):

Add after the existing category descriptions:

```typescript
const voiceAuthenticityBlock = `
## voice-authenticity (1-10)
Does this copy sound like a seasoned real estate professional wrote it? Score based on:

### Principles
1. Present, not narrating — Writing as if standing in the room showing the home. "This" not "It's a." Direct and grounded.
2. Precise material/feature language — Names the actual thing when data is available. "Wide-plank white oak floors" not "beautiful hardwood floors." Score precision relative to the detail available in the listing data — don't penalize generic language when it's a data limitation.
3. Economy of words — Trusts the feature. "10-foot ceilings. South-facing windows. Light all day." Doesn't explain why that's good.
4. Implied lifestyle — "The patio opens directly off the kitchen" implies entertaining without saying "perfect for entertaining."
5. Rhythm and cadence — Mixes short declarative sentences with slightly longer ones.
6. Quiet confidence — Never tries too hard. No over-explaining, no stacking adjectives, no breathless enthusiasm.

### Evaluate relative to intended tone: ${tone || 'professional'}
- Professional: Direct, authoritative, data-supported. All principles apply fully.
- Casual: Conversational, uses contractions ("it's", "you'll"), fragments allowed. The "it's" construction is sometimes appropriate. Score against casual-voice standards, not professional ones.
- Luxury: Elevated, sensory, experiential. Longer sentences allowed, more descriptive language. Still no over-explaining, but "reveals" and "unfolds" are in-vocabulary.

### AI Anti-Patterns to Detect
1. Distancing constructions: "It's the kind of [noun] that [verb]...", "It's a [noun] that [verb]...", "There's a [noun] that..."
2. Stacked benefit chains: "Whether you're hosting friends, enjoying quiet mornings, or unwinding after a long day"
3. Narrator hedging: "The kind of [X] that makes you [Y]", "The type of space where you can..."
4. Over-qualifying: "A thoughtfully designed space that seamlessly blends..."
5. Implied reader emotions: "You'll love...", "You'll appreciate...", "Imagine coming home to...", "Picture yourself..."

### Before/After Examples

BAD → GOOD (Professional/Luxury):
- "It's the kind of kitchen that handles real use." → "This kitchen handles real life. Weeknight dinners, meal prep, Sunday hosting."
- "It's a room that protects your focus." → "Dedicated office off the primary suite. Quiet, private, away from the main living areas."
- "It's a backyard that feels like a retreat." → "Fenced backyard with mature trees, flagstone patio, and a built-in firepit."
- "You'll love the abundance of natural light." → "South-facing windows. Light all day."
- "The spacious primary suite provides a private sanctuary." → "Primary suite with sitting area, walk-in closet, and en-suite bath."
- "Beautiful hardwood floors throughout." → "Wide-plank white oak floors throughout the main level."
- "Whether you're hosting friends, enjoying quiet mornings, or unwinding after a long day, this patio has you covered." → "Covered patio with ceiling fan and string light hookups. Seats eight comfortably."
- "The kind of kitchen that makes you want to cook." → "Gas range, pot filler, and a 10-foot island with prep sink."
- "The type of neighborhood where kids still ride bikes." → "Cul-de-sac with sidewalks. Three parks within walking distance."
- "This unit boasts stunning city views from every room." → "Corner unit, 14th floor. Downtown skyline views from the living room and primary bedroom."
- "The HOA takes care of everything so you can just relax." → "HOA covers water, trash, exterior maintenance, and pool. $285/month."
- "A beautiful piece of land with endless possibilities." → "2.3 acres, R-1 zoned, flat and buildable. Public water and sewer at the street."

### Scoring Rubric
- 9-10: Reads like a top-producing agent wrote it. Precise, confident, grounded. Can't tell AI was involved.
- 7-8: Mostly strong. Occasional generic phrasing but overall voice is consistent and professional.
- 5-6: Mixed. Some lines land, others feel narrated or over-explained. Inconsistent voice.
- 3-4: Reads like AI with a real estate template. Distancing constructions, stacked adjectives, explaining obvious benefits.
- 1-2: Generic AI output. "It's a home that offers..." throughout. No real estate fluency.
`;
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/quality/scorer.ts src/lib/quality/quality.test.ts
git commit -m "feat: upgrade scorer to GPT-5.2, add voice-authenticity as 10th dimension"
```

---

## Task 6: Pass tone context from `generate.ts` to quality scorer

**Files:**
- Modify: `src/lib/ai/generate.ts` (line ~129)
- Test: `src/lib/ai/__tests__/generate.test.ts`

**Step 1: Write the failing test**

```typescript
it('should pass tone to quality scorer', async () => {
  await generateCampaign(mockListing, { tone: 'luxury' });
  expect(scoreAllPlatformQuality).toHaveBeenCalledWith(
    expect.anything(),  // campaign
    expect.anything(),  // listing
    expect.anything(),  // demographic
    'luxury',           // tone ← NEW
  );
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ai/__tests__/generate.test.ts --verbose`
Expected: FAIL — scoreAllPlatformQuality called without tone

**Step 3: Update `generate.ts` to pass tone**

At line ~129, update the scorer call:

```typescript
// Before:
const aiQuality = await scoreAllPlatformQuality(campaign, listing);

// After:
const aiQuality = await scoreAllPlatformQuality(campaign, listing, demographic, tone);
```

Ensure `tone` is available from the generation options/config passed into the generate function.

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ai/__tests__/generate.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai/generate.ts src/lib/ai/__tests__/generate.test.ts
git commit -m "feat: pass tone context to quality scorer for voice-authenticity awareness"
```

---

## Task 7: Update `mergeQualityResults` for reduced regex output

**Files:**
- Modify: `src/lib/quality/scorer.ts` (lines 331-431, `mergeQualityResults`)
- Test: `src/lib/quality/quality.test.ts`

**Step 1: Write the failing test**

```typescript
describe('mergeQualityResults (format + AI)', () => {
  it('should merge format-only regex results with AI results including voice-authenticity', () => {
    const regexResult: CampaignQualityResult = {
      platforms: [{
        platform: 'instagram.professional',
        issues: [{ category: 'formatting', priority: 'required', rule: 'char-limit', originalText: 'too long...' }],
        passed: false,
      }],
      totalChecks: 1,
      totalPassed: 0,
      requiredIssues: 1,
      recommendedIssues: 0,
      allPassed: false,
    };

    const aiResult: CampaignQualityResult = {
      platforms: [{
        platform: 'instagram.professional',
        issues: [{
          category: 'voice-authenticity',
          priority: 'recommended',
          rule: 'voice-authenticity',
          originalText: "It's the kind of kitchen that handles real use.",
          explanation: 'Distancing construction detected',
        }],
        passed: false,
      }],
      totalChecks: 1,
      totalPassed: 0,
      requiredIssues: 0,
      recommendedIssues: 1,
      allPassed: false,
      overallScore: 6,
    };

    const merged = mergeQualityResults(regexResult, aiResult);
    const instagramIssues = merged.platforms.find(p => p.platform === 'instagram.professional')?.issues || [];
    expect(instagramIssues.length).toBe(2);
    expect(instagramIssues.some(i => i.category === 'formatting')).toBe(true);
    expect(instagramIssues.some(i => i.category === 'voice-authenticity')).toBe(true);
  });
});
```

**Step 2: Run test to verify current merge handles new category**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
This may already pass if `mergeQualityResults` is generic enough. If it does, no changes needed — just verify and commit the test.

**Step 3: Update merge logic if needed**

The existing deduplication logic in `mergeQualityResults` prevents duplicate category flags per platform. Verify that `voice-authenticity` doesn't collide with any existing category. It shouldn't since it's a new category name.

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/quality/quality.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/quality/scorer.ts src/lib/quality/quality.test.ts
git commit -m "test: verify mergeQualityResults handles voice-authenticity category"
```

---

## Task 8: Update barrel export and clean up dead imports

**Files:**
- Modify: `src/lib/quality/index.ts`
- Verify: All files importing from quality modules

**Step 1: Update `index.ts` exports**

Remove exports of deleted functions/constants (like `qualityRules` if it was exported, `autoFixTextAI` if it was exported). Ensure only the active API surface is exported:

```typescript
// engine (format-only)
export { checkAllPlatformQuality, extractPlatformTexts, checkPlatformFormat, checkFormattingAbuse } from './engine';

// rules (format definitions only)
export { platformFormats, formattingRules } from './rules';

// scorer (AI quality with voice-authenticity)
export { scoreAllPlatformQuality, mergeQualityResults, buildScoringPrompt } from './scorer';

// auto-fix (format fixes only)
export { autoFixQuality } from './auto-fix';

// docs
export { buildQualityCheatSheet, loadQualityDocs } from './docs';
```

**Step 2: Verify no broken imports**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors from removed exports)

**Step 3: Run full test suite**

Run: `npx jest --verbose`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/lib/quality/index.ts
git commit -m "refactor: clean up quality module exports after regex language rule removal"
```

---

## Task 9: Full integration test — generate and verify quality pipeline

**Files:**
- Test: `src/lib/ai/__tests__/generate.test.ts`

**Step 1: Write integration test**

```typescript
describe('Quality pipeline integration', () => {
  it('should run format checks + AI scoring (with voice-authenticity) + compliance', async () => {
    // Mock OpenAI to return a campaign with voice issues
    // Verify:
    // 1. checkAllPlatformQuality is called (format-only)
    // 2. scoreAllPlatformQuality is called with tone parameter
    // 3. mergeQualityResults combines both
    // 4. autoFixQuality only applies format fixes
    // 5. checkComplianceWithAgent runs after quality
    // 6. campaign.qualityResult includes voice-authenticity scores

    const result = await generateCampaign(mockListing, { tone: 'professional' });
    expect(checkAllPlatformQuality).toHaveBeenCalled();
    expect(scoreAllPlatformQuality).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), 'professional'
    );
    expect(mergeQualityResults).toHaveBeenCalled();
    expect(autoFixQuality).toHaveBeenCalled();
    expect(result.qualityResult).toBeDefined();
  });
});
```

**Step 2: Run test**

Run: `npx jest src/lib/ai/__tests__/generate.test.ts --verbose`
Expected: PASS

**Step 3: Run full test suite one final time**

Run: `npx jest --verbose`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/lib/ai/__tests__/generate.test.ts
git commit -m "test: add integration test for quality pipeline with voice-authenticity"
```

---

## Task Order & Dependencies

```
Task 1 (strip rules.ts) ──┐
Task 2 (strip engine.ts) ──┼── Can run in parallel (independent files)
Task 3 (strip auto-fix.ts)─┘
         │
Task 4 (add types) ── Must run after 1-3 (types reference categories)
         │
Task 5 (upgrade scorer) ── Must run after 4 (uses new type)
         │
Task 6 (generate.ts tone) ── Must run after 5 (calls updated scorer)
         │
Task 7 (merge verification) ── Must run after 5 (tests new category in merge)
         │
Task 8 (barrel export cleanup) ── Must run after 1-3 (exports changed)
         │
Task 9 (integration test) ── Must run last (verifies full pipeline)
```

**Parallelizable:** Tasks 1, 2, 3 can run concurrently.
**Sequential:** Tasks 4 → 5 → 6, and Task 7 after 5, Task 8 after 1-3.
