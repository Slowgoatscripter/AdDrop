create table public.demo_cache (
  id uuid primary key default gen_random_uuid(),
  property_id text not null unique,
  campaign_result jsonb not null,
  compliance_result jsonb not null,
  quality_result jsonb,
  raw_campaign jsonb not null,
  generated_at timestamptz not null default now(),
  view_count integer not null default 0
);

alter table public.demo_cache enable row level security;

-- Public read/write — this is a non-sensitive cache table
create policy "Anyone can read demo cache"
  on public.demo_cache for select
  using (true);

create policy "Anyone can write demo cache"
  on public.demo_cache for insert
  with check (true);

create policy "Anyone can update demo cache"
  on public.demo_cache for update
  using (true)
  with check (true);

comment on table public.demo_cache is 'Pre-generated campaign results for the landing page demo';
