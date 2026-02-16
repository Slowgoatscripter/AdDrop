# Montana Compliance Fixes — Audit Findings & Implementation Plan

**Status:** Audit Complete | Updated for AI Agent Architecture | Ready for Implementation
**Date:** 2026-02-15 (updated)
**Team:** 3 agents (1 researcher, 1 auditor, 1 devil's advocate)
**Decision:** Compromise approach — Option A severity with transparency notes

---

## Architecture Context

> **Important:** This plan was originally written against a regex-based compliance system. The codebase has since migrated to an **AI agent-based compliance check** (GPT-5.2 via `src/lib/compliance/agent.ts`). This updated plan reflects that architecture.

### How compliance works now:
1. **Term configs** (e.g., `src/lib/compliance/terms/montana.ts`) define ~1,789 prohibited terms with categories, severities, citations, and alternatives
2. These terms are injected as a **cheat sheet** into the AI agent's prompt via `src/lib/ai/prompt.ts`
3. **Compliance docs** (`compliance-docs/`) are loaded and injected as legal "textbook" context
4. The AI agent (`agent.ts`) performs contextual analysis — it understands intent, not just string matching
5. The agent distinguishes context (e.g., "family room" = OK, "perfect for families" = violation)
6. A **QA snapshot system** provides regression testing via approved text snapshots

### What this means for these fixes:
- **Term changes still matter** — they directly shape what the AI agent flags via the cheat sheet
- **False positive concerns shift** — the AI handles context better than regex, but misleading cheat sheet entries still bias the agent toward false flags
- **Duplicate/inconsistent terms confuse the agent** — contradictory severities for the same phrase create ambiguous instructions
- **Citation accuracy matters more** — the AI uses citations in its violation explanations, so wrong citations propagate to users
- **After changes, QA snapshots need re-validation** — existing approved snapshots may produce different results

---

## Executive Summary

A 3-agent audit team reviewed the existing Montana compliance implementation against actual Montana law. The audit uncovered **6 critical/significant issues** including misnamed categories, misattributed penalties, duplicate terms, and cheat sheet quality issues. All 3 agents reached consensus on fixes.

---

## CRITICAL FIXES

### Fix 1: Rename `political-beliefs` to `creed` + Reclassify Terms

**The problem:** MCA 49-2-305 protects "creed" in housing — NOT "political beliefs." The legislature specifically included "political ideas" in employment (49-2-303) and government services (49-2-308) but NOT in housing. Our system uses the wrong category name and over-claims the statute.

**AI agent impact:** The agent receives "Political Beliefs" as a category label in its prompt. This misinforms the agent about what Montana law actually protects, potentially causing it to cite non-existent housing protections in its violation explanations.

**The fix:**

**Type system:**
- `src/lib/types/compliance.ts`: `'political-beliefs'` → `'creed'`

**Montana config (`src/lib/compliance/terms/montana.ts`):**
- Rename `politicalBeliefsTerms` → `creedTerms`
- Update all `category: 'political-beliefs'` → `category: 'creed'`
- Reclassify and re-cite all 14 terms as follows:

**5 terms — KEEP as hard under `creed` (with transparency note):**
| Term | Severity | Citation | Note |
|------|----------|----------|------|
| conservative neighborhood | hard | MCA § 49-2-305 (creed) | Add: "Creed coverage of political worldview language is a conservative compliance interpretation" |
| liberal community | hard | MCA § 49-2-305 (creed) | Same note |
| like-minded neighbors | hard | MCA § 49-2-305 (creed) | Same note |
| faith-and-flag community | hard | MCA § 49-2-305 (creed) | Same note |
| eco-conscious residents only | hard | MCA § 49-2-305 (creed) | Same note |

**6 terms — DOWNGRADE to soft under `creed`:**
| Term | Severity | Citation |
|------|----------|----------|
| blue state values | soft | MCA § 49-2-305 (creed) |
| red state living | soft | MCA § 49-2-305 (creed) |
| red state values | soft | MCA § 49-2-305 (creed) |
| blue state haven | soft | MCA § 49-2-305 (creed) |
| patriotic community | soft | MCA § 49-2-305 (creed) |
| freedom-loving homesteaders | soft | MCA § 49-2-305 (creed) |

**3 terms — MOVE to `steering` category, soft, cite federal law:**
| Term | Severity | Citation |
|------|----------|----------|
| trump country | soft | 42 U.S.C. § 3604(c) (steering proxy); NAR Code of Ethics Art. 10 |
| trump supporters welcome | soft | 42 U.S.C. § 3604(c) (steering proxy); NAR Code of Ethics Art. 10 |
| maga community | soft | 42 U.S.C. § 3604(c) (steering proxy); NAR Code of Ethics Art. 10 |

**UI labels (all locations):**
- `src/components/admin/compliance-settings-form.tsx`: `{ key: 'political-beliefs', label: 'Political Beliefs' }` → `{ key: 'creed', label: 'Creed (includes political beliefs)' }`
- `src/lib/ai/prompt.ts` categoryLabels: `'political-beliefs': 'Political Beliefs'` → `'creed': 'Creed'`
- `src/lib/settings/defaults.ts`: `'political-beliefs'` → `'creed'` in default categories array
- `src/components/campaign/violation-details.tsx`: Update categoryColors + categoryLabels for creed

**Docs:**
- Rename `compliance-docs/state/montana/political-beliefs.md` → `creed.md`
- Update `docPaths` in `terms/montana.ts` to reference new filename
- Add legal disclaimer to creed.md (see Doc Updates section below)
- Update `human-rights-act.md` protected class table to list "Creed" not "Political Beliefs"

---

### Fix 2: Remove Duplicate "no section 8"

**The problem:** "no section 8" appears in both `race-color-national-origin` (soft) AND `economic-exclusion` (hard). The AI agent receives contradictory instructions — the same phrase listed with two different severities under two different categories.

**AI agent impact:** When the agent encounters "no section 8" in ad text, the cheat sheet gives conflicting guidance. The agent may cite the wrong category/severity or flag it twice with different explanations.

**The fix:**
- DELETE the `economic-exclusion` entry
- KEEP the `race-color-national-origin` entry as **soft**
- Update citation to: `"42 U.S.C. § 3604(c) (disparate impact theory)"`
- Also downgrade "no vouchers" in `economic-exclusion` from hard → **soft**
- Remove all references to Montana source-of-income protections (Montana has none statewide)

---

### Fix 3: Fix Penalty Amounts in Compliance Docs

**The problem:** `human-rights-act.md` cites $10,000/$25,000/$50,000 penalties attributed to MCA § 49-2-510. These are actually the ORIGINAL 1988 federal FHA amounts, not Montana penalties. Montana Board of Realty Regulation penalties are discretionary up to $1,000/violation.

**AI agent impact:** The compliance docs are loaded as "textbook" context for the AI agent. Wrong penalty amounts in the textbook mean the agent may cite incorrect penalties in its violation explanations to users.

**The fix — update these files:**

`compliance-docs/state/montana/human-rights-act.md`:
- Replace misattributed amounts with:
  - **Montana state penalties:** Discretionary, up to $1,000/violation (Board of Realty Regulation)
  - **Federal FHA penalties (2025 adjusted):** $26,262 first offense, $65,654 with priors within 5 years, $131,308 with 2+ priors within 7 years
- Clearly label which penalties are state vs federal

`compliance-docs/state/montana/age-protections.md` — check for same penalty misattribution
`compliance-docs/state/montana/marital-status.md` — check for same penalty misattribution

---

### Fix 4: Fix Malformed Citation on "handicapped"

**The problem:** Citation reads `"Fair Housing Act §3604(c)(f)"` — invalid syntax combining two subsections.

**AI agent impact:** The agent will parrot this malformed citation in violation explanations shown to users, undermining credibility.

**The fix:** Change to `"42 U.S.C. § 3604(c); 42 U.S.C. § 3604(f)"`

---

## HIGH PRIORITY FIXES (Cheat Sheet Quality)

> **Note:** These were originally framed as "false positive prevention" for regex matching. With the AI agent, the concern shifts: the agent can understand context, but **misleading cheat sheet entries still bias the agent** toward flagging legitimate usage. Cleaning up the cheat sheet improves the agent's instruction quality.

### Fix 5: Narrow Overly Broad Single-Word Terms

These bare words in the cheat sheet may cause the AI agent to flag legitimate real estate descriptions, even though the agent can reason about context. Narrowing them provides clearer instructions.

| Term | Problem | Fix |
|------|---------|-----|
| `restricted` | Could bias agent to flag "deed restricted," "age-restricted," "restricted parking" | Change to phrase entries: "restricted community," "restricted neighborhood" |
| `urban` | Could bias agent to flag "urban lot," "urban loft," "urban infill" | Change to phrase entries: "urban neighborhood," "urban area" — OR remove entirely |
| `predominantly` | Could bias agent to flag "predominantly brick construction" | Change to phrase entries: "predominantly [demographic]" — OR remove entirely |

**Rationale for keeping fixes:** While the AI agent handles context better than regex, these bare terms in the cheat sheet are ambiguous instructions. Phrase-specific entries give the agent clearer guidance about what actually constitutes a violation.

### Fix 6: Remove Over-Aggressive Religion Proximity Terms

| Term | Problem | Fix |
|------|---------|-----|
| `near church` | Factual proximity statement, HUD-permitted | Remove from prohibited terms |
| `near synagogue` | Same | Remove |
| `near mosque` | Same | Remove |
| `near temple` | Same | Remove |

**Rationale:** HUD guidance permits factual proximity statements. Having these in the cheat sheet instructs the AI to treat them as violations, overriding the agent's ability to recognize them as legitimate landmark references. Broader religion/steering terms already catch actual discriminatory patterns.

### Fix 7: Remove "singles welcome"

**Problem:** This is inclusive language welcoming a protected class, not discriminatory. Its presence in the cheat sheet as a hard violation incorrectly instructs the AI to flag inclusive language.
**Fix:** Remove from prohibited terms entirely.

### Fix 8: Fix Compound Phrase Severity Inconsistency

| Compound Phrase | Current | Component | Fix |
|----------------|---------|-----------|-----|
| `prestigious, exclusive neighborhood` | soft | "exclusive" = hard | Upgrade to **hard** |
| `safe, low-crime area` | soft | "safe area" = hard | Upgrade to **hard** |

**AI agent impact:** The agent may see conflicting severity signals for overlapping phrases. Consistent severity prevents ambiguous instruction.

---

## GAPS TO FILL

### Fix 9: Add Missing Terms from Compliance Docs

These terms are cited as violations in our compliance docs (which the AI reads as textbook context) but have no corresponding cheat sheet entry. The agent may catch them contextually from the docs, but explicit cheat sheet entries ensure consistent flagging.

| Term | Category | Severity | Law |
|------|----------|----------|-----|
| Traditional Montana values | creed | hard | MCA § 49-2-305 (creed) — with transparency note |
| shared values community | creed | soft | MCA § 49-2-305 (creed) |
| American heritage community | race-color-national-origin | hard | 42 U.S.C. § 3604(c) |
| Retired couples only | age | hard | MCA § 49-2-305 (age) |
| Bachelor apartment for one | sex-gender + marital-status | hard | MCA § 49-2-305 (sex, marital status) |
| Must be 25 or older to apply | age | hard | MCA § 49-2-305 (age) |
| Recently retired? This is your dream home! | age | soft | MCA § 49-2-305 (age) |

### Fix 10: Add Pregnancy/Maternity Terms

Montana expands sex protection to include maternity and pregnancy. Add to `sex-gender`:

| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| no pregnant women | hard | MCA § 49-2-305 (sex/maternity) | all welcome |
| not suitable during pregnancy | hard | MCA § 49-2-305 (sex/maternity) | remove from ad |
| expecting mothers only | hard | MCA § 49-2-305 (sex/maternity) | all welcome |

### Fix 11: Add 3 New Creed-Specific Terms

| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| Traditional Montana values | hard | MCA § 49-2-305 (creed) | welcoming community |
| shared values community | soft | MCA § 49-2-305 (creed) | active community |
| no political signs allowed | soft | MCA § 49-2-305 (creed) | remove from property advertising |

---

## SIGNIFICANT FIXES

### Fix 12: Update MLS Rules to Reflect Actual MRMLS Requirements

**File:** `src/lib/compliance/terms/montana.ts` — rules array

Add to rules array:
- `'48-hour listing entry deadline for new listings and status changes (excludes weekends/holidays)'`
- `'Clear Cooperation Policy: publicly marketed listings must be entered within 1 business day'`
- `'Internet ads must include licensee identification on every viewable page or linked (ARM 24.210.430)'`
- `'Material changes must be updated within 7 days (ARM 24.210.430)'`
- `'Must display creation date and last-update date on web advertising (ARM 24.210.430)'`

### Fix 13: Standardize Law Citation Format

Standardize across all 205+ terms in `src/lib/compliance/terms/montana.ts`:
- Federal: `42 U.S.C. § 3604(c)` (not "Fair Housing Act §3604(c)")
- Montana: `MCA § 49-2-305` (not "Montana Human Rights Act, MCA §49-2-305")
- NAR: `NAR Code of Ethics Art. 10` (consistent abbreviation)

**AI agent impact:** The agent surfaces these citations verbatim in violation explanations. Consistent formatting improves professionalism and user trust.

### Fix 14: Improve Auto-Fix Alternatives

| Term | Current Alternative | Better Alternative |
|------|-------------------|-------------------|
| divorced | any buyer | remove reference to marital status |
| predominantly | established | describe the actual characteristic |
| restricted | gated | remove or describe specific restriction type |

**AI agent note:** The agent generates its own auto-fix suggestions contextually, but also references the `suggestedAlternative` from the cheat sheet. Better alternatives improve both paths.

---

## LOW PRIORITY / POLISH

### Fix 15: Add "waterfront" and "brand new" Context Note
These are only misleading when the property doesn't match. Update `shortExplanation` to: "Only flag if property is not actually [waterfront/new construction]."

**AI agent note:** The agent already reasons about context, but an explicit note in the cheat sheet reinforces correct behavior and prevents prompt drift.

### Fix 16: Verify maxDescriptionLength
Current: 1000. May not match actual Montana MLS limits. Add comment that this is a conservative default.

### Fix 17: Add Version/Last-Updated Field
Add `lastUpdated: '2026-02-15'` and `version: '2.0'` to montana config for audit tracking.

---

## Doc Updates

### `creed.md` (renamed from `political-beliefs.md`)

Add this disclaimer after the "What It Prohibits" heading:

> **Legal Note:** MCA § 49-2-305 protects "creed" in housing, which is broader than organized religion but does not explicitly name "political beliefs" or "political ideas" (those terms appear in employment law at MCA § 49-2-303). Montana courts have not definitively ruled on whether partisan political identity constitutes "creed" for housing purposes. This compliance module treats political speech in housing advertising as potentially covered under creed protections as a conservative compliance approach. Terms marked as "soft" reflect this legal uncertainty.

### `human-rights-act.md`

- Update protected class table: "Political Beliefs" → "Creed"
- Fix penalty section with correct state vs federal amounts
- Add ARM 24.210.430 reference for internet advertising rules

---

## Complete File Change Matrix

### Files to MODIFY (10)
| File | Changes |
|------|---------|
| `src/lib/types/compliance.ts` | Rename `political-beliefs` → `creed` in ViolationCategory union |
| `src/lib/compliance/terms/montana.ts` | Term reclassifications, severity changes, remove duplicate, add missing terms, update MLS rules, fix citations |
| `src/lib/ai/prompt.ts` | Update categoryLabels map (`political-beliefs` → `creed`) |
| `src/components/admin/compliance-settings-form.tsx` | Update CATEGORIES key + label |
| `src/components/campaign/violation-details.tsx` | Update categoryColors + categoryLabels for creed |
| `compliance-docs/state/montana/human-rights-act.md` | Fix penalties, protected class table, add ARM reference |
| `compliance-docs/state/montana/age-protections.md` | Fix penalty amounts if misattributed |
| `compliance-docs/state/montana/marital-status.md` | Fix penalty amounts if misattributed |
| `src/lib/compliance/agent.test.ts` | Update tests for creed rename, add test cases for new terms |
| `src/lib/settings/defaults.ts` | Update default categories array (`political-beliefs` → `creed`) |

### Files to RENAME (1)
| From | To |
|------|-----|
| `compliance-docs/state/montana/political-beliefs.md` | `compliance-docs/state/montana/creed.md` |

### Files to CREATE (0)
No new files needed.

**Total: 10 modified, 1 renamed = 11 file operations**

---

## Post-Implementation: QA Snapshot Re-validation

> **New section — required by AI agent architecture**

After all fixes are applied, the compliance QA system needs attention:

1. **Invalidate existing approved snapshots** — Term renames, severity changes, and removed terms will cause previously approved snapshots to produce different compliance results. Mark all existing Montana snapshots as `approved = false` pending re-review.

2. **Re-run snapshot-mode tests** — Execute a snapshot test run to see how the updated cheat sheet + docs change agent behavior on existing test properties.

3. **Re-run full-pipeline tests** — Execute a full-pipeline test run to verify the generation prompt (with updated cheat sheet) produces compliant campaigns.

4. **Update test corpus** — Add test properties specifically designed to exercise:
   - Creed category terms (renamed from political-beliefs)
   - The removed religion proximity terms (should NOT flag "near church" anymore)
   - "singles welcome" (should NOT flag anymore)
   - Pregnancy/maternity terms (new additions)
   - The "no section 8" deduplication (should only flag once, as soft)

5. **Re-approve snapshots** — After reviewing results, approve new baselines for ongoing regression testing.

**This step is non-negotiable.** The QA system exists specifically to catch behavioral changes from cheat sheet modifications.

---

## Priority Order

1. **Fix 1** — Creed rename + term reclassification (biggest impact, touches most files)
2. **Fix 2** — Remove duplicate "no section 8" (agent instruction conflict)
3. **Fix 3** — Fix penalty amounts in docs (agent textbook accuracy)
4. **Fix 4** — Fix malformed citation (agent output quality)
5. **Fix 5** — Narrow overly broad terms (cheat sheet clarity)
6. **Fix 6** — Remove religion proximity terms (cheat sheet cleanup)
7. **Fix 7** — Remove "singles welcome" (cheat sheet cleanup)
8. **Fix 8** — Fix compound severity inconsistency
9. **Fix 9-11** — Add missing terms to cheat sheet
10. **Fix 12** — Update MLS rules
11. **Fix 13** — Standardize citations
12. **Fix 14-17** — Polish items
13. **QA Re-validation** — Re-run tests, update corpus, re-approve snapshots

---

## Interaction with Ohio Plan

The Montana fixes affect the Ohio implementation plan in these ways:

1. **`political-beliefs` → `creed` rename** changes the ViolationCategory union. The Ohio plan already omits political-beliefs from Ohio config — it should now omit `creed` instead (Ohio does not protect creed separately from religion).

2. **Citation standardization** should be applied to Ohio terms from the start (use `42 U.S.C. § 3604(c)` format consistently).

3. **The 3 architecture bug fixes** (generate.ts, campaign-shell.tsx, docs.ts) from the Ohio plan should be done FIRST — they affect Montana too.

**Recommended implementation order:**
1. Architecture bug fixes (Ohio plan Phase 0) — benefits both states
2. Montana fixes (this plan) — corrects existing issues
3. Ohio config addition (Ohio plan Phases 1-5) — adds new state

---

## Bonus Finding (Future Audit)

Montana does NOT protect sexual orientation/gender identity at the state level. Some LGBTQ terms in the sex-gender category cite federal Executive Order 13988 (2021). The enforcement status of this EO may have shifted — worth revisiting in a future audit cycle.
