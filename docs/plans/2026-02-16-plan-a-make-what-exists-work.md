# Plan A: Make What Exists Work — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical bugs, wire quality data to per-card UI, make existing interactions work (See More, error handling, persistence), and make dashboard campaigns clickable.

**Architecture:** Fix-and-wire approach — no new components except a shared utility extraction. All changes target existing files. Quality data flows from campaign-shell through campaign-tabs to per-card components. Error handling added to all async operations. Persistence upgraded from sessionStorage to Supabase.

**Tech Stack:** Next.js 15, React 19, Supabase, shadcn/ui, Tailwind CSS, Sonner (toasts), Jest

---

## Task 1: Fix print-ad-card.tsx — Remove rotation + add relative (5 min)

**Files to modify:**
- `src/components/campaign/print-ad-card.tsx`

**Steps:**

1. On line 85, add `relative` to the className so the absolute-positioned child (line 93) has a positioning context:

```tsx
// BEFORE (line 85):
className="bg-white overflow-hidden"

// AFTER:
className="bg-white overflow-hidden relative"
```

2. On line 87, remove the `transform: 'rotate(1.5deg)'` from the style object. Keep boxShadow and transition:

```tsx
// BEFORE (lines 86-90):
style={{
  transform: 'rotate(1.5deg)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}}

// AFTER:
style={{
  boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}}
```

**Why:** The `rotate(1.5deg)` tilts the entire print ad mockup, which looks like a rendering bug rather than intentional design. The missing `relative` means the absolute-positioned gradient overlay on line 93 escapes its container.

**Test:** Visual — confirm print ad cards render straight and the paper-edge highlight overlay sits in the top-left corner of the card.

**Commit:** `fix: remove rotation and add relative positioning to print-ad-card`

---

## Task 2: Fix N-2 compliance revert logic bug in campaign-shell.tsx (10 min)

**Files to modify:**
- `src/components/campaign/campaign-shell.tsx`

**The Bug:** In `handleApplySuggestion` (line 308), the compliance check after applying a suggestion compares `result.violations.length > 0` — but if the campaign already had existing violations, this will ALWAYS revert the suggestion. It should only revert if the apply *introduced new* violations.

**Steps:**

1. Add sonner import at the top of the file:

```tsx
// Add after existing imports (around line 14):
import { toast } from 'sonner';
```

2. Inside `handleApplySuggestion`, capture the violation count BEFORE applying the suggestion. Add this right before the compliance re-check `try` block (before line 297):

```tsx
// Capture pre-apply violation count for comparison
const beforeViolationCount = campaign.complianceResult?.violations?.length ?? 0;
```

3. Replace the violation check logic (lines 307-314):

```tsx
// BEFORE:
if (result.violations && result.violations.length > 0) {
  alert(
    'This suggestion introduces a compliance violation and was not applied:\n\n' +
    result.violations.map((v) => `- ${v.term}: ${v.explanation}`).join('\n'),
  );
  return;
}

// AFTER:
if (result.violations && result.violations.length > beforeViolationCount) {
  const newViolations = result.violations.slice(beforeViolationCount);
  toast.error(
    'This suggestion introduces a compliance violation and was not applied: ' +
    newViolations.map((v) => `${v.term}: ${v.explanation}`).join('; '),
  );
  return;
}
```

**Test:**
```bash
npx jest --testPathPattern="campaign-shell" --no-coverage
```

**Commit:** `fix: compare violation count before/after suggestion apply (N-2 bug) and replace alert with toast`

---

## Task 3: Wire per-card quality data — buildPlatformQualityResult in campaign-tabs.tsx (15 min)

**Files to modify:**
- `src/components/campaign/campaign-tabs.tsx`
- `src/components/campaign/campaign-shell.tsx`

**Steps:**

### 3a. Update CampaignTabsProps in campaign-tabs.tsx

