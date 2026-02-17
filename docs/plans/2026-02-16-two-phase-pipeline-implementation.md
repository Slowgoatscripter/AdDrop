# Two-Phase Generation Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the ad generation pipeline into two phases (creative generation + compliance rewrite) to reduce Fair Housing violations, add constraint enforcement, and make quality advisory-only.

**Architecture:** Phase 1 generates creative ads with a lean prompt (no full compliance cheat sheet). A regex pre-scan finds exact prohibited term matches. Phase 2 rewrites violations at temp 0. Quality becomes suggestions-only, with hard constraints (char limits, disclosures) auto-enforced before Phase 2. Federal terms are extracted from state files into a shared module.

**Tech Stack:** Next.js 14 (App Router), TypeScript, OpenAI GPT-5.2, Jest, Supabase

**Design Doc:** `docs/plans/2026-02-16-two-phase-generation-pipeline.md`

---

## Phase A: Prompt Tightening

Quick wins with zero architectural changes. Can ship independently.

---

### Task 1: Add severity labels and law citations to cheat sheet

**Files:**
- Modify: `src/lib/ai/prompt.ts:102-140`
- Test: `src/lib/ai/__tests__/prompt.test.ts`

**Step 1: Write the failing test**

In `src/lib/ai/__tests__/prompt.test.ts`, add inside `describe('buildGenerationPrompt', ...)`:

```typescript
test('cheat sheet includes severity labels and law citations', async () => {
  const prompt = await buildGenerationPrompt(mockListing);
  // Hard violations should show (hard) and law citation
  expect(prompt).toMatch(/\(hard\)/);
  expect(prompt).toMatch(/\(soft\)/);
  expect(prompt).toMatch(/42 U\.S\.C\. . 3604/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ai/__tests__/prompt.test.ts -t "severity labels" --no-coverage`
Expected: FAIL -- current cheat sheet doesn't include `(hard)` or `(soft)`

**Step 3: Update `buildCheatSheet` to include severity and law**

In `src/lib/ai/prompt.ts`, replace the `buildCheatSheet` function (lines 102-140):

