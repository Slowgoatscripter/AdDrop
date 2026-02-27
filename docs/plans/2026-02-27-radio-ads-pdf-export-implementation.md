# Radio Ads PDF Export — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Radio Ads" section to the campaign PDF export so radio scripts appear organized by time slot and tone when `campaign.radioAds` is present.

**Architecture:** Single conditional `<Page>` block added to `pdf-document.tsx` between the Magazine and Marketing Strategy sections. Iterates `campaign.radioAds` by time slot (outer) and tone (inner), rendering each script with its metadata and optional fields. Uses existing styles plus one new `metaText` style. Page auto-wraps via `@react-pdf/renderer` if content exceeds one page.

**Tech Stack:** React, `@react-pdf/renderer`, TypeScript, Jest + `@testing-library/react`

---

## Task 1: Add `metaText` style and `TIME_SLOT_LABELS` constant

**Files:**
- Modify: `src/lib/export/pdf-document.tsx:10` (import line)
- Modify: `src/lib/export/pdf-document.tsx:27-170` (styles block)
- Modify: `src/lib/export/pdf-document.tsx` (add constant after styles)

**Step 1: Update the import to include radio types**

In `src/lib/export/pdf-document.tsx`, change line 10 from:

```typescript
import { CampaignKit, PrintAd } from '@/lib/types';
```

to:

```typescript
import { CampaignKit, PrintAd, RadioTimeSlot, RadioScript } from '@/lib/types';
```

**Step 2: Add the `metaText` style**

In `src/lib/export/pdf-document.tsx`, inside `StyleSheet.create({...})`, add the following style **after the `hashtagBlock` style** (after line 169, before the closing `});` on line 170):

```typescript
  metaText: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 4,
  },
```

**Step 3: Add `RADIO_TIME_SLOT_LABELS` constant**

In `src/lib/export/pdf-document.tsx`, add the following constant **after the closing `});` of `StyleSheet.create`** (after the new line 174) and before the `/* Helpers */` comment block:

```typescript
const RADIO_TIME_SLOT_LABELS: Record<RadioTimeSlot, string> = {
  '15s': '15 Second',
  '30s': '30 Second',
  '60s': '60 Second',
};
```

**Step 4: Verify the file still compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`

Expected: No errors (clean exit), or only pre-existing warnings unrelated to `pdf-document.tsx`.

**Step 5: Commit**

```bash
git add src/lib/export/pdf-document.tsx
git commit -m "feat(pdf): add radio types import, metaText style, and time-slot labels"
```

---

## Task 2: Add the `RadioScriptBlock` helper component

**Files:**
- Modify: `src/lib/export/pdf-document.tsx` (add helper after `PrintAdBlock`, before the `/* Document */` section)

**Step 1: Add `RadioScriptBlock` helper**

In `src/lib/export/pdf-document.tsx`, add the following component **after `PrintAdBlock`** (after line 205) and **before the `/* Document */` comment** (line 207):

```tsx
function RadioScriptBlock({ tone, script }: { tone: string; script: RadioScript }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.toneLabel}>{tone}</Text>
      <Text style={styles.label}>Script</Text>
      <Text style={styles.body}>{script.script}</Text>
      <Text style={styles.metaText}>
        {script.wordCount} words · ~{script.estimatedDuration}
      </Text>
      {script.voiceStyle && (
        <View>
          <Text style={styles.label}>Voice Style</Text>
          <Text style={styles.body}>{script.voiceStyle}</Text>
        </View>
      )}
      {script.musicSuggestion && (
        <View>
          <Text style={styles.label}>Music Suggestion</Text>
          <Text style={styles.body}>{script.musicSuggestion}</Text>
        </View>
      )}
      {script.notes && (
        <View>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.body}>{script.notes}</Text>
        </View>
      )}
    </View>
  );
}
```

Note: Uses `<View>` wrappers instead of `<>` fragments for each optional field because `@react-pdf/renderer` has inconsistent fragment support.

**Step 2: Verify the file still compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`

Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/export/pdf-document.tsx
git commit -m "feat(pdf): add RadioScriptBlock helper component"
```

---

## Task 3: Add Radio Ads `<Page>` to the PDF document

**Files:**
- Modify: `src/lib/export/pdf-document.tsx` (insert JSX between Magazine section and Marketing Strategy section)

**Step 1: Insert the Radio Ads page block**

In `src/lib/export/pdf-document.tsx`, locate the closing of the Magazine section (after the current `</Page>` + `)}` for magazine, which is at line 539) and **before** the `{/* MARKETING STRATEGY */}` comment block (line 541).

Insert the following block between them:

```tsx
      {/* ============================================================ */}
      {/* RADIO ADS                                                     */}
      {/* ============================================================ */}
      {campaign.radioAds && Object.keys(campaign.radioAds).length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.pageTitle}>Radio Ads</Text>
          <Text style={styles.pageSubtitle}>
            Scripts by time slot &amp; tone
          </Text>
          <SectionDivider />

          {(['15s', '30s', '60s'] as RadioTimeSlot[])
            .filter((slot) => campaign.radioAds![slot])
            .map((slot, slotIdx, filteredSlots) => (
              <View key={slot} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {RADIO_TIME_SLOT_LABELS[slot]}
                </Text>
                {(
                  Object.entries(campaign.radioAds![slot]) as [string, RadioScript][]
                ).map(([tone, script]) => (
                  <RadioScriptBlock
                    key={tone}
                    tone={tone}
                    script={script}
                  />
                ))}
                {slotIdx < filteredSlots.length - 1 && <SectionDivider />}
              </View>
            ))}

          <Footer label="Radio Ads" />
        </Page>
      )}