```tsx
// BEFORE (lines 30-33):
interface CampaignTabsProps {
  campaign: CampaignKit;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
}

// AFTER:
interface CampaignTabsProps {
  campaign: CampaignKit;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  qualitySuggestions?: QualitySuggestion[];
  qualityConstraints?: QualityConstraintViolation[];
}
```

### 3b. Add imports for quality types

```tsx
// Add to existing imports:
import type { QualitySuggestion, QualityConstraintViolation, QualityIssue, PlatformQualityResult } from '@/lib/types/quality';
```

### 3c. Add buildPlatformQualityResult function (after buildPlatformResult, around line 91)

```tsx
function buildPlatformQualityResult(
  qualitySuggestions: QualitySuggestion[] | undefined,
  qualityConstraints: QualityConstraintViolation[] | undefined,
  platformPrefix: string
): PlatformQualityResult | undefined {
  const suggestions = qualitySuggestions?.filter(
    (s) => s.platform === platformPrefix || s.platform.startsWith(platformPrefix + '.')
  ) ?? [];

  const constraints = qualityConstraints?.filter(
    (c) => c.platform === platformPrefix || c.platform.startsWith(platformPrefix + '.')
  ) ?? [];

  if (suggestions.length === 0 && constraints.length === 0) return undefined;

  // Map suggestions to QualityIssue format
  const issues: QualityIssue[] = [
    ...suggestions.map((s): QualityIssue => ({
      platform: s.platform,
      category: s.category,
      priority: s.severity === 'high' ? 'required' : 'recommended',
      source: 'ai',
      issue: s.issue,
      suggestedFix: s.suggestedRewrite ?? s.explanation,
      context: s.currentText,
    })),
    ...constraints.map((c): QualityIssue => ({
      platform: c.platform,
      category: 'platform-format',
      priority: 'required',
      source: 'regex',
      issue: c.issue,
      suggestedFix: c.fixedText ?? 'Auto-enforced',
      originalText: c.currentText,
      fixedText: c.fixedText ?? undefined,
    })),
  ];

  return {
    platform: platformPrefix,
    issues,
    passed: issues.length === 0,
  };
}
```

### 3d. Update CampaignTabs component signature and usage

```tsx
// BEFORE (line 98):
export function CampaignTabs({ campaign, onReplace }: CampaignTabsProps) {

// AFTER:
export function CampaignTabs({ campaign, onReplace, qualitySuggestions, qualityConstraints }: CampaignTabsProps) {
```

### 3e. Pass qualityResult to each card component

For every card in the JSX, add a `qualityResult` prop. Example for InstagramCard (line 128):

```tsx
// BEFORE:
<InstagramCard content={campaign.instagram} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'instagram')} onReplace={onReplace} />

// AFTER:
<InstagramCard content={campaign.instagram} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'instagram')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'instagram')} onReplace={onReplace} />
```

Repeat for: `FacebookCard` (facebook), `AdCard` Twitter (twitter), `GoogleAdsCard` (googleAds), `MetaAdCard` (metaAd), `PrintAdCard` full page (magazineFullPage), `PrintAdCard` half page (magazineHalfPage), `PostcardCard` (postcard), `AdCard` Zillow (zillow), `AdCard` RealtorCom (realtorCom), `AdCard` HomesComTrulia (homesComTrulia), `MlsCard` (mlsDescription).

### 3f. Thread props from campaign-shell.tsx

In campaign-shell.tsx, update the CampaignTabs call (line 425):

```tsx
// BEFORE:
<CampaignTabs campaign={campaign} onReplace={handleReplace} />

// AFTER:
<CampaignTabs
  campaign={campaign}
  onReplace={handleReplace}
  qualitySuggestions={campaign.qualitySuggestions}
  qualityConstraints={campaign.qualityConstraints}
/>
```

**Test:**
```bash
npx jest --testPathPattern="campaign-tabs" --no-coverage
```