```typescript
function buildCheatSheet(config: MLSComplianceConfig): string {
  const byCategory = new Map<ViolationCategory, typeof config.prohibitedTerms>();

  for (const term of config.prohibitedTerms) {
    if (!byCategory.has(term.category)) {
      byCategory.set(term.category, []);
    }
    byCategory.get(term.category)!.push(term);
  }

  let sheet = '## Fair Housing Compliance Cheat Sheet\n\n';
  sheet += 'The following terms and phrases MUST NEVER appear in any generated copy.\n\n';

  for (const [category, terms] of byCategory) {
    const label = categoryLabels[category] || category;
    const hardTerms = terms.filter(t => t.severity === 'hard');
    const softTerms = terms.filter(t => t.severity === 'soft');

    sheet += `### ${label}\n`;

    if (hardTerms.length > 0) {
      sheet += '**PROHIBITED (hard violations -- illegal):**\n';
      for (const t of hardTerms) {
        sheet += `- "${t.term}" (hard) -- ${t.shortExplanation}. Say instead: "${t.suggestedAlternative}" [${t.law}]\n`;
      }
    }

    if (softTerms.length > 0) {
      sheet += '**AVOID (soft warnings -- risky):**\n';
      for (const t of softTerms) {
        sheet += `- "${t.term}" (soft) -- ${t.shortExplanation}. Say instead: "${t.suggestedAlternative}" [${t.law}]\n`;
      }
    }

    sheet += '\n';
  }

  return sheet;
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ai/__tests__/prompt.test.ts -t "severity labels" --no-coverage`
Expected: PASS

**Step 5: Run all prompt tests to check for regressions**

Run: `npx jest src/lib/ai/__tests__/prompt.test.ts --no-coverage`
Expected: All tests pass. Some existing tests may need assertion updates if they check for the old format. Fix any failures.

**Step 6: Commit**

```
git add src/lib/ai/prompt.ts src/lib/ai/__tests__/prompt.test.ts
git commit -m "feat: add severity labels and law citations to compliance cheat sheet"
```

---

### Task 2: Move compliance section to end of generation prompt

**Files:**
- Modify: `src/lib/ai/prompt.ts:147-271`
- Test: `src/lib/ai/__tests__/prompt.test.ts`

**Step 1: Write the failing test**

```typescript
test('compliance section appears after quality section in prompt', async () => {
  const prompt = await buildGenerationPrompt(mockListing);
  const qualityIndex = prompt.indexOf('## Ad Quality Standards');
  const complianceIndex = prompt.indexOf('## Fair Housing Compliance');
  const rulesIndex = prompt.indexOf('IMPORTANT RULES:');
  // Compliance should come AFTER quality, and important rules at the very end
  expect(complianceIndex).toBeGreaterThan(qualityIndex);
  expect(rulesIndex).toBeGreaterThan(complianceIndex);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ai/__tests__/prompt.test.ts -t "compliance section appears after" --no-coverage`
Expected: FAIL -- currently compliance is before quality

**Step 3: Reorder sections in `buildGenerationPrompt`**

In `src/lib/ai/prompt.ts`, rearrange the return template string so the order is:
1. Property Details
2. Listing Description + Features + Selling Points (user data)
3. Injection protection note
4. Ad Quality Standards (cheat sheet + textbook)
5. MLS Rules
6. **Fair Housing Compliance** (cheat sheet + textbook) -- moved to near end
7. Output Requirements (JSON template)
8. IMPORTANT RULES -- at the very end for recency bias

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ai/__tests__/prompt.test.ts -t "compliance section appears after" --no-coverage`
Expected: PASS

**Step 5: Run all prompt tests**

Run: `npx jest src/lib/ai/__tests__/prompt.test.ts --no-coverage`
Expected: All pass. Fix any ordering-dependent assertions.

**Step 6: Commit**

```
git add src/lib/ai/prompt.ts src/lib/ai/__tests__/prompt.test.ts
git commit -m "feat: move compliance section to end of prompt for recency bias"
```

---

### Task 3: Strengthen system message in generate.ts

**Files:**
- Modify: `src/lib/ai/generate.ts:82-86`
- Test: `src/lib/ai/__tests__/generate.test.ts`

**Step 1: Write the failing test**

```typescript
test('system message includes Fair Housing Act instruction', async () => {
  await generateCampaign(mockListing);
  const systemMsg = mockCreate.mock.calls[0][0].messages[0];
  expect(systemMsg.content).toContain('Fair Housing Act');
  expect(systemMsg.content).toContain('protected classes');
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/ai/__tests__/generate.test.ts -t "system message includes Fair Housing" --no-coverage`
Expected: FAIL -- current system message doesn't mention Fair Housing

**Step 3: Update system message**

In `src/lib/ai/generate.ts`, replace lines 82-86:

```typescript
{
  role: 'system',
  content: 'You are a real estate marketing expert specializing in platform-native ad copy. Generate compelling, specific marketing content. Always respond with valid JSON only. No markdown, no code fences, no explanatory text.\n\nImportant: All copy must comply with the Fair Housing Act. Never target or exclude based on protected classes. Describe property features, not ideal residents.',
},
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/ai/__tests__/generate.test.ts -t "system message includes Fair Housing" --no-coverage`
Expected: PASS

**Step 5: Run all generate tests**

Run: `npx jest src/lib/ai/__tests__/generate.test.ts --no-coverage`
Expected: All pass

**Step 6: Commit**

```
git add src/lib/ai/generate.ts src/lib/ai/__tests__/generate.test.ts
git commit -m "feat: strengthen system message with Fair Housing compliance instruction"
```

---

## Phase B: Two-Phase Pipeline

Core architectural change. Tasks must be done in order.

---

### Task 4: Add new types (QualitySuggestion, QualityConstraintViolation, updated ComplianceAgentResult)

**Files:**
- Modify: `src/lib/types/quality.ts`
- Modify: `src/lib/types/compliance.ts`
- Modify: `src/lib/types/campaign.ts`
- Modify: `src/lib/types/compliance-qa.ts`
- Modify: `src/lib/types/index.ts` (if it re-exports)

**Step 1: Add types to `src/lib/types/quality.ts`**

Append at the end of the file:

```typescript
/** Advisory quality suggestion -- user applies manually via UI */
export interface QualitySuggestion {
  id: string;
  platform: string;
  category: QualityCategory;
  severity: 'low' | 'medium' | 'high';
  issue: string;
  currentText: string;
  suggestedRewrite?: string;
  explanation: string;
}

/** Auto-enforced hard constraint (char limits, required disclosures) */
export interface QualityConstraintViolation {
  id: string;
  platform: string;
  type: 'character-limit' | 'missing-disclosure' | 'missing-required-field';
  severity: 'critical';
  issue: string;
  currentText: string;
  autoFixed: boolean;
  fixedText?: string;
}
```

**Step 2: Add fields to `ComplianceAgentResult` in `src/lib/types/compliance.ts`**

Add to the `ComplianceAgentResult` interface (after `totalAutoFixes`):

```typescript
  /** false if Phase 2 compliance rewrite failed -- output may be non-compliant */
  complianceRewriteApplied?: boolean;
  /** Distinguishes Phase 2 rewrite results from standalone scan results */
  source?: 'rewrite' | 'scan';
```

**Step 3: Add fields to `CampaignKit` in `src/lib/types/campaign.ts`**

Add after the existing `qualityResult` field:

```typescript
  /** Advisory quality suggestions -- user applies via UI (replaces auto-fix) */
  qualitySuggestions?: import('./quality').QualitySuggestion[];
  /** Auto-enforced hard constraints (char limits, disclosures) */
  qualityConstraints?: import('./quality').QualityConstraintViolation[];
```

**Step 4: Update `PropertyTestResult` in `src/lib/types/compliance-qa.ts`**

Add alongside the existing `qualityFixesApplied` field:

```typescript
  /** @deprecated Use qualitySuggestionsCount instead */
  qualityFixesApplied?: number;
  qualitySuggestionsCount?: number;
  regexFindingsCount?: number;
```

**Step 5: Update re-exports in `src/lib/types/index.ts`**

Verify `QualitySuggestion` and `QualityConstraintViolation` are exported. Add if missing:

```typescript
export type { QualitySuggestion, QualityConstraintViolation } from './quality';
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```
git add src/lib/types/quality.ts src/lib/types/compliance.ts src/lib/types/campaign.ts src/lib/types/compliance-qa.ts src/lib/types/index.ts
git commit -m "feat: add QualitySuggestion, QualityConstraintViolation, and ComplianceAgentResult fields"
```

---

### Task 5: Create `extractAdCopyTexts` utility

**Files:**
- Modify: `src/lib/compliance/utils.ts`
- Create: `src/lib/compliance/__tests__/utils.test.ts`

**Step 1: Write the failing test**

Create `src/lib/compliance/__tests__/utils.test.ts`:

```typescript
import { extractAdCopyTexts, extractPlatformTexts } from '../utils';

const mockCampaign = {
  id: 'test',
  listing: {} as any,
  createdAt: '2026-01-01',
  instagram: { professional: 'pro text', casual: 'casual text', luxury: 'luxury text' },
  twitter: 'tweet text',
  hashtags: ['#realestate', '#home'],
  callsToAction: ['Schedule a tour'],
  targetingNotes: 'Target affluent neighborhoods',
  sellingPoints: ['Great location'],
  complianceResult: { platforms: [], campaignVerdict: 'compliant' as const, violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
} as any;

describe('extractAdCopyTexts', () => {
  test('excludes strategy fields (hashtags, CTAs, targeting, selling points)', () => {
    const texts = extractAdCopyTexts(mockCampaign);
    const labels = texts.map(([label]) => label);
    expect(labels).not.toContain('hashtags');
    expect(labels).not.toContain('callsToAction');
    expect(labels).not.toContain('targetingNotes');
    expect(labels).not.toContain('sellingPoints');
  });

  test('includes ad copy platform texts', () => {
    const texts = extractAdCopyTexts(mockCampaign);
    const labels = texts.map(([label]) => label);
    expect(labels).toContain('instagram.professional');
    expect(labels).toContain('instagram.casual');
    expect(labels).toContain('twitter');
  });

  test('returns same format as extractPlatformTexts minus strategy fields', () => {
    const allTexts = extractPlatformTexts(mockCampaign);
    const adTexts = extractAdCopyTexts(mockCampaign);
    const strategyLabels = ['hashtags', 'callsToAction', 'targetingNotes', 'sellingPoints'];
    const expectedTexts = allTexts.filter(([label]) => !strategyLabels.includes(label));
    expect(adTexts).toEqual(expectedTexts);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/compliance/__tests__/utils.test.ts --no-coverage`
Expected: FAIL -- `extractAdCopyTexts` not defined

**Step 3: Implement `extractAdCopyTexts`**

Add to the end of `src/lib/compliance/utils.ts`:

```typescript
const STRATEGY_LABELS = new Set(['hashtags', 'callsToAction', 'targetingNotes', 'sellingPoints']);

/**
 * Extract ad copy texts only -- excludes strategy fields (hashtags, CTAs, targeting, selling points).
 * Used by the compliance regex scanner and Phase 2 rewrite to avoid scanning internal strategy metadata.
 */
export function extractAdCopyTexts(campaign: CampaignKit): [string, string][] {
  return extractPlatformTexts(campaign).filter(([label]) => !STRATEGY_LABELS.has(label));
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/lib/compliance/__tests__/utils.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```
git add src/lib/compliance/utils.ts src/lib/compliance/__tests__/utils.test.ts
git commit -m "feat: add extractAdCopyTexts to exclude strategy fields from compliance scanning"
```

---

### Task 6: Create compliance regex scanner

**Files:**
- Create: `src/lib/compliance/regex-scan.ts`
- Create: `src/lib/compliance/__tests__/regex-scan.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/compliance/__tests__/regex-scan.test.ts`:

```typescript
import { scanForProhibitedTerms } from '../regex-scan';
import { montanaCompliance } from '../terms/montana';

const makeTexts = (texts: Record<string, string>): [string, string][] =>
  Object.entries(texts);

describe('scanForProhibitedTerms', () => {
  test('detects exact match of prohibited term (case-insensitive)', () => {
    const texts = makeTexts({ 'instagram.casual': 'This exclusive neighborhood awaits you' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].term).toBe('exclusive neighborhood');
    expect(results[0].platform).toBe('instagram.casual');
    expect(results[0].severity).toBe('hard');
  });

  test('is case-insensitive', () => {
    const texts = makeTexts({ twitter: 'An EXCLUSIVE NEIGHBORHOOD for you' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results.some(r => r.term === 'exclusive neighborhood')).toBe(true);
  });

  test('does not flag allowed context: family room', () => {
    const texts = makeTexts({ zillow: 'Spacious family room with fireplace' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    const familyMatches = results.filter(r => r.term.includes('family'));
    expect(familyMatches).toHaveLength(0);
  });

  test('does not flag allowed context: master bedroom', () => {
    const texts = makeTexts({ zillow: 'Large master bedroom with ensuite' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    const masterMatches = results.filter(r => r.term.includes('master'));
    expect(masterMatches).toHaveLength(0);
  });

  test('flags multi-word phrases', () => {
    const texts = makeTexts({ 'facebook.professional': 'This is a safe neighborhood to raise kids' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results.some(r => r.term === 'safe neighborhood')).toBe(true);
  });

  test('returns empty array when no violations found', () => {
    const texts = makeTexts({ twitter: 'Beautiful 3-bed home with updated kitchen' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    expect(results).toHaveLength(0);
  });

  test('includes category and severity from config term', () => {
    const texts = makeTexts({ 'metaAd.headline': 'No children allowed' });
    const results = scanForProhibitedTerms(texts, montanaCompliance);
    const match = results.find(r => r.term === 'no children');
    expect(match).toBeDefined();
    expect(match!.category).toBe('familial-status');
    expect(match!.severity).toBe('hard');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/compliance/__tests__/regex-scan.test.ts --no-coverage`
Expected: FAIL -- module not found

**Step 3: Implement the regex scanner**

Create `src/lib/compliance/regex-scan.ts`:

```typescript
import { MLSComplianceConfig } from '@/lib/types';

export interface RegexScanResult {
  platform: string;
  term: string;
  category: string;
  severity: 'hard' | 'soft';
  matchedText: string;
  position: number;
}

/**
 * Allowlist patterns -- these contexts are acceptable even when they contain prohibited term words.
 */
const ALLOWLIST: Record<string, RegExp[]> = {
  family: [/\bfamily\s+room\b/i, /\bfamily\s+size\b/i, /\bfamily\s+sized\b/i],
  master: [/\bmaster\s+(bedroom|bath|bathroom|suite|closet)\b/i],
  walk: [/\bwalk[- ]?in\s+(closet|pantry|shower)\b/i],
  single: [/\bsingle[- ]?(story|level|car|family)\b/i],
};

/**
 * Build a regex for a prohibited term.
 */
function buildTermRegex(term: string): RegExp {
  if (term.includes('-')) {
    const parts = term.split('-');
    const pattern = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[- ]?');
    return new RegExp(`\\b${pattern}\\b`, 'gi');
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${pattern}\\b`, 'gi');
}

/**
 * Check if a match is in an allowed context.
 */
function isAllowedContext(text: string, term: string, matchIndex: number): boolean {
  const words = term.toLowerCase().split(/[\s-]+/);
  for (const word of words) {
    const patterns = ALLOWLIST[word];
    if (patterns) {
      const windowStart = Math.max(0, matchIndex - 20);
      const windowEnd = Math.min(text.length, matchIndex + term.length + 20);
      const window = text.slice(windowStart, windowEnd);
      if (patterns.some(p => p.test(window))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Scan ad copy texts for exact matches of prohibited terms from the state config.
 */
export function scanForProhibitedTerms(
  adCopyTexts: [string, string][],
  config: MLSComplianceConfig
): RegexScanResult[] {
  const results: RegexScanResult[] = [];

  for (const [platform, text] of adCopyTexts) {
    for (const term of config.prohibitedTerms) {
      const regex = buildTermRegex(term.term);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (!isAllowedContext(text, term.term, match.index)) {
          results.push({
            platform,
            term: term.term,
            category: term.category,
            severity: term.severity,
            matchedText: match[0],
            position: match.index,
          });
        }
      }
    }
  }

  return results;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/compliance/__tests__/regex-scan.test.ts --no-coverage`
Expected: All PASS

**Step 5: Commit**

```
git add src/lib/compliance/regex-scan.ts src/lib/compliance/__tests__/regex-scan.test.ts
git commit -m "feat: add compliance regex scanner with allowlist and multi-word support"
```

---

### Task 7: Create constraint enforcement function

**Files:**
- Create: `src/lib/quality/constraints.ts`
- Create: `src/lib/quality/__tests__/constraints.test.ts`
- Modify: `src/lib/quality/index.ts`

**Step 1: Write the failing tests**

Create `src/lib/quality/__tests__/constraints.test.ts`:

```typescript
import { enforceConstraints } from '../constraints';

const makeCampaign = (overrides: Record<string, any> = {}) => ({
  id: 'test',
  listing: { address: { state: 'MT' } } as any,
  createdAt: '2026-01-01',
  twitter: 'A'.repeat(300),
  mlsDescription: 'B'.repeat(1200),
  complianceResult: { platforms: [], campaignVerdict: 'compliant' as const, violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
  hashtags: [],
  callsToAction: [],
  targetingNotes: '',
  sellingPoints: [],
  ...overrides,
});

const mockConfig = {
  maxDescriptionLength: 1000,
  requiredDisclosures: ['Equal Housing Opportunity'],
} as any;

describe('enforceConstraints', () => {
  test('truncates tweet over 280 chars', () => {
    const campaign = makeCampaign();
    const { campaign: fixed, constraints } = enforceConstraints(campaign, mockConfig);
    expect(fixed.twitter!.length).toBeLessThanOrEqual(280);
    expect(constraints.some(c => c.type === 'character-limit' && c.platform === 'twitter')).toBe(true);
  });

  test('truncates MLS description over maxDescriptionLength', () => {
    const campaign = makeCampaign();
    const { campaign: fixed, constraints } = enforceConstraints(campaign, mockConfig);
    expect(fixed.mlsDescription!.length).toBeLessThanOrEqual(1000);
    expect(constraints.some(c => c.type === 'character-limit' && c.platform === 'mlsDescription')).toBe(true);
  });

  test('returns empty constraints when everything is within limits', () => {
    const campaign = makeCampaign({ twitter: 'Short tweet', mlsDescription: 'Short desc' });
    const { constraints } = enforceConstraints(campaign, mockConfig);
    expect(constraints).toHaveLength(0);
  });

  test('constraint has autoFixed=true and fixedText when truncated', () => {
    const campaign = makeCampaign();
    const { constraints } = enforceConstraints(campaign, mockConfig);
    const twitterConstraint = constraints.find(c => c.platform === 'twitter');
    expect(twitterConstraint?.autoFixed).toBe(true);
    expect(twitterConstraint?.fixedText).toBeDefined();
    expect(twitterConstraint?.fixedText!.length).toBeLessThanOrEqual(280);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/quality/__tests__/constraints.test.ts --no-coverage`
Expected: FAIL -- module not found

**Step 3: Implement `enforceConstraints`**

Create `src/lib/quality/constraints.ts`:

```typescript
import { CampaignKit, MLSComplianceConfig } from '@/lib/types';
import { QualityConstraintViolation } from '@/lib/types/quality';

const GOOGLE_AD_LIMITS = { headline: 30, description: 90 };

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? truncated.slice(0, lastSpace) : truncated).trimEnd() + '\u2026';
}

export function enforceConstraints(
  campaign: CampaignKit,
  config: MLSComplianceConfig
): { campaign: CampaignKit; constraints: QualityConstraintViolation[] } {
  const constraints: QualityConstraintViolation[] = [];
  const fixed = { ...campaign };
  let constraintId = 0;

  const add = (
    platform: string,
    type: QualityConstraintViolation['type'],
    issue: string,
    currentText: string,
    fixedText?: string
  ) => {
    constraints.push({
      id: `constraint-${++constraintId}`,
      platform, type, severity: 'critical', issue, currentText,
      autoFixed: !!fixedText, fixedText,
    });
  };

  // Twitter: 280 chars
  if (fixed.twitter && fixed.twitter.length > 280) {
    const original = fixed.twitter;
    fixed.twitter = truncateAtWord(original, 280);
    add('twitter', 'character-limit', `Tweet is ${original.length} chars, max 280`, original, fixed.twitter);
  }

  // Meta Ad
  if (fixed.metaAd) {
    const meta = { ...fixed.metaAd };
    if (meta.primaryText && meta.primaryText.length > 125) {
      const o = meta.primaryText;
      meta.primaryText = truncateAtWord(o, 125);
      add('metaAd.primaryText', 'character-limit', `Primary text is ${o.length} chars, ideal max 125`, o, meta.primaryText);
    }
    if (meta.headline && meta.headline.length > 40) {
      const o = meta.headline;
      meta.headline = truncateAtWord(o, 40);
      add('metaAd.headline', 'character-limit', `Headline is ${o.length} chars, max 40`, o, meta.headline);
    }
    if (meta.description && meta.description.length > 30) {
      const o = meta.description;
      meta.description = truncateAtWord(o, 30);
      add('metaAd.description', 'character-limit', `Description is ${o.length} chars, max 30`, o, meta.description);
    }
    fixed.metaAd = meta;
  }

  // Google Ads
  if (fixed.googleAds) {
    fixed.googleAds = fixed.googleAds.map((ad, i) => {
      const fixedAd = { ...ad };
      if (fixedAd.headline && fixedAd.headline.length > GOOGLE_AD_LIMITS.headline) {
        const o = fixedAd.headline;
        fixedAd.headline = truncateAtWord(o, GOOGLE_AD_LIMITS.headline);
        add(`googleAds[${i}].headline`, 'character-limit', `Headline is ${o.length} chars, max ${GOOGLE_AD_LIMITS.headline}`, o, fixedAd.headline);
      }
      if (fixedAd.description && fixedAd.description.length > GOOGLE_AD_LIMITS.description) {
        const o = fixedAd.description;
        fixedAd.description = truncateAtWord(o, GOOGLE_AD_LIMITS.description);
        add(`googleAds[${i}].description`, 'character-limit', `Description is ${o.length} chars, max ${GOOGLE_AD_LIMITS.description}`, o, fixedAd.description);
      }
      return fixedAd;
    });
  }

  // MLS description
  if (fixed.mlsDescription && config.maxDescriptionLength && fixed.mlsDescription.length > config.maxDescriptionLength) {
    const o = fixed.mlsDescription;
    fixed.mlsDescription = truncateAtWord(o, config.maxDescriptionLength);
    add('mlsDescription', 'character-limit', `MLS description is ${o.length} chars, max ${config.maxDescriptionLength}`, o, fixed.mlsDescription);
  }

  return { campaign: fixed, constraints };
}
```

**Step 4: Export from `src/lib/quality/index.ts`**

Add: `export { enforceConstraints } from './constraints';`

**Step 5: Run tests to verify they pass**

Run: `npx jest src/lib/quality/__tests__/constraints.test.ts --no-coverage`
Expected: All PASS

**Step 6: Commit**

```
git add src/lib/quality/constraints.ts src/lib/quality/__tests__/constraints.test.ts src/lib/quality/index.ts
git commit -m "feat: add constraint enforcement for character limits and required fields"
```

---

### Task 8: Create `rewriteForCompliance` function

**Files:**
- Modify: `src/lib/compliance/agent.ts`
- Modify: `src/lib/compliance/agent.test.ts`

**Step 1: Write the failing tests**

Add to `src/lib/compliance/agent.test.ts`, a new `describe` block:

```typescript
describe('rewriteForCompliance', () => {
  const { rewriteForCompliance } = require('./agent');

  it('returns rewritten campaign and compliance result on success', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            rewrittenTexts: { 'instagram.casual': 'Fixed text without violations' },
            complianceResult: {
              platforms: [{ platform: 'instagram.casual', verdict: 'pass', violationCount: 0, autoFixCount: 1 }],
              campaignVerdict: 'compliant',
              violations: [],
              autoFixes: [{ platform: 'instagram.casual', before: 'exclusive area', after: 'desirable area', violationTerm: 'exclusive area', category: 'steering' }],
              totalViolations: 0, totalAutoFixes: 1,
            },
          }),
        },
      }],
    });

    const campaign = buildMockCampaign({ instagram: { professional: 'Clean text', casual: 'This exclusive area is great', luxury: 'Luxury text' } });
    const regexFindings = [{ platform: 'instagram.casual', term: 'exclusive area', category: 'steering', severity: 'hard' as const, matchedText: 'exclusive area', position: 5 }];

    const result = await rewriteForCompliance(campaign, montanaCompliance, regexFindings);
    expect(result.campaign.instagram?.casual).toBe('Fixed text without violations');
    expect(result.campaign.instagram?.professional).toBe('Clean text');
    expect(result.complianceResult.campaignVerdict).toBe('compliant');
    expect(result.complianceResult.complianceRewriteApplied).toBe(true);
  });

  it('returns original campaign with needs-review on API failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API timeout'));

    const campaign = buildMockCampaign();
    const result = await rewriteForCompliance(campaign, montanaCompliance, []);
    expect(result.complianceResult.campaignVerdict).toBe('needs-review');
    expect(result.complianceResult.complianceRewriteApplied).toBe(false);
  });

  it('excludes strategy fields from texts sent to AI', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ rewrittenTexts: {}, complianceResult: { platforms: [], campaignVerdict: 'compliant', violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 } }) } }],
    });

    await rewriteForCompliance(buildMockCampaign(), montanaCompliance, []);
    const userPrompt = mockCreate.mock.calls[0][0].messages[1].content;
    expect(userPrompt).not.toContain('Platform: hashtags');
    expect(userPrompt).not.toContain('Platform: targetingNotes');
  });

  it('uses temperature 0 for deterministic output', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ rewrittenTexts: {}, complianceResult: { platforms: [], campaignVerdict: 'compliant', violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 } }) } }],
    });

    await rewriteForCompliance(buildMockCampaign(), montanaCompliance, []);
    expect(mockCreate.mock.calls[0][0].temperature).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/compliance/agent.test.ts -t "rewriteForCompliance" --no-coverage`
Expected: FAIL -- `rewriteForCompliance` not defined

**Step 3: Implement `rewriteForCompliance`**

Add imports at top of `src/lib/compliance/agent.ts`:

```typescript
import { extractAdCopyTexts } from './utils';
import type { RegexScanResult } from './regex-scan';
```

Add the function before `createFallbackResult`. The function should:
1. Call `extractAdCopyTexts` (excludes strategy fields)
2. Load compliance docs and format terms
3. Build a system prompt instructing surgical compliance edits only
4. Build a user prompt with docs, terms, regex findings, and ad copy texts
5. Call GPT-5.2 at temperature 0 with `callWithRetry`
6. Parse the response containing `rewrittenTexts` and `complianceResult`
7. Merge rewritten texts back using dot-notation path parsing
8. On failure: return original campaign with `complianceRewriteApplied: false`

See the design doc "Phase 2: Compliance Rewrite" section for the exact system and user prompts.

The `applyRewrittenTexts` helper parses dot-notation keys (e.g., `instagram.casual`, `googleAds[0].headline`) and navigates the campaign object to replace strings. Invalid paths are logged and skipped.

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/compliance/agent.test.ts -t "rewriteForCompliance" --no-coverage`
Expected: All PASS

