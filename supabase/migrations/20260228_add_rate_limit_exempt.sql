-- Add rate_limit_exempt flag to profiles table.
-- When true, the per-request rate limiter skips enforcement for the user.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rate_limit_exempt boolean NOT NULL DEFAULT false;