```

Key design decisions in this block:
- Uses a **fixed order array** `['15s', '30s', '60s']` instead of `Object.entries` to guarantee deterministic slot ordering regardless of object key insertion order.
- Adds `Object.keys(campaign.radioAds).length > 0` guard to handle the empty-object edge case (no page rendered for `{}`).
- Uses `campaign.radioAds!` non-null assertion inside the conditional block where we've already confirmed it's truthy.
- Dividers appear between time slots but not after the last one.

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`

Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/export/pdf-document.tsx
git commit -m "feat(pdf): add Radio Ads page to campaign PDF export"
```

---

## Task 4: Write tests — Radio Ads section renders when data is present

**Files:**
- Create: `src/lib/export/__tests__/pdf-document.test.tsx`

**Step 1: Create the test file with a mock for `@react-pdf/renderer`**

Since `@react-pdf/renderer` components (`Document`, `Page`, `Text`, `View`, `Image`) are not standard DOM elements and don't render in jsdom, we need a mock that maps them to plain HTML elements so `@testing-library/react` can query the output.

Create `src/lib/export/__tests__/pdf-document.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RadioTimeSlot, RadioTone, RadioScript, CampaignKit } from '@/lib/types';

// --- Mock @react-pdf/renderer to render plain HTML elements ---
jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-page">{children}</div>,
  Text: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
  View: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  Image: ({ src }: { src: string }) => <img src={src} alt="" />,
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

// Must import AFTER jest.mock so the mock is in place
import { CampaignPdf } from '../pdf-document';

// --- Test data helpers ---

function makeScript(overrides: Partial<RadioScript> = {}): RadioScript {
  return {
    script: 'Default test script text.',
    wordCount: 5,
    estimatedDuration: '3 seconds',
    ...overrides,
  };
}

function makeRadioAds(
  overrides?: Partial<Record<RadioTimeSlot, Record<RadioTone, RadioScript>>>
): Record<RadioTimeSlot, Record<RadioTone, RadioScript>> {
  return {
    '15s': {
      conversational: makeScript({ script: '15s conversational script.' }),
      authoritative: makeScript({ script: '15s authoritative script.' }),
      friendly: makeScript({ script: '15s friendly script.' }),
    },
    '30s': {
      conversational: makeScript({
        script: '30s conversational script.',
        voiceStyle: 'Warm and inviting',
        musicSuggestion: 'Soft acoustic guitar',
        notes: 'Emphasize mountain views',
      }),
      authoritative: makeScript({ script: '30s authoritative script.' }),
      friendly: makeScript({ script: '30s friendly script.' }),
    },
    '60s': {
      conversational: makeScript({
        script: '60s conversational script.',
        voiceStyle: 'Deep and resonant',
        musicSuggestion: 'Upbeat country music',
        notes: 'Include call to action at end',
      }),
      authoritative: makeScript({ script: '60s authoritative script.' }),
      friendly: makeScript({ script: '60s friendly script.' }),
    },
    ...overrides,
  };
}