**Step 5: Run all agent tests for regressions**

Run: `npx jest src/lib/compliance/agent.test.ts --no-coverage`
Expected: All pass

**Step 6: Commit**

```
git add src/lib/compliance/agent.ts src/lib/compliance/agent.test.ts
git commit -m "feat: add rewriteForCompliance with merge logic and failure handling"
```

---

### Task 9: Create `buildQualitySuggestions` function

**Files:**
- Create: `src/lib/quality/suggestions.ts`
- Modify: `src/lib/quality/index.ts`
- Test: `src/lib/quality/quality.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/quality/quality.test.ts`:

```typescript
import { buildQualitySuggestions } from './index';

describe('buildQualitySuggestions', () => {
  test('converts quality issues to suggestions', () => {
    const qualityResult = {
      platforms: [{
        platform: 'instagram', tone: 'casual', checks: [], score: 7,
        issues: [{
          platform: 'instagram.casual', category: 'filler-words' as any,
          priority: 'recommended' as const, source: 'regex' as const,
          issue: 'Contains filler words', suggestedFix: 'Remove filler',
          originalText: 'This is a very nice home', fixedText: 'This home stands out',
        }],
        passed: true,
      }],
      totalChecks: 1, totalPassed: 0, requiredIssues: 0, recommendedIssues: 1,
      allPassed: false, improvementsApplied: 0,
    };

    const suggestions = buildQualitySuggestions(qualityResult);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].platform).toBe('instagram.casual');
    expect(suggestions[0].category).toBe('filler-words');
    expect(suggestions[0].severity).toBe('medium');
    expect(suggestions[0].id).toBeDefined();
  });

  test('returns empty array when no issues', () => {
    const qualityResult = {
      platforms: [], totalChecks: 0, totalPassed: 0,
      requiredIssues: 0, recommendedIssues: 0, allPassed: true, improvementsApplied: 0,
    };
    expect(buildQualitySuggestions(qualityResult)).toHaveLength(0);
  });

  test('maps required priority to high severity', () => {
    const qualityResult = {
      platforms: [{
        platform: 'twitter', checks: [], score: 5,
        issues: [{ platform: 'twitter', category: 'weak-hook' as any, priority: 'required' as const, source: 'ai' as const, issue: 'Weak hook', suggestedFix: 'Fix hook' }],
        passed: false,
      }],
      totalChecks: 1, totalPassed: 0, requiredIssues: 1, recommendedIssues: 0,
      allPassed: false, improvementsApplied: 0,
    };
    const suggestions = buildQualitySuggestions(qualityResult);
    expect(suggestions[0].severity).toBe('high');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/quality/quality.test.ts -t "buildQualitySuggestions" --no-coverage`