**Commit:** `feat: wire per-card quality data via buildPlatformQualityResult`

---

## Task 4: Add QualityDetails rendering to ad-card-wrapper.tsx (10 min)

**Files to modify:**
- `src/components/campaign/ad-card-wrapper.tsx`
- `src/components/campaign/campaign-tabs.tsx` (thread onRevert)

**Steps:**

### 4a. Import QualityDetails and add onRevert prop

```tsx
// Add import (after ViolationDetails import, line 7):
import { QualityDetails } from './quality-details';

// Update AdCardWrapperProps interface — add after onReplace:
onRevert?: (issue: QualityIssue) => void;
```

Add the import for QualityIssue:

```tsx
import { QualityIssue, PlatformQualityResult } from '@/lib/types/quality';
```

### 4b. Destructure onRevert in the component

```tsx
// Update destructuring (add onRevert after onReplace):
export function AdCardWrapper({
  platform,
  platformIcon,
  dimensionLabel,
  complianceResult,
  qualityResult,
  toneSwitcher,
  copyText,
  children,
  violations,
  onReplace,
  onRevert,
}: AdCardWrapperProps) {
```

### 4c. Add QualityDetails after ViolationDetails (after line 92)

```tsx
{/* Violation details */}
{violations && violations.length > 0 && onReplace && (
  <ViolationDetails violations={violations} onReplace={onReplace} />
)}

{/* Quality details */}
{qualityResult && qualityResult.issues.length > 0 && (
  <QualityDetails issues={qualityResult.issues} onRevert={onRevert} />
)}
```

### 4d. Thread onRevert from campaign-tabs.tsx

This requires adding an `onRevert` callback prop to `CampaignTabsProps` and passing it through to each card. For now, the revert logic is a placeholder — it will be fully wired when Task 14 moves suggestion Apply/Dismiss to per-card level.

```tsx
// In CampaignTabsProps, add:
onRevert?: (issue: QualityIssue) => void;
```

Pass to each card's AdCardWrapper via the card components. The card components (InstagramCard, FacebookCard, etc.) already accept `qualityResult` and pass it to `AdCardWrapper`. We need to also pass `onRevert` through.

**Note:** Most card components will need a new `onRevert` prop added to their interface. Add it alongside the existing `qualityResult` prop in each card's props interface and pass it through to `AdCardWrapper`.

**Test:**
```bash
npx jest --testPathPattern="ad-card-wrapper" --no-coverage
```

**Commit:** `feat: render QualityDetails in ad-card-wrapper footer`

---

## Task 5: Make Instagram "... more" interactive (10 min)

**Files to modify:**
- `src/components/campaign/instagram-card.tsx`

**Steps:**

1. Add `expanded` state (after `selectedImageIndex` state, around line 45):

```tsx
const [expanded, setExpanded] = useState(false);
```

2. Replace the `truncateCaption` function (lines 59-67):

```tsx
const truncateCaption = (text: string, limit: number) => {
  if (expanded || text.length <= limit) {
    return (
      <>
        {text}
        {expanded && text.length > limit && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[#8e8e8e] bg-transparent border-none cursor-pointer p-0 ml-1"
          >
            less
          </button>
        )}
      </>
    );
  }
  return (
    <>
      {text.slice(0, limit)}
      <button
        onClick={() => setExpanded(true)}
        className="text-[#8e8e8e] bg-transparent border-none cursor-pointer p-0"
      >
        ... more
      </button>
    </>
  );
};
```

**Why:** The current "... more" is a non-interactive `<span>`. Instagram's real UI has an expandable caption — users expect to click it.

**Test:**
```bash
npx jest --testPathPattern="instagram-card" --no-coverage
```

**Commit:** `fix: make Instagram caption "... more" clickable with expand/collapse`

---

## Task 6: Make Facebook "See More" interactive (10 min)

**Files to modify:**
- `src/components/campaign/facebook-card.tsx`

