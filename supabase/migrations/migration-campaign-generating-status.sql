-- Migration: Add 'generating' and 'failed' statuses to campaigns.status
-- Also adds error_message and generation_started_at columns for async pipeline support
--
-- The original CHECK constraint was defined inline in 20260210_phase1_user_accounts.sql:
--   status text default 'draft' check (status in ('draft', 'generated', 'exported'))
-- PostgreSQL names inline constraints automatically as: campaigns_status_check
-- We drop and recreate it to add the new statuses.

-- Step 1: Drop the existing inline CHECK constraint
alter table public.campaigns
  drop constraint if exists campaigns_status_check;

-- Step 2: Add the expanded CHECK constraint with new statuses
alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('draft', 'generated', 'exported', 'generating', 'failed'));

-- Step 3: Add error_message column (nullable — only populated on failure)
alter table public.campaigns
  add column if not exists error_message text;

-- Step 4: Add generation_started_at timestamp for double-trigger prevention
-- Null means generation has not been claimed; set atomically when a generate
-- request begins processing. Requests where this is non-null and < 5 minutes
-- ago are rejected as duplicate triggers.
alter table public.campaigns
  add column if not exists generation_started_at timestamptz;