Expected: FAIL

**Step 3: Implement `buildQualitySuggestions`**

Create `src/lib/quality/suggestions.ts`:

```typescript
import { CampaignQualityResult, QualitySuggestion } from '@/lib/types/quality';

export function buildQualitySuggestions(
  qualityResult: CampaignQualityResult
): QualitySuggestion[] {
  const suggestions: QualitySuggestion[] = [];
  let id = 0;

  for (const platformResult of qualityResult.platforms) {
    for (const issue of platformResult.issues || []) {
      suggestions.push({
        id: `suggestion-${++id}`,
        platform: issue.platform,
        category: issue.category,
        severity: issue.priority === 'required' ? 'high' : 'medium',
        issue: issue.issue,
        currentText: issue.originalText || '',
        suggestedRewrite: issue.suggestedFix || issue.fixedText,
        explanation: issue.suggestedFix || issue.issue,
      });
    }
  }

  return suggestions;
}
```

**Step 4: Export from `src/lib/quality/index.ts`**

Add: `export { buildQualitySuggestions } from './suggestions';`

**Step 5: Run tests to verify they pass**

Run: `npx jest src/lib/quality/quality.test.ts -t "buildQualitySuggestions" --no-coverage`
Expected: All PASS

**Step 6: Commit**

```
git add src/lib/quality/suggestions.ts src/lib/quality/index.ts src/lib/quality/quality.test.ts
git commit -m "feat: add buildQualitySuggestions for advisory quality suggestions"
```

