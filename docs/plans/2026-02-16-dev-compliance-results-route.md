# Dev-Only Compliance Results Route

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a dev-only API route that exposes compliance test run data so Claude can read it via `curl` without authentication.

**Architecture:** A single GET endpoint at `/api/dev/compliance-results` that only responds in `NODE_ENV=development`. It uses a Supabase service role client (bypasses RLS) to query the existing `compliance_test_runs` table. No new tables, no new test logic — just a read-only window into existing data.

**Tech Stack:** Next.js API route, Supabase service role client, TypeScript

---

### Task 1: Add Service Role Key to Environment

**Files:**
- Modify: `.env.local`

**Step 1: Add the service role key**

Add this line to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> **Note to user:** Get this from your Supabase dashboard → Settings → API → `service_role` key. This key bypasses RLS and should NEVER be exposed to the browser (no `NEXT_PUBLIC_` prefix).

**Step 2: Verify the key is excluded from client bundle**

Confirm that `.env.local` is in `.gitignore` (it should be by default with Next.js). The key has no `NEXT_PUBLIC_` prefix, so Next.js will only expose it server-side.

---

### Task 2: Create the Dev-Only Route

**Files:**
- Create: `src/app/api/dev/compliance-results/route.ts`

**Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Service role client bypasses RLS — dev only
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const runId = searchParams.get('id');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    // Fetch a single run by ID
    if (runId) {
      const { data: run, error } = await supabase
        .from('compliance_test_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(run);
    }

    // Fetch recent runs
    let query = supabase
      .from('compliance_test_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(limit);

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data: runs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: runs?.length ?? 0,
      runs: runs ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch compliance results' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the dev server picks it up**

Run: `curl -s http://localhost:3000/api/dev/compliance-results | head -200`

Expected: JSON with `count` and `runs` array (or empty array if no runs exist yet).

**Step 3: Commit**

```bash
git add src/app/api/dev/compliance-results/route.ts
git commit -m "feat: add dev-only route to expose compliance test results"
```

---

### Task 3: Test the Query Parameters

**Step 1: Test default (latest 5 runs)**

```bash
curl -s http://localhost:3000/api/dev/compliance-results
```

**Step 2: Test with limit**

```bash
curl -s "http://localhost:3000/api/dev/compliance-results?limit=1"
```

**Step 3: Test with state filter**

```bash
curl -s "http://localhost:3000/api/dev/compliance-results?state=OH"
```

**Step 4: Test single run by ID (use an ID from step 1)**

```bash
curl -s "http://localhost:3000/api/dev/compliance-results?id=<run-id>"
```

**Step 5: Verify production guard works**

Confirm the `NODE_ENV !== 'development'` check exists. In production, this route returns 404.

---

## Usage for Claude

Once deployed, Claude can view compliance test data with:

```bash
# Latest 5 runs (summary view)
curl -s http://localhost:3000/api/dev/compliance-results

# Latest run only
curl -s "http://localhost:3000/api/dev/compliance-results?limit=1"

# Ohio-specific runs
curl -s "http://localhost:3000/api/dev/compliance-results?state=OH"

# Full details of a specific run
curl -s "http://localhost:3000/api/dev/compliance-results?id=<uuid>"
```

The response includes the full `summary` (pass/fail counts, violation totals) and `results` (per-property breakdown with violation details, auto-fixes, and generated text).
