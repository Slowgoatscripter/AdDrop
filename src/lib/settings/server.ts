import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { settingsDefaults } from './defaults';

// Use a direct Supabase client (no cookies/next-headers) so this works
// inside unstable_cache and during static generation. Settings have
// public-read RLS so the anon key is sufficient.
function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function fetchAllSettings(): Promise<Record<string, unknown>> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value');

  if (error) {
    console.error('Failed to fetch settings:', error.message);
    return {};
  }

  const overrides: Record<string, unknown> = {};
  for (const row of data || []) {
    overrides[row.key] = row.value;
  }
  return overrides;
}

const getCachedSettings = unstable_cache(
  fetchAllSettings,
  ['app-settings'],
  { revalidate: 60, tags: ['app-settings'] }
);

export async function getSettings(prefix?: string): Promise<Record<string, unknown>> {
  const overrides = await getCachedSettings();
  const merged = { ...settingsDefaults, ...overrides };

  if (!prefix) return merged;

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (key.startsWith(prefix)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export async function getSetting<T = unknown>(key: string): Promise<T> {
  const overrides = await getCachedSettings();
  const value = overrides[key] ?? settingsDefaults[key];
  return value as T;
}
