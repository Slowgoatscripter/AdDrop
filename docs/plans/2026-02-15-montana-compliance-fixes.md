# Montana Compliance Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 17 audit findings in Montana compliance configuration — misnamed categories, wrong penalties, duplicate terms, cheat sheet quality issues, and missing terms.

**Architecture:** The compliance system uses an AI agent (GPT-5.2) that receives a cheat sheet of prohibited terms + legal docs as context. Changes to `terms/montana.ts` directly affect what the agent flags. All category renames must propagate through types, UI components, prompt builder, agent schema, settings defaults, and documentation.

**Tech Stack:** TypeScript, Next.js, Supabase, Vitest

---

## Phase 1: Category Rename (`political-beliefs` → `creed`)

This is the highest-impact change — touches 8 source files + 3 doc files. Do it first so all subsequent work uses the correct category.

---

### Task 1: Update ViolationCategory type

**Files:**
- Modify: `src/lib/types/compliance.ts:10`

**Step 1: Edit the type**

Change line 10 from:
```typescript
  | 'political-beliefs'
```
to:
```typescript
  | 'creed'
```

**Step 2: Verify TypeScript catches all downstream references**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Multiple type errors in files that still use `'political-beliefs'` — this confirms the rename propagates. Do NOT fix them yet (we fix each file in its own task).

**Step 3: Commit**

```bash
git add src/lib/types/compliance.ts
git commit -m "refactor: rename political-beliefs to creed in ViolationCategory type"
```

---

### Task 2: Update agent.ts prompt schema

**Files:**
- Modify: `src/lib/compliance/agent.ts:65-66,178-179`

**Step 1: Update both JSON schema strings**

The agent prompt contains the category union in two places (for `checkComplianceWithAgent` and `scanTextWithAgent`). In both locations, replace `"political-beliefs"` with `"creed"` in the category enum string.

Line ~65 (and duplicate at ~66 — appears to be a duplicate line, fix both):
```
"category": "steering" | ... | "creed" | "economic-exclusion" | "misleading-claims",
```

Line ~178 (and duplicate at ~179):
```
"category": "steering" | ... | "creed" | "economic-exclusion" | "misleading-claims",
```

**Step 2: Commit**

```bash
git add src/lib/compliance/agent.ts
git commit -m "refactor: update agent prompt schema political-beliefs to creed"
```

---

### Task 3: Update prompt.ts categoryLabels

**Files:**
- Modify: `src/lib/ai/prompt.ts:92`

**Step 1: Edit categoryLabels**

Change line 92 from:
```typescript
  'political-beliefs': 'Political Beliefs',
```
to:
```typescript
  'creed': 'Creed',
```

**Step 2: Commit**

```bash
git add src/lib/ai/prompt.ts
git commit -m "refactor: update prompt categoryLabels political-beliefs to creed"
```

---

### Task 4: Update settings defaults

**Files:**
- Modify: `src/lib/settings/defaults.ts:14`

**Step 1: Edit defaults**

Change line 14 from:
```typescript
    'steering', 'familial-status', 'disability', 'race-color-national-origin',
    'religion', 'sex-gender', 'age', 'marital-status', 'political-beliefs',
    'economic-exclusion', 'misleading-claims',
```
Replace `'political-beliefs'` with `'creed'`.

**Step 2: Commit**

```bash
git add src/lib/settings/defaults.ts
git commit -m "refactor: update default categories political-beliefs to creed"
```

---

### Task 5: Update compliance-settings-form.tsx

**Files:**
- Modify: `src/components/admin/compliance-settings-form.tsx:16`

**Step 1: Edit CATEGORIES array**

Change line 16 from:
```typescript
  { key: 'political-beliefs', label: 'Political Beliefs' },
```
to:
```typescript
  { key: 'creed', label: 'Creed (includes political beliefs)' },
```

**Step 2: Commit**

```bash
git add src/components/admin/compliance-settings-form.tsx
git commit -m "refactor: update admin UI political-beliefs to creed"
```

---

### Task 6: Update violation-details.tsx

**Files:**
- Modify: `src/components/campaign/violation-details.tsx:23,37`

**Step 1: Edit categoryColors (line 23)**

Change:
```typescript
  'political-beliefs': 'bg-gray-100 text-gray-800',
```
to:
```typescript
  'creed': 'bg-gray-100 text-gray-800',
```

**Step 2: Edit categoryLabels (line 37)**