**Steps:**

1. Add `expanded` state (after `selectedImageIndex` state, around line 44):

```tsx
const [expanded, setExpanded] = useState(false);
```

2. Replace the `truncatePost` function (lines 57-66):

```tsx
const truncatePost = (text: string) => {
  const limit = 180;
  if (expanded || text.length <= limit) {
    return (
      <span>
        {text}
        {expanded && text.length > limit && (
          <>
            {' '}
            <button
              onClick={() => setExpanded(false)}
              className="text-[#385898] bg-transparent border-none cursor-pointer p-0"
            >
              See Less
            </button>
          </>
        )}
      </span>
    );
  }
  return (
    <>
      {text.slice(0, limit)}...{' '}
      <button
        onClick={() => setExpanded(true)}
        className="text-[#385898] bg-transparent border-none cursor-pointer p-0"
      >
        See More
      </button>
    </>
  );
};
```

**Why:** The "See More" span has `cursor-pointer` but no `onClick`. Users click it and nothing happens — a broken interaction.

**Test:**
```bash
npx jest --testPathPattern="facebook-card" --no-coverage
```

**Commit:** `fix: make Facebook "See More" clickable with expand/collapse`

---

## Task 7: Add error handling to handleExport (10 min)

**Files to modify:**
- `src/components/campaign/campaign-shell.tsx`

**Steps:**

1. Add `exporting` state (near other state declarations, around line 20):

```tsx
const [exporting, setExporting] = useState(false);
```

2. Rewrite `handleExport` (lines 378-391):

```tsx
async function handleExport(format: 'pdf' | 'csv') {
  setExporting(true);
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign!.id, format }),
    });

    if (!res.ok) {
      toast.error('Export failed — please try again.');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign!.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  } catch (err) {
    console.error('[campaign-shell] Export failed:', err);
    toast.error('Export failed — please try again.');
  } finally {
    setExporting(false);
  }
}
```

3. Update export buttons to respect `exporting` state (lines 400-401):

```tsx
<Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
  {exporting ? 'Exporting...' : 'Export CSV'}
</Button>
<Button onClick={() => handleExport('pdf')} disabled={exporting}>
  {exporting ? 'Exporting...' : 'Export PDF'}
</Button>
```

**Note:** The `toast` import was already added in Task 2.

**Test:**
```bash
npx jest --testPathPattern="campaign-shell" --no-coverage
```

**Commit:** `fix: add error handling and loading state to handleExport`

---

## Task 8: Add error handling to handleReplace (10 min)

**Files to modify:**
- `src/components/campaign/campaign-shell.tsx`
- `src/components/campaign/violation-details.tsx`

**Steps:**

### 8a. Update handleReplace catch block in campaign-shell.tsx (lines 141-143):

```tsx
// BEFORE:
} catch (err) {
  console.error('[campaign-shell] Compliance re-check failed:', err);
}

// AFTER:
} catch (err) {
  console.error('[campaign-shell] Compliance re-check failed:', err);
  toast.warning('Changes applied but compliance status may be outdated.');
}
```

### 8b. Update violation-details.tsx to handle async Replace

Update `ViolationDetailsProps` to accept an async `onReplace`:

```tsx
// BEFORE (lines 9-12):
interface ViolationDetailsProps {
  violations: ComplianceViolation[];
  onReplace: (platform: string, oldTerm: string, newTerm: string) => void;
}

// AFTER:
interface ViolationDetailsProps {
  violations: ComplianceViolation[];
  onReplace: (platform: string, oldTerm: string, newTerm: string) => void | Promise<void>;
}
```

Update ViolationItem's `onReplace` type similarly, then update `handleReplace` in ViolationItem (lines 74-77):