---

### Task 10: Refactor `generateCampaign` to two-phase pipeline

**Files:**
- Modify: `src/lib/ai/prompt.ts:147-271`
- Modify: `src/lib/ai/generate.ts:60-157`
- Modify: `src/lib/ai/__tests__/generate.test.ts`
- Modify: `src/lib/ai/__tests__/prompt.test.ts`

This is the core refactor connecting Tasks 4-9.

**Step 1: Lean down the generation prompt in `prompt.ts`**

- Remove `buildCheatSheet` function (lines 102-140)
- Remove `categoryLabels` record (lines 83-96)
- Remove `import { loadComplianceDocs }` from line 3
- Replace the `complianceSection` variable in `buildGenerationPrompt` with a lightweight summary (see design doc "Phase 1: Creative Generation" section)
- Remove the textbook loading block

**Step 2: Refactor `generateCampaign` in `generate.ts`**

Update imports to add: `rewriteForCompliance`, `scanForProhibitedTerms`, `extractAdCopyTexts`, `buildQualitySuggestions`, `enforceConstraints`

Remove imports: `checkComplianceWithAgent`, `autoFixQuality`

Replace the pipeline section (lines 138-154) with the two-phase flow from the design doc "Updated generateCampaign Flow" section. Key changes:
1. Add constraint enforcement after campaign creation
2. Add regex pre-scan using `extractAdCopyTexts`
3. Replace `checkComplianceWithAgent` call with `rewriteForCompliance` wrapped in try/catch
4. Replace `autoFixQuality` + apply with `buildQualitySuggestions` (read-only)
5. Set `qualityConstraints` and `qualitySuggestions` on the returned campaign

