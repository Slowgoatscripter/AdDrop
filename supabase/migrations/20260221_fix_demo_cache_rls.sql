-- Remove public write policies (keep public SELECT for landing page reads)
drop policy if exists "Anyone can write demo cache" on public.demo_cache;
drop policy if exists "Anyone can update demo cache" on public.demo_cache;
-- No explicit write policies needed -- service role bypasses RLS entirely
-- This also addresses L-3 (missing DELETE policy) since service role can delete