const baseCampaign: CampaignKit = {
  id: 'test-campaign-1',
  listing: {
    url: 'https://example.com',
    address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
    price: 450000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    propertyType: 'Single Family',
    features: ['Garage'],
    description: 'Nice home',
    photos: ['https://example.com/photo1.jpg'],
    listingAgent: 'Jane Smith',
  },
  createdAt: '2026-02-27T00:00:00Z',
  complianceResult: { passed: true, violations: [], platformResults: {} },
  hashtags: ['realestate'],
  callsToAction: ['Call now'],
  targetingNotes: 'Target Bozeman area',
  sellingPoints: ['Mountain views'],
} as unknown as CampaignKit;

// --- Tests ---

describe('CampaignPdf — Radio Ads section', () => {
  test('renders Radio Ads page title when campaign.radioAds is present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Radio Ads')).toBeInTheDocument();
  });

  test('does NOT render Radio Ads page when campaign.radioAds is undefined', () => {
    render(<CampaignPdf campaign={baseCampaign} />);
    expect(screen.queryByText('Radio Ads')).not.toBeInTheDocument();
  });

  test('does NOT render Radio Ads page when campaign.radioAds is empty object', () => {
    const campaign = { ...baseCampaign, radioAds: {} as any };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.queryByText('Radio Ads')).not.toBeInTheDocument();
  });

  test('renders all three time slot headers', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('15 Second')).toBeInTheDocument();
    expect(screen.getByText('30 Second')).toBeInTheDocument();
    expect(screen.getByText('60 Second')).toBeInTheDocument();
  });

  test('renders tone labels for each time slot', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    // Each tone appears 3 times (once per time slot)
    expect(screen.getAllByText('conversational')).toHaveLength(3);
    expect(screen.getAllByText('authoritative')).toHaveLength(3);
    expect(screen.getAllByText('friendly')).toHaveLength(3);
  });

  test('renders script text for each variation', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('15s conversational script.')).toBeInTheDocument();
    expect(screen.getByText('30s authoritative script.')).toBeInTheDocument();
    expect(screen.getByText('60s friendly script.')).toBeInTheDocument();
  });

  test('renders word count and estimated duration', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    // All scripts use default 5 words / ~3 seconds
    const metaTexts = screen.getAllByText('5 words · ~3 seconds');
    expect(metaTexts.length).toBe(9); // 3 slots × 3 tones
  });

  test('renders optional voiceStyle when present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Warm and inviting')).toBeInTheDocument();
    expect(screen.getByText('Deep and resonant')).toBeInTheDocument();
  });

  test('renders optional musicSuggestion when present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Soft acoustic guitar')).toBeInTheDocument();
    expect(screen.getByText('Upbeat country music')).toBeInTheDocument();
  });

  test('renders optional notes when present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Emphasize mountain views')).toBeInTheDocument();
    expect(screen.getByText('Include call to action at end')).toBeInTheDocument();
  });

  test('does NOT render Voice Style label when voiceStyle is absent', () => {
    // 15s scripts have no optional fields by default
    const campaign = {
      ...baseCampaign,
      radioAds: {
        '15s': {
          conversational: makeScript({ script: 'Only script' }),
        },
      } as any,
    };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.queryByText('Voice Style')).not.toBeInTheDocument();
    expect(screen.queryByText('Music Suggestion')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  test('renders only present time slots when some are missing', () => {
    const partialRadio = {
      '30s': {
        conversational: makeScript({ script: 'Only 30s script.' }),
      },
    } as any;
    const campaign = { ...baseCampaign, radioAds: partialRadio };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('30 Second')).toBeInTheDocument();
    expect(screen.queryByText('15 Second')).not.toBeInTheDocument();
    expect(screen.queryByText('60 Second')).not.toBeInTheDocument();
  });

  test('renders page subtitle', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Scripts by time slot & tone')).toBeInTheDocument();
  });
});
```

**Step 2: Run the tests and verify they fail (TDD red phase)**

Run: `npx jest src/lib/export/__tests__/pdf-document.test.tsx --verbose 2>&1 | tail -30`

Expected: If the Radio Ads `<Page>` block has not yet been added, the "renders Radio Ads page title" test should FAIL. If Tasks 1-3 are already done, all tests should PASS.

**Step 3: Commit the tests**

```bash
git add src/lib/export/__tests__/pdf-document.test.tsx
git commit -m "test(pdf): add radio ads PDF section tests"
```

---

## Task 5: Run the full test suite and fix any issues

**Files:**
- Possibly modify: `src/lib/export/pdf-document.tsx` (if issues found)
- Possibly modify: `src/lib/export/__tests__/pdf-document.test.tsx` (if mock needs adjusting)

**Step 1: Run the new tests in isolation**

Run: `npx jest src/lib/export/__tests__/pdf-document.test.tsx --verbose`

Expected: All 12 tests pass.

**Step 2: Run the full test suite to check for regressions**

Run: `npx jest --verbose 2>&1 | tail -40`

Expected: All existing tests still pass. No regressions.

**Step 3: Run TypeScript type checking**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`