Change:
```typescript
  'political-beliefs': 'Political Beliefs',
```
to:
```typescript
  'creed': 'Creed',
```

**Step 3: Commit**

```bash
git add src/components/campaign/violation-details.tsx
git commit -m "refactor: update violation UI political-beliefs to creed"
```

---

### Task 7: Rename terms array + update categories in montana.ts

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:1436-1549,1792,1839`

**Step 1: Rename the array**

Change line 1436 from:
```typescript
const politicalBeliefsTerms: ProhibitedTerm[] = [
```
to:
```typescript
const creedTerms: ProhibitedTerm[] = [
```

**Step 2: Replace all `category: 'political-beliefs'` with `category: 'creed'`**

There are 14 occurrences in this array (lines 1439, 1447, 1455, 1463, 1471, 1479, 1487, 1495, 1503, 1511, 1519, 1527, 1535, 1543). Use find-and-replace within the file — replace all `category: 'political-beliefs'` with `category: 'creed'`.

**Step 3: Update the allProhibitedTerms spread (line ~1792)**

Find where `politicalBeliefsTerms` is spread into `allProhibitedTerms` and change to `creedTerms`.

**Step 4: Update docPaths (line ~1839)**

Change:
```typescript
    'compliance-docs/state/montana/political-beliefs.md',
```
to:
```typescript
    'compliance-docs/state/montana/creed.md',
```

**Step 5: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "refactor: rename politicalBeliefsTerms to creedTerms, update categories"
```

---

### Task 8: Reclassify creed terms (severity + moves)

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts` (creedTerms array, lines ~1436-1549)

**Step 1: Add transparency notes to 5 hard terms**

For these 5 terms, keep `severity: 'hard'` and add to their `shortExplanation`: `" (conservative compliance interpretation — creed coverage of political worldview is not explicitly established in MT housing case law)"`:
- `conservative neighborhood`
- `liberal community`
- `like-minded neighbors`
- `faith-and-flag community`
- `eco-conscious residents only`

**Step 2: Downgrade 6 terms to soft**

Change `severity: 'hard'` → `severity: 'soft'` for:
- `blue state values`
- `red state living`
- `red state values`
- `blue state haven`
- `patriotic community`
- `freedom-loving homesteaders`

**Step 3: Move 3 terms to steering category**

For these 3 terms, change `category: 'creed'` → `category: 'steering'`, `severity` → `'soft'`, and update `law` to `'42 U.S.C. § 3604(c) (steering proxy); NAR Code of Ethics Art. 10'`:
- `trump country`
- `trump supporters welcome`
- `maga community`

Move these 3 entries from the `creedTerms` array into the `steeringTerms` array.

**Step 4: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: reclassify creed terms — severity downgrades + 3 moved to steering"
```

---

### Task 9: Rename compliance doc + add legal disclaimer

**Files:**
- Rename: `compliance-docs/state/montana/political-beliefs.md` → `compliance-docs/state/montana/creed.md`
- Modify: `compliance-docs/state/montana/creed.md` (add disclaimer)

**Step 1: Rename the file**

```bash
git mv "compliance-docs/state/montana/political-beliefs.md" "compliance-docs/state/montana/creed.md"
```

**Step 2: Add legal disclaimer**

After the "What It Prohibits" heading in `creed.md`, add:

```markdown
> **Legal Note:** MCA § 49-2-305 protects "creed" in housing, which is broader than organized religion but does not explicitly name "political beliefs" or "political ideas" (those terms appear in employment law at MCA § 49-2-303). Montana courts have not definitively ruled on whether partisan political identity constitutes "creed" for housing purposes. This compliance module treats political speech in housing advertising as potentially covered under creed protections as a conservative compliance approach. Terms marked as "soft" reflect this legal uncertainty.
```

**Step 3: Update human-rights-act.md protected class table**

In `compliance-docs/state/montana/human-rights-act.md`, find the protected class table and change "Political Beliefs" → "Creed".

**Step 4: Update MASTER-TERM-LIST.md**

In `compliance-docs/MASTER-TERM-LIST.md`:
- Line 156: Change heading to `## Creed (Montana-Specific)`
- Lines 160-168: Change all `political-beliefs` category references to `creed`
- Lines 162-163: Update the 3 trump/maga entries to show `steering` category instead
- Line 213: Change `political-beliefs (Montana)` to `creed (Montana)`
- Line 259: Change path to `state/montana/creed.md`

**Step 5: Commit**

```bash
git add compliance-docs/
git commit -m "docs: rename political-beliefs to creed, add legal disclaimer"
```

---

### Task 10: Verify type-check passes

**Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: 0 errors — all `political-beliefs` references should be updated.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass.

**Step 3: Commit (if any fixups needed)**

---

## Phase 2: Bug Fixes (Fixes 2-4)

---

### Task 11: Remove duplicate "no section 8"

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:810-816,1554-1560,1562-1568`

**Step 1: Update the race-color-national-origin entry (line ~810)**

Change the citation:
```typescript
  law: '42 U.S.C. § 3604(c)',
```
to:
```typescript
  law: '42 U.S.C. § 3604(c) (disparate impact theory)',
```

**Step 2: Delete the economic-exclusion duplicate (lines ~1554-1560)**

Remove the entire `{ term: 'no section 8', category: 'economic-exclusion', ... }` entry.

**Step 3: Downgrade "no vouchers" (line ~1562)**

Change `severity: 'hard'` → `severity: 'soft'` for the "no vouchers" entry.

Also update its law citation — remove "local source-of-income protections" (Montana has none statewide):
```typescript
  law: '42 U.S.C. § 3604(c) (disparate impact theory)',
```

**Step 4: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: remove duplicate no-section-8, downgrade no-vouchers to soft"
```

---

### Task 12: Fix penalty amounts in compliance docs

**Files:**
- Modify: `compliance-docs/state/montana/human-rights-act.md:74-80`
- Modify: `compliance-docs/state/montana/age-protections.md:53-56`
- Modify: `compliance-docs/state/montana/marital-status.md:62-65`

**Step 1: Fix human-rights-act.md penalties**

Replace the penalty section (lines ~74-80) with:

```markdown
### Penalties

**Montana State Penalties (Board of Realty Regulation):**
- Discretionary, up to $1,000 per violation

**Federal FHA Civil Penalties (2025 inflation-adjusted):**
- First offense (no prior adjudication): up to $26,262
- One or more prior violations within 5 years: up to $65,654
- Two or more prior violations within 7 years: up to $131,308

Plus compensatory damages, attorney's fees, and injunctive relief under both state and federal law.
```

**Step 2: Fix age-protections.md penalties (lines ~53-56)**

Replace with same structure (state vs federal separation). Use the same penalty text above.

**Step 3: Fix marital-status.md penalties (lines ~62-65)**

Replace with same structure.

**Step 4: Commit**

```bash
git add compliance-docs/state/montana/
git commit -m "fix: correct penalty amounts — separate state ($1k) from federal ($26k+)"
```

---

### Task 13: Fix malformed citation on "handicapped"

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:427`

**Step 1: Fix citation**

Change line 427 from:
```typescript
  law: 'Fair Housing Act §3604(c)(f)',
```
to:
```typescript
  law: '42 U.S.C. § 3604(c); 42 U.S.C. § 3604(f)',
```

**Step 2: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: correct malformed citation on handicapped term"
```

---

## Phase 3: Cheat Sheet Quality (Fixes 5-8)

---

### Task 14: Narrow overly broad single-word terms

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:690-696,738-744,746-752`

**Step 1: Replace "predominantly" (line ~690)**

Replace the single entry with two phrase entries:
```typescript
{
  term: 'predominantly white',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Describes demographic composition of a neighborhood',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'describe the actual characteristic',
},
{
  term: 'predominantly black',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Describes demographic composition of a neighborhood',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'describe the actual characteristic',
},
{
  term: 'predominantly hispanic',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Describes demographic composition of a neighborhood',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'describe the actual characteristic',
},
```

**Step 2: Replace "restricted" (line ~738)**

Replace single entry with:
```typescript
{
  term: 'restricted community',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Historically associated with racial covenants',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'remove or describe specific restriction type',
},
{
  term: 'restricted neighborhood',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Historically associated with racial covenants',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'remove or describe specific restriction type',
},
```

**Step 3: Replace "urban" (line ~746)**

Replace single entry with:
```typescript
{
  term: 'urban neighborhood',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Commonly understood racial code word when describing demographics',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'downtown location',
},
{
  term: 'urban area',
  category: 'race-color-national-origin',
  severity: 'soft',
  shortExplanation: 'Commonly understood racial code word when describing demographics',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'downtown location',
},
```

**Step 4: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: narrow overly broad single-word terms to specific phrases"
```

---

### Task 15: Remove religion proximity terms + "singles welcome"

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:846-876,1330-1336`

**Step 1: Remove 4 religion proximity entries**

Delete these entire entries:
- `near church` (lines ~846-852)
- `near synagogue` (lines ~854-860)
- `near mosque` (lines ~862-868)
- `near temple` (lines ~870-876)

**Step 2: Remove "singles welcome" (lines ~1330-1336)**

Delete the entire entry.

**Step 3: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: remove religion proximity terms and singles-welcome from cheat sheet"
```

---

### Task 16: Fix compound phrase severity

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:144,152`

**Step 1: Upgrade "prestigious, exclusive neighborhood" (line ~144)**

Change `severity: 'soft'` → `severity: 'hard'`

**Step 2: Upgrade "safe, low-crime area" (line ~152)**

Change `severity: 'soft'` → `severity: 'hard'`

**Step 3: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: upgrade compound phrase severities to match component terms"
```

---

## Phase 4: Add Missing Terms (Fixes 9-11)

---

### Task 17: Add missing terms from compliance docs

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts` (add entries to appropriate category arrays)

**Step 1: Add to creedTerms array**

```typescript
{
  term: 'traditional Montana values',
  category: 'creed',
  severity: 'hard',
  shortExplanation: 'Implies creed/worldview requirement for housing (conservative compliance interpretation)',
  law: 'MCA § 49-2-305 (creed)',
  suggestedAlternative: 'welcoming community',
},
{
  term: 'shared values community',
  category: 'creed',
  severity: 'soft',
  shortExplanation: 'Implies ideological conformity requirement',
  law: 'MCA § 49-2-305 (creed)',
  suggestedAlternative: 'active community',
},
{
  term: 'no political signs allowed',
  category: 'creed',
  severity: 'soft',
  shortExplanation: 'Restricting political expression may implicate creed protections',
  law: 'MCA § 49-2-305 (creed)',
  suggestedAlternative: 'remove from property advertising',
},
```

**Step 2: Add to raceColorNationalOriginTerms array**

```typescript
{
  term: 'American heritage community',
  category: 'race-color-national-origin',
  severity: 'hard',
  shortExplanation: 'Code for racial/ethnic exclusion',
  law: '42 U.S.C. § 3604(c)',
  suggestedAlternative: 'historic community',
},
```

**Step 3: Add to ageTerms array**

```typescript
{
  term: 'retired couples only',
  category: 'age',
  severity: 'hard',
  shortExplanation: 'Excludes non-retired and non-coupled applicants based on age and marital status',
  law: 'MCA § 49-2-305 (age)',
  suggestedAlternative: 'all welcome',
},
{
  term: 'must be 25 or older to apply',
  category: 'age',
  severity: 'hard',
  shortExplanation: 'Explicit age restriction in housing',
  law: 'MCA § 49-2-305 (age)',
  suggestedAlternative: 'remove age requirement',
},
{
  term: 'recently retired? this is your dream home',
  category: 'age',
  severity: 'soft',
  shortExplanation: 'Targets specific age demographic',
  law: 'MCA § 49-2-305 (age)',
  suggestedAlternative: 'peaceful retreat for all',
},
```

**Step 4: Add to sexGenderTerms array**

```typescript
{
  term: 'bachelor apartment for one',
  category: 'sex-gender',
  severity: 'hard',
  shortExplanation: 'Implies preference for unmarried men; discriminates on sex and marital status',
  law: 'MCA § 49-2-305 (sex, marital status)',
  suggestedAlternative: 'studio apartment',
},
```

**Step 5: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "feat: add missing terms from compliance docs audit"
```

---

### Task 18: Add pregnancy/maternity terms

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts` (sexGenderTerms array)

**Step 1: Add 3 pregnancy terms**

```typescript
{
  term: 'no pregnant women',
  category: 'sex-gender',
  severity: 'hard',
  shortExplanation: 'Montana expands sex protection to include pregnancy and maternity',
  law: 'MCA § 49-2-305 (sex/maternity)',
  suggestedAlternative: 'all welcome',
},
{
  term: 'not suitable during pregnancy',
  category: 'sex-gender',
  severity: 'hard',
  shortExplanation: 'Discriminatory exclusion based on pregnancy status',
  law: 'MCA § 49-2-305 (sex/maternity)',
  suggestedAlternative: 'remove from ad',
},
{
  term: 'expecting mothers only',
  category: 'sex-gender',
  severity: 'hard',
  shortExplanation: 'Restricts housing to specific pregnancy/parental status',
  law: 'MCA § 49-2-305 (sex/maternity)',
  suggestedAlternative: 'all welcome',
},
```

**Step 2: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "feat: add pregnancy/maternity terms for Montana sex protection"
```

---

## Phase 5: MLS Rules, Citations, Alternatives (Fixes 12-14)

---

### Task 19: Update MLS rules

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts:1809-1816`

**Step 1: Add new rules to rules array**

Add these entries to the existing rules array:
```typescript
'48-hour listing entry deadline for new listings and status changes (excludes weekends/holidays)',
'Clear Cooperation Policy: publicly marketed listings must be entered within 1 business day',
'Internet ads must include licensee identification on every viewable page or linked (ARM 24.210.430)',
'Material changes must be updated within 7 days (ARM 24.210.430)',
'Must display creation date and last-update date on web advertising (ARM 24.210.430)',
```

**Step 2: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "feat: add actual MRMLS rules and ARM 24.210.430 requirements"
```

---

### Task 20: Standardize law citations

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts` (all ~205 term entries)

**Step 1: Find and replace citation patterns**

Use these replacements across the file:
- `'Fair Housing Act §3604(c)'` → `'42 U.S.C. § 3604(c)'`
- `'Fair Housing Act §3604(a)'` → `'42 U.S.C. § 3604(a)'`
- `'Fair Housing Act §3604(f)'` → `'42 U.S.C. § 3604(f)'`
- `'Fair Housing Act, 42 U.S.C. §'` → `'42 U.S.C. §'`
- `'Montana Human Rights Act, MCA §49-2-305'` → `'MCA § 49-2-305'`
- `'Montana Human Rights Act, MCA §'` → `'MCA §'`
- Any remaining `'Fair Housing Act'` prefix references → standardize to `42 U.S.C. §` format
- NAR references → ensure all use `'NAR Code of Ethics Art. 10'`

**Important:** Do NOT blindly replace — review each match. Some entries already use the correct format.

**Step 2: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: standardize law citation format across all terms"
```

---

### Task 21: Improve auto-fix alternatives

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts`

**Step 1: Update 3 alternatives**

Find and update:
- `divorced` entry: `suggestedAlternative` → `'remove reference to marital status'`
- `predominantly` entries (from Task 14): alternatives already updated
- `restricted` entries (from Task 14): alternatives already updated

**Step 2: Commit**

```bash
git add src/lib/compliance/terms/montana.ts
git commit -m "fix: improve auto-fix alternatives for clarity"
```

---

## Phase 6: Polish (Fixes 15-17)

---

### Task 22: Add context notes + version field

**Files:**
- Modify: `src/lib/compliance/terms/montana.ts`

**Step 1: Update "waterfront" shortExplanation**

Find the `waterfront` entry and update `shortExplanation` to include: `"Only flag if property is not actually waterfront."`

**Step 2: Update "brand new" shortExplanation**

Find the `brand new` entry and update `shortExplanation` to include: `"Only flag if property is not actually new construction."`

**Step 3: Add maxDescriptionLength comment**

Add a comment above `maxDescriptionLength: 1000`:
```typescript
maxDescriptionLength: 1000, // Conservative default — verify against actual Montana MLS limits
```

**Step 4: Add version/lastUpdated to config export**

Add to the `montanaCompliance` export object:
```typescript
lastUpdated: '2026-02-15',
version: '2.0',
```

Note: This requires adding `lastUpdated` and `version` as optional fields to `MLSComplianceConfig` in `src/lib/types/compliance.ts`.

**Step 5: Commit**

```bash
git add src/lib/compliance/terms/montana.ts src/lib/types/compliance.ts
git commit -m "chore: add context notes, version tracking, description length comment"
```

---

### Task 23: Add ARM reference to human-rights-act.md

**Files:**
- Modify: `compliance-docs/state/montana/human-rights-act.md`

**Step 1: Add ARM 24.210.430 section**

Add a new section about internet advertising rules:
```markdown
### Internet Advertising Rules (ARM 24.210.430)

Montana Administrative Rules require:
- Licensee identification must appear on every viewable page of web advertising, or be accessible via a link
- Creation date and last-update date must be displayed on web advertisements
- Material changes to listings must be updated within 7 days
- All internet advertising must comply with Fair Housing Act requirements
```

**Step 2: Commit**

```bash
git add compliance-docs/state/montana/human-rights-act.md
git commit -m "docs: add ARM 24.210.430 internet advertising rules"
```

---

## Phase 7: Tests + Verification

---

### Task 24: Update agent tests for creed category

**Files:**
- Modify: `src/lib/compliance/agent.test.ts`

**Step 1: Add creed category test case**

Add a test that verifies the agent flags a creed violation:
```typescript
it('should flag creed violations for Montana', async () => {
  const result = await scanTextWithAgent(
    'Conservative neighborhood with like-minded neighbors',
    montanaCompliance
  );
  expect(result.violations.length).toBeGreaterThan(0);
  expect(result.violations.some(v => v.category === 'creed')).toBe(true);
});
```

**Step 2: Add test for removed terms (should NOT flag)**

```typescript
it('should not flag factual proximity statements', async () => {
  const result = await scanTextWithAgent(
    'Located near church and community center',
    montanaCompliance
  );
  const religionViolations = result.violations.filter(
    v => v.term === 'near church'
  );
  expect(religionViolations).toHaveLength(0);
});

it('should not flag inclusive language', async () => {
  const result = await scanTextWithAgent(
    'Singles welcome to apply',
    montanaCompliance
  );
  const maritalViolations = result.violations.filter(
    v => v.term === 'singles welcome'
  );
  expect(maritalViolations).toHaveLength(0);
});
```

**Step 3: Add pregnancy term test**

```typescript
it('should flag pregnancy discrimination', async () => {
  const result = await scanTextWithAgent(
    'No pregnant women allowed',
    montanaCompliance
  );
  expect(result.violations.some(v => v.term === 'no pregnant women')).toBe(true);
});
```

**Step 4: Run tests**

Run: `npx vitest run src/lib/compliance/agent.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/lib/compliance/agent.test.ts
git commit -m "test: add creed, pregnancy, and removed-term test cases"
```

---

### Task 25: Full build + type check verification

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit any fixups**

---

## Phase 8: QA Snapshot Re-validation

---

### Task 26: Invalidate and re-run QA snapshots

> This task requires a running Supabase instance and may need to be done manually via the admin UI.

**Step 1: Invalidate existing Montana snapshots**

Via Supabase SQL or admin UI, set `approved = false` on all existing `compliance_test_snapshots` for Montana test properties.

**Step 2: Re-run snapshot-mode test**

Use the admin compliance QA page → Runner tab → run in "snapshot" mode. Review results.

**Step 3: Re-run full-pipeline test**

Run in "full-pipeline" mode. Review results for:
- Creed category appears correctly (not political-beliefs)
- "near church" is NOT flagged
- "singles welcome" is NOT flagged
- "no section 8" flags once (not twice)
- Pregnancy terms are flagged

**Step 4: Update test corpus**

Add test properties that exercise the new/changed terms via the Corpus tab.

**Step 5: Approve new baselines**

Review and approve new snapshots for ongoing regression testing.

---

## File Change Summary

| # | File | Phase | Changes |
|---|------|-------|---------|
| 1 | `src/lib/types/compliance.ts` | 1, 6 | `political-beliefs` → `creed`, add optional version fields |
| 2 | `src/lib/compliance/agent.ts` | 1 | Update prompt schema category enum |
| 3 | `src/lib/ai/prompt.ts` | 1 | Update categoryLabels |
| 4 | `src/lib/settings/defaults.ts` | 1 | Update default categories |
| 5 | `src/components/admin/compliance-settings-form.tsx` | 1 | Update CATEGORIES |
| 6 | `src/components/campaign/violation-details.tsx` | 1 | Update colors + labels |
| 7 | `src/lib/compliance/terms/montana.ts` | 1-6 | Terms, severities, citations, MLS rules, version |
| 8 | `compliance-docs/state/montana/creed.md` | 1 | Renamed + disclaimer added |
| 9 | `compliance-docs/state/montana/human-rights-act.md` | 2, 6 | Penalties, protected classes, ARM ref |
| 10 | `compliance-docs/state/montana/age-protections.md` | 2 | Fix penalties |
| 11 | `compliance-docs/state/montana/marital-status.md` | 2 | Fix penalties |
| 12 | `compliance-docs/MASTER-TERM-LIST.md` | 1 | Category rename, path update |
| 13 | `src/lib/compliance/agent.test.ts` | 7 | New test cases |

**Total: 13 files modified/renamed, 0 files created**
**26 tasks across 8 phases**
