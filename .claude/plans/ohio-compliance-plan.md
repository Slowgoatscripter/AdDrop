# Ohio Real Estate Advertising Compliance -- Implementation Plan

**Status:** Research & Planning Complete | Ready for Implementation
**Date:** 2026-02-15
**Team:** 5 agents (2 researchers, 2 planners, 1 devil's advocate)

---

## Executive Summary

Ohio real estate advertising is governed by **ORC Chapter 4735** and **Ohio Administrative Code 1301:5-1**, enforced by the **Ohio Division of Real Estate and Professional Licensing**. Ohio's civil rights statute **ORC Chapter 4112** provides fair housing protections beyond federal law, adding **military status** and **ancestry** as protected classes.

### Key Differences from Montana

| Area | Montana | Ohio |
|------|---------|------|
| Governing law | MCA §49-2-305 | ORC §4735 + ORC §4112 |
| Enforcement | MT Human Rights Bureau | Ohio Division of RE + Ohio Civil Rights Commission |
| License # display | Recommended | **Mandatory** in all advertising (ORC §4735.16) |
| Brokerage name | Required | **Required** -- registered name, equal prominence (ORC §4735.16) |
| Team advertising | Not specifically regulated | Equal or greater prominence for brokerage (OAC 1301:5-1-02) |
| State protected classes | Age, marital status, political beliefs | **Military/veteran status, ancestry** (ORC §4112.02) |
| Political beliefs | Protected | **NOT protected** -- omit from Ohio config |
| Digital ad rules | General | Specific internet rules (OAC 1301:5-1-02(G)) |
| Penalties | Varies | $200/violation, $2,500 max/citation, 3 in 12 months = discipline |

---

## PHASE 0: Critical Pre-Requisite Bug Fixes

These 3 bugs must be fixed BEFORE Ohio config work. They affect multi-state compliance architecture.

### Bug A: Server-Side Compliance Hardcoded to Montana
- **File:** `src/lib/ai/generate.ts` line 90
- **Issue:** `getDefaultCompliance()` always returns Montana. Post-generation compliance scan ignores user's selected state.
- **Fix:** Replace with `(await getComplianceSettings()).config`

### Bug B: Client-Side Compliance Hardcoded to Montana
- **File:** `src/components/campaign/campaign-shell.tsx` lines 61, 74
- **Issue:** Fix All / Replace always use Montana rules for re-checking.
- **Fix:** Add `stateCode?: string` to `CampaignKit` type, populate during generation, use `getComplianceConfig(campaign.stateCode ?? 'MT')` client-side.
- **Files touched:** `src/lib/types/campaign.ts`, `src/lib/ai/generate.ts`, `src/components/campaign/campaign-shell.tsx`

### Bug C: Compliance Docs Path Traversal
- **File:** `src/lib/compliance/docs.ts` line 29
- **Issue:** Security check uses `'docs'` but files are in `'compliance-docs'`. ALL docs silently fail to load for ALL states.
- **Fix:** Change `'docs'` to `'compliance-docs'`

---

## PHASE 1: Type System Changes

### Task 1: Add `military-status` to ViolationCategory
- **File:** `src/lib/types/compliance.ts` line 12
- Add `| 'military-status'` to the union type
- **Note:** Ancestry maps into existing `race-color-national-origin` (consensus decision)

### Task 2: Update all exhaustive category maps (3 locations)
- **`src/lib/ai/prompt.ts`** line 83-95: Add `'military-status': 'Military / Veteran Status'` to `categoryLabels` (exhaustive `Record<ViolationCategory, string>` -- will TypeScript-error without it)
- **`src/components/campaign/violation-details.tsx`** lines 14-26: Add `'military-status': 'bg-emerald-100 text-emerald-800'` to `categoryColors`
- **`src/components/campaign/violation-details.tsx`** lines 28-40: Add `'military-status': 'Military / Veteran Status'` to `categoryLabels`

---

## PHASE 2: Ohio Configuration

### Task 3: Add military-status to admin CATEGORIES
- **File:** `src/components/admin/compliance-settings-form.tsx` lines 7-19
- Add `{ key: 'military-status', label: 'Military / Veteran Status' }`

### Task 4: Update settings defaults
- **File:** `src/lib/settings/defaults.ts` lines 12-16
- Add `'military-status'` to `compliance.categories` array

### Task 5: Create `src/lib/compliance/ohio.ts` (NEW FILE, ~1800 lines)
- Mirror `montana.ts` structure
- `state: 'Ohio'`, `mlsName: 'Ohio MLS (multi-board)'`, `maxDescriptionLength: 1500`
- **Include categories:** steering, familial-status, disability, race-color-national-origin (+ ancestry terms), religion, sex-gender, economic-exclusion, misleading-claims, military-status
- **Omit:** age, marital-status, political-beliefs (Montana-only)
- All terms must use Ohio/federal law citations (NOT Montana MCA references)
- ~196 total prohibited terms

### Task 6: Register Ohio in engine
- **File:** `src/lib/compliance/engine.ts` lines 8-12
- Import `ohioCompliance`, add `OH: ohioCompliance` to `complianceConfigs`

### Task 7: Add Ohio to state dropdown
- **File:** `src/components/admin/compliance-settings-form.tsx` lines 109-112
- Add `<option value="OH">Ohio</option>`
- Update help text from "More states coming soon" to "Select the state where your brokerage operates"

---

## PHASE 3: Compliance Documentation (can parallelize with Phase 2)

### Task 8: Create `compliance-docs/state/ohio/` (4 files)

1. **`ohio-revised-code-4735.md`** (~200 lines) -- ORC §4735.16 advertising requirements, ORC §4735.18 prohibited practices, OAC 1301:5-1-02 advertising rules, internet/digital advertising
2. **`ohio-civil-rights-4112.md`** (~150 lines) -- ORC §4112.02(H) housing discrimination, 9 protected classes, Ohio Civil Rights Commission enforcement
3. **`ohio-military-status.md`** (~100 lines) -- Military status definition and scope, prohibited language, VASH voucher interaction
4. **`ohio-team-advertising.md`** (~80 lines) -- OAC 1301:5-1-21 team rules, prominence requirements, compliant vs non-compliant examples

---

## PHASE 4: Testing

### Task 9: Ohio compliance unit tests
- **File:** `src/lib/compliance/compliance.test.ts`
- `getComplianceConfig('OH')` returns non-null
- Case insensitive (`'oh'` works)
- Config has correct state, mlsName, rules, disclosures
- Includes military-status terms, does NOT include political-beliefs
- `findViolations()` detects military-status terms
- `autoFixText()` replaces Ohio violations correctly
- All Montana tests still pass (regression)
- `tsc --noEmit` passes

### Task 10: Ohio prompt tests
- **File:** `src/lib/ai/__tests__/prompt.test.ts`
- AI prompt includes Ohio rules when state is OH
- Cheat sheet includes military-status terms

---

## PHASE 5: Polish

### Task 11: Update FAQ text
- **File:** `src/lib/settings/defaults.ts` line 33
- Change "Montana MLS requirements, with more states coming soon" to mention Ohio

### Task 12 (Optional): Ohio property presets
- Add Columbus suburban, Cleveland lakefront, Cincinnati historic presets

---

## Ohio-Specific Prohibited Terms

### Military / Veteran Status (NEW Category -- ORC §4112.02)

**Hard violations:**
| Term | Law | Alternative |
|------|-----|-------------|
| no veterans | ORC §4112.02(H) | all applicants welcome |
| no military | ORC §4112.02(H) | all welcome |
| civilian tenants only | ORC §4112.02(H) | remove entirely |
| no active duty | ORC §4112.02(H) | all applicants welcome |
| military not welcome | ORC §4112.02(H) | remove entirely |
| no National Guard | ORC §4112.02(H) | all applicants welcome |
| no reservists | ORC §4112.02(H) | all applicants welcome |
| perfect for military families | ORC §4112.02(H) | spacious home |
| civilian tenants preferred | ORC §4112.02(H) | remove entirely |
| no deployments | ORC §4112.02(H) | remove entirely |
| non-military preferred | ORC §4112.02(H) | remove entirely |
| military families not preferred | ORC §4112.02(H) | remove entirely |
| no military housing allowance | ORC §4112.02(H) | income verification required |

**Soft warnings:**
| Term | Law | Alternative |
|------|-----|-------------|
| military housing | ORC §4112.02(H) | describe property features |
| near military base | ORC §4112.02(H) | use actual base name |
| veteran community | ORC §4112.02(H) | established community |
| military community | ORC §4112.02(H) | describe location features |
| military town | ORC §4112.02(H) | name the city/area |
| veteran housing | ORC §4112.02(H) | describe property features |
| military discount | ORC §4112.02(H) | describe actual pricing |
| veteran-friendly | ORC §4112.02(H) | all welcome |

### Ancestry Terms (Under race-color-national-origin -- ORC §4112.02)

**Hard violations:**
| Term | Law | Alternative |
|------|-----|-------------|
| Appalachian area | ORC §4112.02(H)(7) | neighborhood |
| no Appalachians | ORC §4112.02(H)(7) | remove entirely |
| hillbilly neighborhood | ORC §4112.02(H)(7) | remove entirely |
| old-country charm | ORC §4112.02(H)(7) | charming character |
| heritage community | ORC §4112.02(H)(7) | established community |

**Soft warnings:**
| Term | Law | Alternative |
|------|-----|-------------|
| Appalachian | ORC §4112.02(H)(7) | describe property features |
| ethnic heritage neighborhood | ORC §4112.02(H)(7) | neighborhood |

### Ohio Steering Additions
| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| board approval | hard | ORC §4112.02(H)(7) | HOA review process |
| membership approval | hard | ORC §4112.02(H)(7) | application process |
| board approval required | hard | ORC §4112.02(H)(7) | HOA review process |
| private | soft | ORC §4112.02(H)(7) | gated |

### Ohio Misleading Claims Additions
| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| guaranteed sale | hard | ORC §4735.18 | marketing services included |
| we guarantee | hard | ORC §4735.18 | we are committed to |
| guaranteed closing | hard | ORC §4735.18 | smooth transaction process |
| no commission | hard | ORC §4735.18 | disclose actual fee structure |
| free home evaluation | soft | ORC §1345 | complimentary market analysis |

### NAR Settlement Terms (nationwide, Ohio-enforced)
| Term | Severity | Law | Alternative |
|------|----------|-----|-------------|
| free buyer representation | hard | NAR Settlement 2024 | buyer representation available |
| no cost to buyer | hard | NAR Settlement 2024 | buyer consultation available |
| buyer pays nothing | hard | NAR Settlement 2024 | contact agent for details |
| our services are free | hard | NAR Settlement 2024 | contact agent for details |

---

## Complete File Change Matrix

### NEW Files (5)
| File | Est. Lines |
|------|-----------|
| `src/lib/compliance/ohio.ts` | ~1800 |
| `compliance-docs/state/ohio/ohio-revised-code-4735.md` | ~200 |
| `compliance-docs/state/ohio/ohio-civil-rights-4112.md` | ~150 |
| `compliance-docs/state/ohio/ohio-military-status.md` | ~100 |
| `compliance-docs/state/ohio/ohio-team-advertising.md` | ~80 |

### MODIFIED Files (12)
| File | Change |
|------|--------|
| `src/lib/compliance/docs.ts` | Bug fix: `'docs'` -> `'compliance-docs'` |
| `src/lib/ai/generate.ts` | Bug fix: use settings-based config |
| `src/lib/types/campaign.ts` | Add `stateCode?: string` to CampaignKit |
| `src/components/campaign/campaign-shell.tsx` | Bug fix: use campaign stateCode |
| `src/lib/types/compliance.ts` | Add `'military-status'` to ViolationCategory |
| `src/lib/ai/prompt.ts` | Add military-status to categoryLabels |
| `src/components/campaign/violation-details.tsx` | Add military-status colors + labels |
| `src/lib/compliance/engine.ts` | Import ohio, add to registry |
| `src/components/admin/compliance-settings-form.tsx` | Add category + state option |
| `src/lib/settings/defaults.ts` | Add category default + FAQ |
| `src/lib/compliance/compliance.test.ts` | Add Ohio tests |
| `src/lib/ai/__tests__/prompt.test.ts` | Add Ohio prompt test |

**Total: 5 new + 12 modified = 17 files**

---

## Edge Cases and Gotchas

1. **docs.ts bug (BLOCKER):** All compliance docs silently fail to load for ALL states
2. **generate.ts hardcoded Montana (BLOCKER):** Post-gen scan always uses Montana
3. **campaign-shell.tsx hardcoded Montana (BLOCKER):** Client-side fix/replace uses Montana
4. **Exhaustive Record in prompt.ts:** Will TypeScript-error if military-status not added to categoryLabels
5. **Political beliefs NOT in Ohio:** Must omit from Ohio config
6. **Montana law citations:** Ohio terms must use ORC/federal citations, NOT MCA
7. **Silent Montana fallback:** Settings falls back to Montana if state code not found
8. **Multiple Ohio MLS boards:** Use generic name for v1, per-MLS is future enhancement
9. **Source of income:** Soft warning statewide, hard in ~19 cities (Columbus, Toledo, etc.)
10. **Team name rules:** Licensing requirement, not ad content -- document only
11. **Equal prominence:** Visual rule, can't regex-enforce -- add to AI prompt + presence check
12. **14-day update rule:** Operational concern -- document in compliance docs
13. **NAR Settlement:** No buyer broker compensation on MLS, can't imply "free" services

---

## Dependency Graph

```
Phase 0 (bugs):  0A + 0B + 0C (can parallelize)
                      |
Phase 1 (types):  1 → 2
                      |
Phase 2 (config): 3 + 4 + 5 → 6 → 7
                              |
Phase 3 (docs):   8 (parallel with Phase 2)
                              |
Phase 4 (tests):  9 + 10
                              |
Phase 5 (polish): 11 + 12
```

---

## Scope Summary

- **New code:** ~1800 lines (ohio.ts) + ~530 lines (docs) + ~100 lines (tests)
- **Modified code:** ~50 lines across 12 files
- **Risk:** Low -- architecture designed for multi-state
- **Database migrations:** None
- **Breaking API changes:** None
- **Backward compatible:** Montana unchanged
