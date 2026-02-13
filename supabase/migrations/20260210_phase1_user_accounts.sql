-- Phase 1: User Accounts — extend profiles, add campaigns table

-- Extend profiles table with additional fields
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists updated_at timestamptz default now();

-- Users can update their own profile (was missing from initial migration)
-- SECURITY: Column-level grants instead of open UPDATE policy to prevent role escalation (CRIT-1)
-- The RLS policy allows the UPDATE, but column grants restrict WHICH columns can be changed
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Revoke blanket UPDATE and grant only safe columns (prevents users from changing their own role)
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, phone, company) on public.profiles to authenticated;

-- Auto-update updated_at on profile changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Campaigns table — stores user-generated ad campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  listing_data jsonb not null,
  generated_ads jsonb,
  platform text,
  status text default 'draft' check (status in ('draft', 'generated', 'exported')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.campaigns enable row level security;

create policy "Users own their campaigns" on public.campaigns
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update campaigns updated_at
create trigger on_campaign_updated
  before update on public.campaigns
  for each row execute function public.handle_updated_at();
