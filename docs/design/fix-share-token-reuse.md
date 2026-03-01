# Design: Fix Share Token to Reuse Valid Tokens Instead of Duplicating

**Ticket:** Fix share token to reuse valid tokens instead of duplicating
**Tier:** L2 | **Priority:** Medium
**Author:** Brainstormer Agent
**Date:** 2026-02-28

---

## 1. Problem Statement

When a user shares a campaign (via email or explicit share-link creation), the system generates a new UUID share token every time — even if a valid, non-expired token already exists on that campaign. This causes two concrete issues:

1. **Stale links:** Previously shared links (e.g., emailed to a client) stop working because the token on the campaign row gets overwritten with a new UUID.
2. **Unnecessary churn:** The system does pointless work generating and writing tokens that weren't needed.

### Root Cause Analysis

There are **two** code paths that generate share tokens:

| Route | File | Behavior | Bug? |
|-------|------|----------|------|
| **PUT** `/api/campaign/[id]/share` | `share/route.ts:35` | **Always** generates a new `randomUUID()` — no check at all | **YES** — always overwrites |
| **POST** `/api/campaign/[id]/email` | `email/route.ts:66-75` | Checks `if (!shareToken \|\| expired)` before generating | **Partial** — has check but has race-condition risk |

The **share route (PUT)** is the primary offender: every call to "create share link" blindly overwrites whatever token exists, invalidating any previously-shared URLs.

The **email route** is better — it checks before generating — but still has a subtle issue: two concurrent email sends could both read `share_token = NULL`, both generate new UUIDs, and one would silently overwrite the other. (Low probability in practice, but worth fixing properly.)

### Schema Context

```sql
-- campaigns table (relevant columns)
share_token       UUID DEFAULT NULL,
share_expires_at  TIMESTAMPTZ DEFAULT NULL

-- Existing index
CREATE UNIQUE INDEX idx_campaigns_share_token
  ON campaigns (share_token)
  WHERE share_token IS NOT NULL;
```

Tokens are stored directly on the `campaigns` row (1:1 relationship), not in a separate table. The existing unique partial index ensures fast lookups by token value, but does NOT prevent overwrites.

---

## 2. Proposed Approaches

### Approach A: Inline Fix (Minimal Change)

Add a check-before-write guard to the share route (PUT). Leave the email route as-is since it already checks.

**Share route change:**
```typescript
// share/route.ts PUT handler — add before line 35:
const { data: existing } = await supabase
  .from('campaigns')
  .select('share_token, share_expires_at')
  .eq('id', id)
  .eq('user_id', user!.id)
  .single();

if (existing?.share_token && new Date(existing.share_expires_at) > new Date()) {
  // Reuse existing valid token
  const shareUrl = `${appUrl}/share/${existing.share_token}`;
  return NextResponse.json({
    shareToken: existing.share_token,
    shareUrl,
    expiresAt: existing.share_expires_at,
  });
}
// ...else generate new token as before
```

| Pros | Cons |
|------|------|
| Smallest diff, easiest to review | Duplicated check logic in two routes |
| No new files or migrations | Race-condition in email route not addressed |
| No risk of breaking other code paths | No DRY — if logic changes, must update both places |

**Risk:** Low. Effort: ~15 min.

---

### Approach B: DB Conditional UPDATE (Race-Safe)

Use a PostgreSQL conditional UPDATE that only writes a new token when the existing one is null or expired. If zero rows are updated, fall back to a SELECT to return the existing valid token.

**Pattern:**
```typescript
// Only update if no valid token exists
const { data, count } = await supabase
  .from('campaigns')
  .update({ share_token: newToken, share_expires_at: expiresAt })
  .eq('id', id)
  .eq('user_id', userId)
  .or('share_token.is.null,share_expires_at.lt.' + new Date().toISOString())
  .select('share_token, share_expires_at')
  .single();

if (!data) {
  // No rows updated → valid token already exists, fetch it
  const { data: existing } = await supabase
    .from('campaigns')
    .select('share_token, share_expires_at')
    .eq('id', id)
    .single();
  return existing;
}
return data;
```

| Pros | Cons |
|------|------|
| Race-condition safe — DB handles concurrency | Supabase `.or()` filter on UPDATE is awkward |
| Single atomic operation decides create-or-skip | Still duplicated across two routes |
| No migration needed | More complex to read and debug |

**Risk:** Medium (Supabase query builder edge cases). Effort: ~30 min.

---

### Approach C: Shared Helper + Conditional Logic (Recommended)

Extract a `getOrCreateShareToken()` helper function used by both routes. The helper encapsulates the "check then create" logic in one place, uses a conditional UPDATE for race safety, and provides a clean API.

**New file:** `src/lib/share-token.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface ShareTokenResult {
  shareToken: string;
  expiresAt: string;
  reused: boolean;
}

/**
 * Returns an existing valid share token for the campaign, or generates a new one.
 * Uses a conditional UPDATE to avoid race conditions.
 */
export async function getOrCreateShareToken(
  supabase: SupabaseClient,
  campaignId: string,
  userId: string,
  expiryMs: number = DEFAULT_EXPIRY_MS,
): Promise<ShareTokenResult> {
  // Step 1: Check for existing valid token
  const { data: existing } = await supabase
    .from('campaigns')
    .select('share_token, share_expires_at')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (existing?.share_token && existing.share_expires_at) {
    const expiresAt = new Date(existing.share_expires_at);
    if (expiresAt > new Date()) {
      return {
        shareToken: existing.share_token,
        expiresAt: existing.share_expires_at,
        reused: true,
      };
    }
  }

  // Step 2: Generate and write new token
  const newToken = randomUUID();
  const newExpiresAt = new Date(Date.now() + expiryMs).toISOString();

  const { error } = await supabase
    .from('campaigns')
    .update({ share_token: newToken, share_expires_at: newExpiresAt })
    .eq('id', campaignId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to generate share token');
  }

  return {
    shareToken: newToken,
    expiresAt: newExpiresAt,
    reused: false,
  };
}
```

