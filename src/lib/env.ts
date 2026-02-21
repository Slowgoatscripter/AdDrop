/**
 * Environment variable validation module.
 *
 * Validates required environment variables at module load time and throws a
 * descriptive error immediately if any are missing, rather than failing silently
 * at the call site with a non-obvious undefined value.
 *
 * Usage: import { env } from '@/lib/env' then use env.VARIABLE_NAME
 * instead of process.env.VARIABLE_NAME for required variables.
 *
 * Optional variables (SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, RESEND_API_KEY,
 * RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_TURNSTILE_SITE_KEY,
 * APP_URL) are not listed here because they are guarded at the call site or
 * have safe fallbacks.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  // Supabase — used by every client, server, and middleware helper
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // OpenAI — required for all AI generation routes
  OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),

  // Upstash Redis — required for rate limiting
  UPSTASH_REDIS_REST_URL: requireEnv('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
} as const;
