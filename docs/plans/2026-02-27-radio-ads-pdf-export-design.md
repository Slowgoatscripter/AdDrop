# Radio Ads PDF Export Design

**Status:** Proposed
**Date:** 2026-02-27
**Scope:** Add radio ad scripts section to `src/lib/export/pdf-document.tsx`

---

## 1. Problem

The PDF export currently omits radio ad scripts entirely. Pro users who generate radio ads get 9 scripts (3 time slots × 3 tones), but when they export or share the campaign PDF, none of that content appears. This means radio content can't be included in client deliverables, printed for production teams, or shared via the existing share-link flow.

The fix is scoped to a single file: `pdf-document.tsx`. The `generate-pdf.tsx` wrapper and `bundle.ts` ZIP logic already pass the full `CampaignKit` through, so once the PDF component renders radio ads, they'll appear in both standalone PDF downloads and ZIP bundles automatically.

---

## 2. Codebase Context

### Current PDF Structure

| Page | Content | Conditional? |
|------|---------|-------------|
| Cover | Hero photo, address, price, stats, agent/broker | Always |
| Social Media | Instagram, Facebook, Twitter, Hashtags | Always (sections skip if missing) |
| Paid Ads | Google Ads, Meta Ad | Always (sections skip if missing) |
| Online Listings | Zillow, Realtor.com, Homes/Trulia, MLS | Always (sections skip if missing) |
| Postcard | Front/back by tone | Only if `campaign.postcard` exists |
| Magazine | Full-page and half-page by tone | Only if either exists |
| Marketing Strategy | Selling points, CTAs, targeting notes | Always |

### Patterns in the Existing PDF

1. **Conditional pages** — Postcard and Magazine pages are wrapped in `{campaign.X && (<Page>...</Page>)}`, so they're omitted entirely when data is absent.
2. **Tone iteration** — Instagram and Facebook iterate `Object.entries(campaign.instagram)` to render all tone variations within a section.
3. **Nested tone iteration** — Magazine uses `Object.entries(campaign.magazineFullPage)` where each entry is `[tone, PrintAd]`, rendered via the `PrintAdBlock` helper.
4. **Styles reuse** — All sections use the same style constants: `sectionTitle`, `subsectionTitle`, `toneLabel`, `label`, `body`, etc.
5. **Footer labeling** — Each page has a `<Footer label="..." />` for identification.

### Radio Ads Data Shape

```typescript
radioAds?: Record<RadioTimeSlot, Record<RadioTone, RadioScript>>;

type RadioTimeSlot = '15s' | '30s' | '60s';
type RadioTone = 'conversational' | 'authoritative' | 'friendly';

interface RadioScript {
  script: string;
  wordCount: number;
  estimatedDuration: string;
  notes?: string;
  voiceStyle?: string;
  musicSuggestion?: string;
}
```

Full structure: `campaign.radioAds['30s']['authoritative'].script`

---

## 3. Approaches

### Approach A: One Page Per Time Slot (3 conditional pages)

Give each time slot (15s, 30s, 60s) its own `<Page>`. Within each page, render all three tone variations as sections.

```
Page: Radio Ads — 15 Second
├── Section: Conversational → script + metadata
├── Section: Authoritative  → script + metadata
└── Section: Friendly       → script + metadata

Page: Radio Ads — 30 Second
├── Section: Conversational → script + metadata (+ notes, voiceStyle, musicSuggestion)
├── Section: Authoritative  → script + metadata
└── Section: Friendly       → script + metadata

Page: Radio Ads — 60 Second
└── (same pattern)
```

**Pros:**
- 60s scripts can be long — dedicated pages prevent overflow issues.
- Clear visual grouping. A production team receiving this PDF can flip to the "30 Second" page instantly.
- Mirrors the UI card's primary dimension (time slot tabs).

**Cons:**
- Adds up to 3 pages to the PDF, even when 15s scripts are short and would fit on a half page.
- Breaks the convention that print/audio categories get a single page (Magazine and Postcard each get one page, not one per variant).
- Iterating `Object.entries(campaign.radioAds)` to generate pages dynamically means the order depends on object key iteration order (which is insertion order in V8, but worth noting).

### Approach B: Single Page with Natural Overflow (Recommended)

One `<Page>` titled "Radio Ads" with time slots as `sectionTitle` headers and tones as `subsectionTitle` sub-headers within each. Let `@react-pdf/renderer`'s default `wrap` behavior handle page breaks when content exceeds a single page.

```
Page: Radio Ads
├── Section: 15 Second
│   ├── Conversational → script + metadata
│   ├── Authoritative  → script + metadata
│   └── Friendly       → script + metadata
├── Divider
├── Section: 30 Second
│   ├── Conversational → script + metadata (+ optional fields)
│   ├── Authoritative  → script + metadata
│   └── Friendly       → script + metadata
├── Divider
└── Section: 60 Second
    ├── Conversational → script + metadata (+ optional fields)
    ├── Authoritative  → script + metadata
    └── Friendly       → script + metadata
```