```tsx
// BEFORE:
function handleReplace() {
  onReplace(violation.platform, violation.term, violation.alternative);
  setFixed(true);
}

// AFTER:
const [replacing, setReplacing] = useState(false);

async function handleReplace() {
  setReplacing(true);
  try {
    await Promise.resolve(onReplace(violation.platform, violation.term, violation.alternative));
    setFixed(true);
  } catch {
    // Parent handles toast
  } finally {
    setReplacing(false);
  }
}
```

Update the Replace button (line 103):

```tsx
// BEFORE:
<Button size="sm" variant="outline" className="text-xs flex-shrink-0 h-7" onClick={handleReplace}>
  Replace
</Button>

// AFTER:
<Button size="sm" variant="outline" className="text-xs flex-shrink-0 h-7" onClick={handleReplace} disabled={replacing}>
  {replacing ? 'Replacing...' : 'Replace'}
</Button>
```

**Test:**
```bash
npx jest --testPathPattern="violation-details" --no-coverage
```

**Commit:** `fix: add error handling to handleReplace, async-aware Replace button`

---

## Task 9: Add error handling + loading to handleApplySuggestion (10 min)

**Files to modify:**
- `src/components/campaign/campaign-shell.tsx`
- `src/components/campaign/quality-suggestions-panel.tsx`

**Steps:**

### 9a. Add applyingId state in campaign-shell.tsx (near other state, around line 20):

```tsx
const [applyingId, setApplyingId] = useState<string | null>(null);
```

### 9b. Wrap handleApplySuggestion with applyingId tracking

At the start of `handleApplySuggestion` (after the guard on line 158):

```tsx
setApplyingId(suggestion.id);
```

At the end (before `setCampaign(updated)` on line 329), and in the early-return paths, add:

```tsx
setApplyingId(null);
```

Also wrap the entire function body in a try/finally for safety:

```tsx
const handleApplySuggestion = useCallback(
  async (suggestion: QualitySuggestion) => {
    if (!campaign || !suggestion.suggestedRewrite) return;
    setApplyingId(suggestion.id);
    try {
      // ... existing logic ...
    } finally {
      setApplyingId(null);
    }
  },
  [campaign],
);
```

### 9c. Replace remaining console.warn with toast

The `console.warn` on line 292 and the `console.warn` on line 321:

```tsx
// Line 292 — could not apply:
toast.warning('Could not apply suggestion — text may have already changed.');
return;

// Lines 320-321 — compliance check failed:
toast.warning('Suggestion applied but compliance status may be outdated.');
```

### 9d. Pass applyingId to QualitySuggestionsPanel

```tsx
// In the JSX (around line 411):
<QualitySuggestionsPanel
  suggestions={campaign.qualitySuggestions || []}
  constraints={campaign.qualityConstraints || []}
  onApply={handleApplySuggestion}
  onDismiss={handleDismissSuggestion}
  applyingId={applyingId}
/>
```

### 9e. Update QualitySuggestionsPanel to accept and use applyingId

```tsx
// Update interface:
interface QualitySuggestionsPanelProps {
  suggestions: QualitySuggestion[];
  constraints: QualityConstraintViolation[];
  onApply?: (suggestion: QualitySuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  applyingId?: string | null;
}
```

Thread `applyingId` to `SuggestionCard`:

```tsx
<SuggestionCard
  key={suggestion.id}
  suggestion={suggestion}
  onApply={onApply}
  onDismiss={onDismiss}
  isApplying={suggestion.id === applyingId}
/>
```

### 9f. Update SuggestionCard to disable buttons and show spinner

```tsx
function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  isApplying,
}: {
  suggestion: QualitySuggestion;
  onApply?: (suggestion: QualitySuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  isApplying?: boolean;
}) {
```

Update the Apply button (around line 155):

```tsx
<button
  onClick={() => onApply(suggestion)}
  disabled={isApplying}
  className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isApplying ? (
    <span className="w-3 h-3 border border-emerald-600 border-t-transparent rounded-full animate-spin" />
  ) : (
    <Sparkles className="w-3 h-3" />
  )}
  {isApplying ? 'Applying...' : 'Apply'}
</button>
```