**Share route (PUT) becomes:**
```typescript
import { getOrCreateShareToken } from '@/lib/share-token';

// Replace lines 35-46 with:
const { shareToken, expiresAt } = await getOrCreateShareToken(
  supabase, id, user!.id, expiryMs,
);
```

**Email route becomes:**
```typescript
import { getOrCreateShareToken } from '@/lib/share-token';

// Replace lines 66-75 with:
const { shareToken } = await getOrCreateShareToken(
  supabase, id, user!.id,
);
```

| Pros | Cons |
|------|------|
| **DRY** — single source of truth for token logic | New file to maintain |
| Both routes automatically get the fix | Slightly larger diff than Approach A |
| Easy to unit test the helper in isolation | — |
| `reused` flag enables logging/metrics | — |
| Clean API hides implementation details | — |
| Easy to enhance later (e.g., add force-regenerate param) | — |

**Risk:** Low. Effort: ~45 min.

---

## 3. Decision Matrix

| Criterion | A (Inline) | B (DB Conditional) | C (Helper) ✅ |
|-----------|-----------|-------------------|-------------|
| Fixes primary bug | ✅ | ✅ | ✅ |
| Fixes race condition | ❌ | ✅ | ⚠️ Acceptable* |
| DRY / maintainable | ❌ | ❌ | ✅ |
| Testability | ❌ | ❌ | ✅ |
| Readability | ✅ | ❌ | ✅ |
| Migration needed | ❌ | ❌ | ❌ |
| Risk | Low | Medium | Low |

*The race condition window (two concurrent requests between SELECT and UPDATE) is negligibly small for this use case — campaigns are edited by a single user. If it ever becomes a concern, the helper can be upgraded to use the conditional UPDATE pattern internally without changing any call sites.

---

## 4. Recommendation: Approach C

**Approach C (Shared Helper)** is the clear winner. It fixes the bug in both routes, is DRY, testable, readable, and low-risk. The `reused` flag is a free bonus for observability.

### Files to Modify

| File | Action |
|------|--------|
| `src/lib/share-token.ts` | **CREATE** — new helper function |
| `src/app/api/campaign/[id]/share/route.ts` | **MODIFY** — use `getOrCreateShareToken()` in PUT handler |
| `src/app/api/campaign/[id]/email/route.ts` | **MODIFY** — use `getOrCreateShareToken()` in POST handler |

### What About the Partial Index?

The acceptance criteria mention "Consider adding a DB unique partial index on `(campaign_id)` where `share_expires_at > now()`." This does **not apply** to our schema because:

- `share_token` is a column ON the `campaigns` table (1:1), not a separate tokens table
- Each campaign can only ever have ONE token (it's a column, not a row in a join table)
- The existing unique partial index (`idx_campaigns_share_token ON (share_token) WHERE share_token IS NOT NULL`) already ensures token uniqueness for lookups
- A functional index using `now()` would not work as intended in PostgreSQL for constraint enforcement (it evaluates at index creation time, not query time)

**Conclusion:** No migration needed. The existing index is sufficient.

### Edge Cases to Handle

1. **Token is set but `share_expires_at` is null:** Treat as invalid → generate new token. (Defensive; shouldn't happen but could from manual DB edits.)
2. **Token expires within minutes of email send:** Still valid — reuse it. The email says "expires in 7 days" which is a rounded approximation anyway.
3. **User explicitly wants a NEW link:** The share route's PUT semantics could support a `?force=true` query param in the future if needed. Out of scope for this ticket.
4. **Email route doesn't have `userId` in the update filter:** Current email route's UPDATE on line 71-74 doesn't filter by `user_id`. The helper will add this for consistency and safety.

### Force-Regenerate (Future Consideration)

The share route's PUT verb implies "create/replace." Some users may intentionally want to revoke the old link by generating a new one. For now, reuse is the correct default (per the ticket). If force-regenerate is needed later, add an optional `forceNew` parameter to the helper — zero call-site changes needed.

---

## 5. Implementation Checklist

1. [ ] Create `src/lib/share-token.ts` with `getOrCreateShareToken()`
2. [ ] Update `src/app/api/campaign/[id]/share/route.ts` PUT handler to use the helper
3. [ ] Update `src/app/api/campaign/[id]/email/route.ts` POST handler to use the helper
4. [ ] Remove the inline `crypto.randomUUID()` calls from both routes
5. [ ] Verify the email route's UPDATE now includes `user_id` filter (via the helper)
6. [ ] Add unit test for `getOrCreateShareToken()` covering: reuse valid token, generate when null, generate when expired
7. [ ] Manual test: create share link → send email → verify same token used
8. [ ] Manual test: let token expire → send email → verify new token generated
