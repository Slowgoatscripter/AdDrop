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

create policy "Anyone can read demo cache"
  on public.demo_cache for select
  using (true);

create policy "Only service role can write demo cache"
  on public.demo_cache for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.demo_cache is 'Pre-generated campaign results for the landing page demo';