**Step 3: Update generate tests**

Update all mocks to reference new functions instead of old ones. Update assertions to check for `qualitySuggestions` and `qualityConstraints` instead of `qualityResult`.

**Step 4: Update prompt tests**

Update tests to assert the prompt contains the lightweight compliance summary instead of the full cheat sheet.

**Step 5: Run all tests**

Run: `npx jest src/lib/ai/__tests__/ --no-coverage`
Expected: All pass

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```
git add src/lib/ai/prompt.ts src/lib/ai/generate.ts src/lib/ai/__tests__/generate.test.ts src/lib/ai/__tests__/prompt.test.ts
git commit -m "feat: refactor generateCampaign to two-phase pipeline with constraint enforcement"
```

---

### Task 11: Update admin QA routes and cron route

**Files:**
- Modify: `src/app/api/admin/compliance-qa/run/route.ts:166`
- Modify: `src/app/api/cron/compliance-qa/route.ts:114`

**Step 1: Update both routes**

In both files, find:
```typescript
qualityFixesApplied: campaign.qualityResult?.improvementsApplied || 0,
```

Replace with:
```typescript
qualityFixesApplied: 0,
qualitySuggestionsCount: campaign.qualitySuggestions?.length ?? 0,
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add src/app/api/admin/compliance-qa/run/route.ts src/app/api/cron/compliance-qa/route.ts
git commit -m "fix: update QA routes to read qualitySuggestions instead of improvementsApplied"
```

