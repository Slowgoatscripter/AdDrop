-- Add subscription tier column to profiles table
-- Defaults to 'free' for all new and existing users
ALTER TABLE public.profiles
  ADD COLUMN tier text NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'pro', 'enterprise'));
