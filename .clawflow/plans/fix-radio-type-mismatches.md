# Plan: Fix RadioTimeSlot and RadioTone Component Type Mismatches

## Analysis Summary

**Current compiler state:** The three target files compile without errors under `strict: true`. However, they contain type safety gaps — verbose inline import casts and missing type imports — that will block the RadioAds UI implementation task. These are code-quality type mismatches, not compilation failures.

**Issues found:**

| File | Issue | Lines |
|------|-------|-------|
| `campaign-shell.tsx` | 6 inline `import('@/lib/types').RadioTimeSlot` / `.RadioTone` casts instead of proper top-level imports | 238, 239, 325, 327, 533, 534 |
| `pdf-document.tsx` | `RadioTone` not imported; `Object.entries` cast uses `string` instead of `RadioTone` | 10, 602 |
| `radioAds-card.tsx` | Already clean — properly imports and uses all Radio types | N/A |

**Root cause:** The Radio feature was built incrementally across multiple PRs. `campaign-shell.tsx` used inline import casts to avoid touching its import block. `pdf-document.tsx` omitted `RadioTone` because `Object.entries` made it technically unnecessary.

---

## Task 1 — Add `RadioTimeSlot` and `RadioTone` to `campaign-shell.tsx` imports

**File:** `src/components/campaign/campaign-shell.tsx`

**What:** Add `RadioTimeSlot` and `RadioTone` to the existing `@/lib/types` import on line 5.

**Current code (line 5):**
```typescript
import { CampaignKit } from '@/lib/types';
```

**New code (line 5):**
```typescript
import { CampaignKit, RadioTimeSlot, RadioTone } from '@/lib/types';
```

**Verify:** File saves, no red squiggles on the import line.

---

## Task 2 — Replace all 6 inline import casts in `campaign-shell.tsx`

**File:** `src/components/campaign/campaign-shell.tsx`

Replace each inline `import('@/lib/types').RadioTimeSlot` / `import('@/lib/types').RadioTone` with the now-imported type name. Six replacements total:

### 2a — Line 238 (inside `handleReplace` → `radioAds` replacer)
**Current:**
```typescript
            const slot = parts[1] as import('@/lib/types').RadioTimeSlot;
```
**New:**
```typescript
            const slot = parts[1] as RadioTimeSlot;
```

### 2b — Line 239
**Current:**
```typescript
            const tone = parts[2] as import('@/lib/types').RadioTone;
```
**New:**
```typescript
            const tone = parts[2] as RadioTone;
```

### 2c — Line 325 (inside `handleEditText` → Radio Ads block)
**Current:**
```typescript
        const slotData = updated.radioAds[slot as import('@/lib/types').RadioTimeSlot];
```
**New:**
```typescript
        const slotData = updated.radioAds[slot as RadioTimeSlot];
```

### 2d — Line 327
**Current:**
```typescript
          const toneData = slotData[tone as import('@/lib/types').RadioTone];
```
**New:**
```typescript
          const toneData = slotData[tone as RadioTone];
```

### 2e — Line 533 (inside `handleApplySuggestion` → Radio Ads block)
**Current:**
```typescript
          const slot = parts[1] as import('@/lib/types').RadioTimeSlot;
```
**New:**
```typescript
          const slot = parts[1] as RadioTimeSlot;
```

### 2f — Line 534
**Current:**
```typescript
          const tone = parts[2] as import('@/lib/types').RadioTone;
```
**New:**
```typescript
          const tone = parts[2] as RadioTone;
```

**Verify:** After all 6 replacements, run:
```bash
grep "import('@/lib/types')" src/components/campaign/campaign-shell.tsx
```
**Expected output:** No matches (empty output).

---

## Task 3 — Add `RadioTone` to `pdf-document.tsx` import

**File:** `src/lib/export/pdf-document.tsx`

**What:** Add `RadioTone` to the existing import on line 10.

**Current code (line 10):**
```typescript
import { CampaignKit, PrintAd, RadioTimeSlot, RadioScript } from '@/lib/types';
```

**New code (line 10):**
```typescript
import { CampaignKit, PrintAd, RadioTimeSlot, RadioTone, RadioScript } from '@/lib/types';
```

---

## Task 4 — Update `Object.entries` cast in `pdf-document.tsx` to use `RadioTone`

**File:** `src/lib/export/pdf-document.tsx`

**What:** Replace the `[string, RadioScript][]` cast with `[RadioTone, RadioScript][]` on line 602.

**Current code (line 602):**
```typescript
                  Object.entries(campaign.radioAds![slot]) as [string, RadioScript][]
```

**New code (line 602):**
```typescript
                  Object.entries(campaign.radioAds![slot]) as [RadioTone, RadioScript][]
```

**Verify:** The `tone` variable in the `.map(([tone, script])` destructure will now be typed as `RadioTone` instead of `string`.

---

## Task 5 — Confirm `radioAds-card.tsx` requires no changes

**File:** `src/components/campaign/radioAds-card.tsx`

**What:** No changes needed. The file already:
- Properly imports `RadioTimeSlot`, `RadioTone`, `RadioScript` from `@/lib/types` (lines 12–14)
- Uses correct types for state: `useState<RadioTimeSlot>`, `useState<RadioTone>` (lines 90, 93)
- Uses correct types for `Object.keys` casts (lines 89, 92, 98)
- Correctly casts ToneSwitcher callback: `t as RadioTone` (line 131)

The `ToneSwitcher` component accepts `string[]` / `string` which is compatible with `RadioTone[]` / `RadioTone` since `RadioTone` is a string literal union type. The cast-back on callback is the standard TypeScript pattern for this.

**Action:** Read-only verification. No edits.

---

## Task 6 — Run TypeScript compiler to verify clean compilation

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep -E "radioAds-card|campaign-shell|pdf-document"
```

**Expected output:** Empty (no errors in the three target files).

**Full build check:**
```bash
npx tsc --noEmit 2>&1
```

**Expected output:** Only the pre-existing unrelated errors in `src/app/api/export/bundle/__tests__/route.test.ts` (TS7022/TS7024). No new errors introduced.

---

## Task 7 — Run existing tests for affected components

**Commands:**
```bash
npx jest --testPathPattern="radioAds-card" --no-coverage 2>&1
npx jest --testPathPattern="pdf-document" --no-coverage 2>&1
```

**Expected output:** All tests pass. No runtime behavior changed — these are type-only alignment edits.

---

## Task 8 — Commit

**Commit message:**
```
fix(types): replace inline RadioTimeSlot/RadioTone import casts with proper imports

- campaign-shell.tsx: add RadioTimeSlot, RadioTone to top-level import,
  replace 6 inline import('@/lib/types') casts
- pdf-document.tsx: add RadioTone to import, update Object.entries cast
  from [string, RadioScript] to [RadioTone, RadioScript]
- radioAds-card.tsx: no changes needed (already clean)

Type alignment only — no runtime behavior changes.
```

---

## Files Modified

| File | Change Type | Description |
|------|------------|-------------|
| `src/components/campaign/campaign-shell.tsx` | Modify | Add 2 type imports, replace 6 inline casts |
| `src/lib/export/pdf-document.tsx` | Modify | Add 1 type import, update 1 Object.entries cast |
| `src/components/campaign/radioAds-card.tsx` | None | Already clean |

## Risks

- **Zero risk**: All changes are type-annotation-only. No runtime code changes. The inline import casts and the replacement imports resolve to the same types.
- The only existing tsc errors (`route.test.ts` TS7022/TS7024) are unrelated and pre-existing — this plan does not touch them.