**Pros:**
- Consistent with existing patterns. Magazine puts both full-page and half-page on one page. Social Media puts 4 platforms on one page. One page per category is the norm.
- Short scripts (15s) don't waste a full page.
- `@react-pdf/renderer` wraps automatically, so long 60s scripts gracefully overflow to a second page without manual page-break logic.
- Footer stays "Radio Ads" on every page regardless of overflow.

**Cons:**
- If all 9 scripts are long (unlikely for 15s, possible for 60s), the section could span 2-3 pages. This is acceptable — it's the same behavior Magazine or Social Media would have if content were longer.
- Less visual separation between time slots compared to dedicated pages.

### Approach C: Grouped by Tone, Not Time Slot

Invert the hierarchy: group by tone first (Conversational, Authoritative, Friendly), with time slot variants nested within each tone.

```
Page: Radio Ads
├── Section: Conversational
│   ├── 15s → script
│   ├── 30s → script + optional fields
│   └── 60s → script + optional fields
├── Section: Authoritative
│   └── ...
└── Section: Friendly
    └── ...
```

**Pros:**
- Makes it easy to compare how the same tone sounds across different durations.
- Could be useful if a client has already chosen a tone and wants to see all duration options.

**Cons:**
- Contradicts the UI card's primary dimension (time slot is the primary selector, tone is secondary).
- Contradicts how radio ads are typically briefed — production teams think "I need a 30-second spot" first, then pick a tone.
- Inconsistent with the rest of the PDF where tone is always the inner grouping (Instagram groups by tone within platform, not the other way around).

---

## 4. Recommendation: Approach B (Single Page with Natural Overflow)

Approach B is the clear winner:

1. **Follows existing convention.** Every other content category in the PDF is a single page (with automatic overflow). Radio ads should be no different.
2. **No wasted space.** 15-second scripts are typically 30-40 words. Giving them a full page would look empty.
3. **Automatic overflow is free.** `@react-pdf/renderer` handles this natively with no extra code.
4. **Consistent hierarchy.** Time slot → Tone matches both the UI card's tab → pill structure and how the industry thinks about radio ads.
5. **Minimal code.** One conditional `<Page>` block with nested iteration. No page-break heuristics.

---

## 5. Detailed Design

### 5a. Page Structure

```tsx
{campaign.radioAds && (
  <Page size="LETTER" style={styles.page}>
    <Text style={styles.pageTitle}>Radio Ads</Text>
    <Text style={styles.pageSubtitle}>
      Scripts by time slot &amp; tone
    </Text>
    <SectionDivider />

    {(Object.entries(campaign.radioAds) as [string, Record<string, RadioScript>][]).map(
      ([slot, tones], slotIdx) => (
        <View key={slot} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {TIME_SLOT_LABELS[slot as RadioTimeSlot]}
          </Text>

          {(Object.entries(tones) as [string, RadioScript][]).map(([tone, script]) => (
            <View key={tone} style={{ marginBottom: 8 }}>
              <Text style={styles.toneLabel}>{tone}</Text>

              <Text style={styles.label}>Script</Text>
              <Text style={styles.body}>{script.script}</Text>

              {/* Metadata line: word count + duration */}
              <Text style={styles.metaText}>
                {script.wordCount} words · ~{script.estimatedDuration}
              </Text>

              {/* Optional fields — only when present */}
              {script.voiceStyle && (
                <>
                  <Text style={styles.label}>Voice Style</Text>
                  <Text style={styles.body}>{script.voiceStyle}</Text>
                </>
              )}
              {script.musicSuggestion && (
                <>
                  <Text style={styles.label}>Music Suggestion</Text>
                  <Text style={styles.body}>{script.musicSuggestion}</Text>
                </>
              )}
              {script.notes && (
                <>
                  <Text style={styles.label}>Notes</Text>
                  <Text style={styles.body}>{script.notes}</Text>
                </>
              )}
            </View>
          ))}

          {/* Divider between time slots (not after the last one) */}
          {slotIdx < Object.keys(campaign.radioAds!).length - 1 && <SectionDivider />}
        </View>
      )
    )}

    <Footer label="Radio Ads" />
  </Page>
)}
```

### 5b. Time Slot Display Labels

