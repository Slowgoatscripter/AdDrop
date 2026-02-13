-- Phase 2: MFA & Settings — backup codes table + JWT claims hook

-- MFA backup codes table
create table public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.mfa_backup_codes enable row level security;
-- No user-facing policies — accessed only via service_role

-- JWT claims hook for caching user role in access token
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer as $$
declare
  claims jsonb;
  user_role text;
begin
  select role into user_role from public.profiles where id = (event->>'user_id')::uuid;
  claims := event->'claims';
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', '"user"');
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;