---

### Task 12: Full test suite and build verification

**Step 1: Run all tests**

Run: `npx jest --no-coverage`
Expected: All pass. Fix any failures.

**Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit any remaining fixes**

```
git add -A
git commit -m "fix: resolve test and build issues from Phase B pipeline refactor"
```

---

## Phase B.5: Federal Term Extraction

Pure refactor -- no behavioral changes. Can be done independently.

---

### Task 13: Create `federal.ts` with shared federal terms

**Files:**
- Create: `src/lib/compliance/terms/federal.ts`
- Create: `src/lib/compliance/terms/__tests__/federal.test.ts`

**Step 1: Write the failing test**

Create `src/lib/compliance/terms/__tests__/federal.test.ts`:

```typescript
import { allFederalTerms } from '../federal';

describe('federal terms', () => {
  test('contains expected term count', () => {
    expect(allFederalTerms.length).toBeGreaterThanOrEqual(160);
    expect(allFederalTerms.length).toBeLessThanOrEqual(180);
  });

  test('no duplicate terms', () => {
    const termStrings = allFederalTerms.map(t => t.term.toLowerCase());
    const unique = new Set(termStrings);
    expect(unique.size).toBe(termStrings.length);
  });

  test('all terms have required fields', () => {
    for (const term of allFederalTerms) {
      expect(term.term).toBeTruthy();
      expect(term.category).toBeTruthy();
      expect(['hard', 'soft']).toContain(term.severity);
      expect(term.shortExplanation).toBeTruthy();
      expect(term.law).toBeTruthy();
      expect(term.suggestedAlternative).toBeTruthy();
    }
  });

  test('all terms reference federal law only', () => {
    for (const term of allFederalTerms) {
      const isFederal = term.law.includes('42 U.S.C.') || term.law.includes('FTC Act');
      expect(isFederal).toBe(true);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/lib/compliance/terms/__tests__/federal.test.ts --no-coverage`