Add a constant map (matching the UI card's `TIME_SLOT_LABELS`):

```typescript
const TIME_SLOT_LABELS: Record<string, string> = {
  '15s': '15 Second',
  '30s': '30 Second',
  '60s': '60 Second',
};
```

### 5c. New Style: `metaText`

One new style is needed for the compact word-count/duration line. It sits between `label` and `body` semantically — smaller than body text, slightly muted:

```typescript
metaText: {
  fontSize: 9,
  color: COLORS.muted,
  marginBottom: 4,
},
```

All other styles (`sectionTitle`, `toneLabel`, `label`, `body`) already exist.

### 5d. Page Placement

Insert the Radio Ads page **between Magazine and Marketing Strategy** — after all print/audio content, before strategy. This groups it with the other "produced content" sections (postcard, magazine) rather than with digital platforms.

Updated order: Cover → Social Media → Paid Ads → Online Listings → Postcard → Magazine → **Radio Ads** → Marketing Strategy

### 5e. Import Changes

Update the import on line 10:

```typescript
import { CampaignKit, PrintAd, RadioTimeSlot, RadioScript } from '@/lib/types';
```

(`RadioTone` is not needed since we iterate with `Object.entries` and display the tone key as a label directly.)

### 5f. Conditional Rendering

The entire `<Page>` is wrapped in `{campaign.radioAds && (...)}`. This means:
- If no radio ads were generated (free users, or Pro users who didn't select radio), the page is omitted entirely.
- No empty pages, no placeholder text.

### 5g. Handling Partial Data

The nested `Object.entries` iteration handles partial data naturally:
- If only `15s` and `30s` are present (no `60s`), only two sections render.
- If a time slot has only one tone variant, only that tone renders.
- If a `RadioScript` is missing optional fields, those fields are silently omitted.

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src/lib/export/pdf-document.tsx` | Add `RadioTimeSlot`, `RadioScript` imports; add `TIME_SLOT_LABELS` constant; add `metaText` style; add Radio Ads `<Page>` block between Magazine and Marketing Strategy |

**No other files need changes.** The `generate-pdf.tsx` wrapper already passes the full `CampaignKit`. The `bundle.ts` ZIP builder already includes the PDF. The types (`RadioTimeSlot`, `RadioTone`, `RadioScript`) already exist in `src/lib/types/campaign.ts`.

---

## 7. Edge Cases

| Case | Behavior |
|------|----------|
| `campaign.radioAds` is `undefined` | Page omitted entirely |
| `campaign.radioAds` is empty object `{}` | Page renders but with no sections (harmless — `Object.entries({})` returns `[]`) |
| Only some time slots present | Only those slots render |
| Only some tones present per slot | Only those tones render |
| Very long 60s script | `@react-pdf/renderer` wraps to next page automatically |
| Optional fields all absent | Only script text + metadata line render |
| Optional fields all present | All three render below the metadata line |

---

## 8. Visual Hierarchy

The nesting mirrors the rest of the PDF:

```
pageTitle:       "Radio Ads"                    (20pt, bold, primary blue)
pageSubtitle:    "Scripts by time slot & tone"  (10pt, muted)
─────────────────────────────────────────────
sectionTitle:    "30 Second"                    (13pt, bold, primary blue)
  toneLabel:     "conversational"               (9pt, bold, accent blue, capitalized)
    label:       "SCRIPT"                       (8pt, uppercase, light gray)
    body:        "Looking for your dream..."    (10pt, 1.5 line height)
    metaText:    "42 words · ~30 seconds"       (9pt, muted)
    label:       "VOICE STYLE"                  (8pt, uppercase, light gray)
    body:        "Warm, conversational"          (10pt)
    label:       "MUSIC SUGGESTION"             (8pt, uppercase, light gray)
    body:        "Light acoustic background"    (10pt)
    label:       "NOTES"                        (8pt, uppercase, light gray)
    body:        "Emphasize the price point"    (10pt)
  toneLabel:     "authoritative"
    ...
  toneLabel:     "friendly"
    ...
─────────────────────────────────────────────
sectionTitle:    "60 Second"
  ...
```

---

## 9. Testing Plan

- **Unit test**: Render `CampaignPdf` with `campaign.radioAds` populated, assert radio section appears with correct time slot headers and script text.
- **Unit test**: Render `CampaignPdf` without `campaign.radioAds`, assert no "Radio Ads" page title is present.
- **Unit test**: Render with partial data (only `15s` slot), verify only one section renders.
- **Unit test**: Render with optional fields present, verify `voiceStyle`, `musicSuggestion`, `notes` labels and values appear.
- **Unit test**: Render with optional fields absent, verify those labels don't appear.
- **Manual test**: Generate a full campaign PDF and verify radio section appears between Magazine and Marketing Strategy, with correct formatting.

---

## 10. Deferred (Out of Scope)

- Radio ads in the CSV export (separate task if needed)
- Audio playback or QR codes linking to audio previews in the PDF
- Per-time-slot page breaks (Approach A — rejected, but could revisit if 60s scripts prove too long in practice)