Disable the Dismiss button too when applying:

```tsx
<button
  onClick={() => onDismiss(suggestion.id)}
  disabled={isApplying}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
```

**Test:**
```bash
npx jest --testPathPattern="quality-suggestions" --no-coverage
```

**Commit:** `fix: add loading state and toast error handling to suggestion apply`

---

## Task 10: Persist fixes to Supabase (15 min)

**Files to modify:**
- `src/components/campaign/campaign-shell.tsx`

**Steps:**

1. Add a `persistCampaignAds` helper inside the component (or above it):

```tsx
async function persistCampaignAds(id: string, generatedAds: CampaignKit) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ generated_ads: generatedAds })
      .eq('id', id);

    if (error) {
      console.error('[campaign-shell] Supabase persist failed:', error);
      toast.error('Changes saved locally but failed to sync.');
    }
  } catch (err) {
    console.error('[campaign-shell] Supabase persist error:', err);
    toast.error('Changes saved locally but failed to sync.');
  }
}
```

2. Call `persistCampaignAds` after every state update that modifies the campaign data. Replace `sessionStorage.setItem(...)` calls with both sessionStorage (for backward compat) and Supabase persist.

In `handleReplace` (after line 146):

```tsx
setCampaign(updated);
sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
persistCampaignAds(updated.id, updated);
```

In `handleApplySuggestion` (after line 330):

```tsx
setCampaign(updated);
sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
persistCampaignAds(updated.id, updated);
```

In `handleDismissSuggestion` — this one uses the functional updater, so add persistence after:

```tsx
const handleDismissSuggestion = useCallback(
  (suggestionId: string) => {
    if (!campaign) return;
    const updated = {
      ...campaign,
      qualitySuggestions: campaign.qualitySuggestions?.filter(
        (s) => s.id !== suggestionId,
      ),
    };
    setCampaign(updated);
    sessionStorage.setItem(`campaign-${updated.id}`, JSON.stringify(updated));
    persistCampaignAds(updated.id, updated);
  },
  [campaign],
);
```

**Test:**
```bash
npx jest --testPathPattern="campaign-shell" --no-coverage
```

**Commit:** `feat: persist campaign edits to Supabase alongside sessionStorage`

---

## Task 11: Auto-expand hard violations in violation-details.tsx (5 min)

**Files to modify:**
- `src/components/campaign/violation-details.tsx`

**Steps:**

1. Update the default `expanded` state (line 139):

```tsx
// BEFORE:
const [expanded, setExpanded] = useState(false);

// AFTER:
const [expanded, setExpanded] = useState(
  violations.some((v) => v.severity === 'hard')
);
```

**Why:** Hard violations are legally significant (Fair Housing Act). Auto-expanding ensures agents see them immediately rather than having to click to discover them.

**Test:**
```bash
npx jest --testPathPattern="violation-details" --no-coverage
```

**Commit:** `fix: auto-expand violation details when hard violations exist`

---

## Task 12: Make dashboard campaign cards clickable (10 min)

**Files to modify:**
- `src/app/dashboard/page.tsx`

**Steps:**

1. Import `ChevronRight` from lucide-react (update existing import on line 4):

```tsx
import { Plus, FileText, ChevronRight } from 'lucide-react'
```

Note: `Link` is already imported on line 3.

2. Replace the campaign card `<div>` (lines 74-88) with a `<Link>`:

```tsx
// BEFORE:
<div key={campaign.id} className="p-4 border border-border rounded-lg bg-muted/30">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-medium text-foreground">{campaign.name}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">
        {campaign.platform && <span className="capitalize">{campaign.platform}</span>}
        {campaign.platform && ' · '}
        {new Date(campaign.created_at).toLocaleDateString()}
      </p>
    </div>
    <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium capitalize">
      {campaign.status}
    </span>
  </div>
</div>

// AFTER:
<Link
  key={campaign.id}
  href={`/campaign/${campaign.id}`}
  className="block p-4 border border-border rounded-lg bg-muted/30 hover:border-gold/50 transition-colors cursor-pointer"
>
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-medium text-foreground">{campaign.name}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">
        {campaign.platform && <span className="capitalize">{campaign.platform}</span>}
        {campaign.platform && ' · '}
        {new Date(campaign.created_at).toLocaleDateString()}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium capitalize">
        {campaign.status}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </div>
</Link>
```

**Why:** Campaign cards are plain `<div>`s — users cannot navigate to their campaigns from the dashboard. This is the most obvious missing interaction.

**Test:** Manual — visit `/dashboard`, verify cards are clickable and navigate to `/campaign/[id]`.

**Commit:** `feat: make dashboard campaign cards clickable with Link`

---

## Task 13: Extract seededRandom to shared utility (5 min)

**Files to modify:**
- `src/lib/utils/seeded-random.ts` (new file)
- `src/components/campaign/instagram-card.tsx`
- `src/components/campaign/facebook-card.tsx`
- `src/components/campaign/meta-ad-card.tsx`

**Steps:**

1. Create `src/lib/utils/seeded-random.ts`:

```tsx
/** Derive a stable pseudo-random number from a seed within [min, max] */
export function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const t = x - Math.floor(x);
  return Math.floor(t * (max - min + 1)) + min;
}
```

2. In `instagram-card.tsx`, remove the local `seededRandom` function (lines 29-33) and add import:

```tsx
import { seededRandom } from '@/lib/utils/seeded-random';
```

3. In `facebook-card.tsx`, remove the local `seededRandom` function (lines 28-32) and add import:

```tsx
import { seededRandom } from '@/lib/utils/seeded-random';
```

4. In `meta-ad-card.tsx`, remove the local `seededRandom` function (lines 22-26 approximately) and add import:

```tsx
import { seededRandom } from '@/lib/utils/seeded-random';
```

**Test:**
```bash
npx jest --testPathPattern="(instagram|facebook|meta-ad)-card" --no-coverage
```

**Commit:** `refactor: extract seededRandom to shared utility`

---

## Task 14: Demote banners to summary lines (15 min)

**Files to modify:**
- `src/components/campaign/campaign-shell.tsx`

**Steps:**

### 14a. Replace ComplianceBanner with a minimal summary line

```tsx
// BEFORE (lines 405-407):
{campaign.complianceResult && (
  <ComplianceBanner result={campaign.complianceResult} />
)}

// AFTER:
{campaign.complianceResult && campaign.complianceResult.violations?.length > 0 && (
  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
    <span className="font-medium">
      {campaign.complianceResult.violations.length} compliance {campaign.complianceResult.violations.length === 1 ? 'issue' : 'issues'} found
    </span>
    <span className="text-amber-600">— View issues below each ad card</span>
  </div>
)}
```

### 14b. Replace QualitySuggestionsPanel with summary for suggestions, keep constraints section

Replace the QualitySuggestionsPanel block (lines 409-417):

```tsx
// AFTER:
{/* Constraints section — keep full panel since these are auto-enforced and campaign-level */}
{campaign.qualityConstraints && campaign.qualityConstraints.length > 0 && (
  <QualitySuggestionsPanel
    suggestions={[]}
    constraints={campaign.qualityConstraints}
    onApply={handleApplySuggestion}
    onDismiss={handleDismissSuggestion}
    applyingId={applyingId}
  />
)}

{/* Quality suggestions summary — details now live per-card */}
{campaign.qualitySuggestions && campaign.qualitySuggestions.length > 0 && (
  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
    <span className="font-medium">
      {campaign.qualitySuggestions.length} quality {campaign.qualitySuggestions.length === 1 ? 'suggestion' : 'suggestions'}
    </span>
    <span className="text-amber-600">— Review below each ad card</span>
  </div>
)}
```