Expected: No new errors.

**Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(pdf): address test/type issues from radio ads integration"
```

(Only if Step 1, 2, or 3 revealed issues that required fixes. Skip if everything passes cleanly.)

---

## Task 6: Final verification and cleanup commit

**Files:**
- No new files; verification only.

**Step 1: Visually verify the final state of `pdf-document.tsx`**

Read `src/lib/export/pdf-document.tsx` and confirm:
1. Line 10: Import includes `RadioTimeSlot, RadioScript`
2. Styles block: `metaText` style is present
3. After styles: `RADIO_TIME_SLOT_LABELS` constant exists
4. Helpers section: `RadioScriptBlock` component exists
5. Document JSX: Radio Ads `<Page>` block appears between Magazine and Marketing Strategy
6. The conditional guard is `campaign.radioAds && Object.keys(campaign.radioAds).length > 0`

**Step 2: Verify page order in the JSX**

Confirm this order in the `<Document>`:
1. Cover Page
2. Social Media
3. Paid Advertising
4. Online Listings
5. Postcard (conditional)
6. Magazine (conditional)
7. **Radio Ads (conditional)** ← new
8. Marketing Strategy

**Step 3: Run tests one final time**

Run: `npx jest --verbose 2>&1 | tail -20`

Expected: All tests pass, including the 12 new radio ads PDF tests.

---

## Summary of All Changes

| File | Action | What Changes |
|------|--------|-------------|
| `src/lib/export/pdf-document.tsx` | Modify | Add `RadioTimeSlot`, `RadioScript` imports; add `metaText` style; add `RADIO_TIME_SLOT_LABELS` constant; add `RadioScriptBlock` helper; add Radio Ads `<Page>` between Magazine and Marketing Strategy |
| `src/lib/export/__tests__/pdf-document.test.tsx` | Create | 12 tests covering: presence/absence of section, time slot labels, tone labels, script text, metadata, optional fields, partial data, empty object guard |

No other files need changes. `generate-pdf.tsx` and `bundle.ts` already pass the full `CampaignKit` through.

## Acceptance Criteria Mapping

| Criterion | How It's Met |
|-----------|-------------|
| Radio scripts appear when `campaign.radioAds` is present | Conditional `<Page>` renders when `campaign.radioAds` is truthy and non-empty |
| Each time slot clearly labeled | `sectionTitle` renders `RADIO_TIME_SLOT_LABELS[slot]` ("15 Second", "30 Second", "60 Second") |
| Each tone rendered with its script | Inner `Object.entries` loop renders `RadioScriptBlock` per tone with `toneLabel` styling |
| Optional fields included when present | `RadioScriptBlock` conditionally renders `voiceStyle`, `musicSuggestion`, `notes` |
| Section omitted when no radio ads | Guard: `campaign.radioAds && Object.keys(campaign.radioAds).length > 0` |
| Formatting consistent with other sections | Reuses existing `sectionTitle`, `toneLabel`, `label`, `body` styles; only adds `metaText` |