Expected: FAIL -- module not found

**Step 3: Create `federal.ts`**

Extract the shared terms from `montana.ts`. Only include terms where the `law` field cites purely federal law (`42 U.S.C.` or `FTC Act`), not state-specific law. Export by category and as a combined `allFederalTerms` array.

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/compliance/terms/__tests__/federal.test.ts --no-coverage`
Expected: All PASS

**Step 5: Commit**

```
git add src/lib/compliance/terms/federal.ts src/lib/compliance/terms/__tests__/federal.test.ts
git commit -m "feat: extract shared federal compliance terms into federal.ts"
```

---

### Task 14: Refactor Montana and Ohio to import federal terms

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts`
- Modify: `src/lib/compliance/terms/ohio.ts`
- Modify: `src/lib/compliance/terms/__tests__/ohio.test.ts`
- Create: `src/lib/compliance/terms/__tests__/montana.test.ts`

**Step 1: Write regression tests that verify current term counts**

Create `src/lib/compliance/terms/__tests__/montana.test.ts`:

```typescript
import { montanaCompliance } from '../montana';
import { allFederalTerms } from '../federal';

describe('Montana compliance config', () => {
  test('total term count is unchanged after refactor', () => {
    expect(montanaCompliance.prohibitedTerms.length).toBe(223);
  });

  test('includes all federal terms', () => {
    const montanaTerms = new Set(montanaCompliance.prohibitedTerms.map(t => t.term));
    for (const fedTerm of allFederalTerms) {
      expect(montanaTerms.has(fedTerm.term)).toBe(true);
    }
  });

  test('has no duplicate terms', () => {
    const terms = montanaCompliance.prohibitedTerms.map(t => t.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });
});
```

Add similar tests to `ohio.test.ts` (expect 217 total terms).

**Step 2: Run regression tests (should pass with current code)**

Run: `npx jest src/lib/compliance/terms/__tests__/ --no-coverage`
Expected: PASS

**Step 3: Refactor montana.ts and ohio.ts**

Import `allFederalTerms` from `./federal`. Remove duplicated federal term arrays. Keep only state-specific terms and law citation overrides. Spread `allFederalTerms` into the combined `prohibitedTerms` array.

**Step 4: Run regression tests to verify counts are unchanged**

Run: `npx jest src/lib/compliance/terms/__tests__/ --no-coverage`
Expected: All PASS -- term counts identical

**Step 5: Run full compliance agent tests**

Run: `npx jest src/lib/compliance/ --no-coverage`
Expected: All pass

**Step 6: Commit**

```
git add src/lib/compliance/terms/montana.ts src/lib/compliance/terms/ohio.ts src/lib/compliance/terms/__tests__/
git commit -m "refactor: Montana and Ohio import federal terms instead of duplicating"
```

---

### Task 15: Final verification and build

**Step 1: Run all tests**

Run: `npx jest --no-coverage`
Expected: All pass

**Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Build and clear caches**

Run: `rm -rf .next/ node_modules/.cache/ && npm run build`
Expected: Clean build

**Step 4: Commit**

```
git commit --allow-empty -m "chore: Phase B + B.5 complete -- two-phase pipeline and federal term extraction"
```

---

## Phase C: UI Quality Suggestions

Phase C is UI-focused. These tasks are intentionally higher-level because UI components require interactive design decisions.

---

### Task 16: Update compliance banner for new pipeline semantics

**Files:**
- Modify: `src/components/campaign/compliance-banner.tsx`
- Modify: `src/components/campaign/campaign-shell.tsx`

Handle `complianceRewriteApplied === false` warning state. Remove "Fix All" button. Show per-ad violations inline.

---

### Task 17: Build quality suggestions panel component

**Files:**
- Create: `src/components/campaign/quality-suggestions-panel.tsx`

Accepts `qualitySuggestions` and `qualityConstraints`. Grouped by platform, collapsible cards, Apply/Dismiss actions.

---

### Task 18: Build apply-suggestion flow with compliance re-check

State machine: `idle -> applying -> compliance-checking -> applied/rejected/error`. Uses `scanTextWithAgent` on modified text only. Sequential application (one at a time).

---

### Task 19: Wire up campaign page and handle backward compatibility

Handle old campaigns (no `qualitySuggestions`) gracefully. Check for new fields first, fall back to old shape.

---

### Task 20: Cleanup orphaned components

- Delete or redesign `quality-banner.tsx`
- Review `ad-card-wrapper.tsx` quality prop usage
- Update `compliance-settings-form.tsx` to derive state options from registry

---

### Task 21: Update admin QA panel views for new metrics

- Update `history-view.tsx` and `runner-view.tsx` to handle both old and new field names
- Add `regexFindingsCount` display where available