### 14c. Wire suggestion Apply/Dismiss to per-card QualityDetails

This requires extending the `onRevert` callback we added in Task 4 to also handle Apply and Dismiss. In `campaign-tabs.tsx`, create a handler that maps quality issue revert actions back to the parent's `onApply`/`onDismiss`:

Add new props to CampaignTabsProps:

```tsx
interface CampaignTabsProps {
  campaign: CampaignKit;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  qualitySuggestions?: QualitySuggestion[];
  qualityConstraints?: QualityConstraintViolation[];
  onApplySuggestion?: (suggestion: QualitySuggestion) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
}
```

Thread from campaign-shell.tsx:

```tsx
<CampaignTabs
  campaign={campaign}
  onReplace={handleReplace}
  qualitySuggestions={campaign.qualitySuggestions}
  qualityConstraints={campaign.qualityConstraints}
  onApplySuggestion={handleApplySuggestion}
  onDismissSuggestion={handleDismissSuggestion}
/>
```

**Note:** Full per-card Apply/Dismiss buttons inside QualityDetails is a significant UI change. For this task, keep the campaign-level constraints panel and the per-card QualityDetails (from Task 4) showing issues with Revert. The summary line replaces the large suggestion banner. A future iteration can add per-card Apply/Dismiss buttons.

**Test:**
```bash
npx jest --testPathPattern="campaign-shell" --no-coverage
```

**Commit:** `refactor: demote compliance and quality banners to summary lines`

---

## Dependency Graph

```
Task 1  (print-ad-card)          — independent
Task 2  (N-2 bug + toast import) — independent, but adds toast import needed by Tasks 7-10
Task 3  (quality wiring)         — independent
Task 4  (QualityDetails render)  — depends on Task 3
Task 5  (Instagram more)         — independent
Task 6  (Facebook See More)      — independent
Task 7  (export error handling)  — depends on Task 2 (toast import)
Task 8  (replace error handling) — depends on Task 2 (toast import)
Task 9  (apply error handling)   — depends on Task 2 (toast import)
Task 10 (Supabase persist)       — depends on Tasks 7-9 (toast import present)
Task 11 (auto-expand violations) — independent
Task 12 (dashboard links)        — independent
Task 13 (seededRandom extract)   — independent
Task 14 (demote banners)         — depends on Tasks 3, 4, 9
```

## Parallel Execution Groups

- **Group A (independent, do first):** Tasks 1, 5, 6, 11, 12, 13
- **Group B (toast import chain):** Task 2, then Tasks 7, 8, 9 in parallel
- **Group C (quality wiring):** Task 3, then Task 4
- **Group D (persistence):** Task 10 (after Group B)
- **Group E (banner demotion):** Task 14 (after Groups B + C)

## Total Estimated Time: ~2.5 hours

## Verification Checklist

After all tasks are complete, run:

```bash
npx jest --no-coverage
npm run build
```

Verify:
- [ ] Print ad cards render straight, no rotation
- [ ] Applying a quality suggestion does not revert when pre-existing violations exist
- [ ] Each ad card shows quality issues in its footer
- [ ] Instagram "... more" expands and collapses the caption
- [ ] Facebook "See More" expands and collapses the post
- [ ] Export buttons show loading state and toast on success/failure
- [ ] Replace button shows loading state and toasts on compliance re-check failure
- [ ] Apply button shows spinner, disables Dismiss, toasts on error
- [ ] Campaign edits persist to Supabase (check DB after a replace)
- [ ] Hard violations auto-expand the violation details section
- [ ] Dashboard campaign cards navigate to `/campaign/[id]` on click
- [ ] No duplicate `seededRandom` functions — single import from shared util
- [ ] Banners replaced with summary lines, per-card details visible
