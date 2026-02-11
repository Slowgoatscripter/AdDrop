# Admin Settings Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tabbed admin settings page with AI, Compliance, and Landing Page controls — backed by a Supabase key-value table with defaults fallback and caching.

**Architecture:** Single `app_settings` table (key→jsonb). Server utility `getSettings()` merges DB overrides with code defaults, cached via `unstable_cache` + `revalidateTag`. Landing page fetches settings in `page.tsx` (server component) and passes props to children. AI/Compliance modules call `getSetting()` at generation time.

**Tech Stack:** Next.js 15 (App Router), Supabase (Postgres + RLS), Tailwind CSS, Lucide icons, TypeScript

---

## Phase 1: Foundation (Types, Defaults, Migration, Server Utility)

### Task 1: Create settings types

**Files:**
- Create: `src/lib/types/settings.ts`

**Step 1: Write the types file**

```ts
export const SETTING_KEYS = {
  // AI
  AI_MODEL: 'ai.model',
  AI_TEMPERATURE: 'ai.temperature',
  AI_MAX_TOKENS: 'ai.max_tokens',
  AI_QUALITY_MODEL: 'ai.quality_model',
  AI_QUALITY_TEMPERATURE: 'ai.quality_temperature',
  // Compliance
  COMPLIANCE_ENABLED: 'compliance.enabled',
  COMPLIANCE_STATE: 'compliance.state',
  COMPLIANCE_MAX_DESC_LENGTH: 'compliance.max_description_length',
  COMPLIANCE_CATEGORIES: 'compliance.categories',
  // Landing
  LANDING_HERO_TITLE_PREFIX: 'landing.hero_title_prefix',
  LANDING_HERO_TITLE_ACCENT: 'landing.hero_title_accent',
  LANDING_HERO_TAGLINE: 'landing.hero_tagline',
  LANDING_HERO_DESCRIPTION: 'landing.hero_description',
  LANDING_HERO_CTA: 'landing.hero_cta',
  LANDING_STATS: 'landing.stats',
  LANDING_FAQ: 'landing.faq',
  LANDING_CTA_HEADLINE: 'landing.cta_headline',
  LANDING_CTA_TEXT: 'landing.cta_text',
  LANDING_CTA_BETA: 'landing.cta_beta',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface AppSettingRow {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface LandingStat {
  value: string;
  label: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}
```

**Step 2: Commit**

```bash
git add src/lib/types/settings.ts
git commit -m "feat(settings): add settings types and key constants"
```

---

### Task 2: Create settings defaults

**Files:**
- Create: `src/lib/settings/defaults.ts`

**Step 1: Write the defaults file**

This file centralizes ALL hardcoded values that currently live scattered across the codebase. Each default matches the current production behavior.

```ts
import type { LandingStat, FAQItem } from '@/lib/types/settings';

export const settingsDefaults: Record<string, unknown> = {
  // AI Settings
  'ai.model': 'gpt-5.2',
  'ai.temperature': 0.7,
  'ai.max_tokens': 16000,
  'ai.quality_model': 'gpt-4o-mini',
  'ai.quality_temperature': 0.3,

  // Compliance Settings
  'compliance.enabled': true,
  'compliance.state': 'MT',
  'compliance.max_description_length': 1000,
  'compliance.categories': [
    'steering',
    'familial-status',
    'disability',
    'race-color-national-origin',
    'religion',
    'sex-gender',
    'age',
    'marital-status',
    'political-beliefs',
    'economic-exclusion',
    'misleading-claims',
  ],

  // Landing — Hero
  'landing.hero_title_prefix': 'Ad',
  'landing.hero_title_accent': 'Drop',
  'landing.hero_tagline': 'Your Listing. 12 Platforms. Zero Effort.',
  'landing.hero_description':
    'Enter your property details and get a complete ad campaign — Instagram, Facebook, Google, print, direct mail — in under 60 seconds.',
  'landing.hero_cta': 'Start Creating Ads',

  // Landing — Stats
  'landing.stats': [
    { value: '12+', label: 'Ad Platforms' },
    { value: '5', label: 'Tone Options' },
    { value: '100%', label: 'Compliance Checked' },
    { value: '<60s', label: 'Generation Time' },
  ] as LandingStat[],

  // Landing — FAQ
  'landing.faq': [
    {
      question: 'Is AdDrop really free?',
      answer:
        'Yes — AdDrop is completely free during our beta period. No account, no credit card, no catch. We want you to try it and tell us what you think.',
    },
    {
      question: 'What information do I need to get started?',
      answer:
        'Just your property address, a few photos, and basic details like beds, baths, and price. It takes about a minute to fill out — then AdDrop handles the rest.',
    },
    {
      question: 'How does the AI know what to write?',
      answer:
        "AdDrop's AI is trained specifically for real estate marketing. It understands platform best practices, character limits, tone variations, and fair housing compliance. It writes ads that sound like they came from a professional copywriter.",
    },
    {
      question: 'Is the ad copy compliant with fair housing laws?',
      answer:
        'AdDrop includes built-in compliance checking that automatically flags and corrects problematic language. Currently optimized for Montana MLS requirements, with more states coming soon.',
    },
    {
      question: 'Can I edit the generated ads?',
      answer:
        'Absolutely. Every ad is fully editable. Use the AI output as a starting point and customize it to match your voice and brand.',
    },
    {
      question: 'What platforms are supported?',
      answer:
        "Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print ads, direct mail postcards, magazine ads, and more. We're adding new platforms regularly.",
    },
  ] as FAQItem[],

  // Landing — CTA Footer
  'landing.cta_headline': 'Your Next Listing Deserves Better Marketing',
  'landing.cta_text': 'Create Your First Campaign',
  'landing.cta_beta': 'Free during beta. No account needed. Seriously.',
};
```

**Step 2: Commit**

```bash
git add src/lib/settings/defaults.ts
git commit -m "feat(settings): add centralized settings defaults"
```

---

### Task 3: Create Supabase migration

**Files:**
- Create: `supabase/migrations/20260209_create_app_settings.sql`

**Step 1: Write the migration**

```sql
-- Create app_settings key-value table
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Public reads (landing page + API routes need settings without auth)
CREATE POLICY "Anyone can read settings"
  ON app_settings FOR SELECT
  USING (true);

-- Admin-only writes
CREATE POLICY "Admins can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete settings"
  ON app_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260209_create_app_settings.sql
git commit -m "feat(settings): add app_settings migration with public read RLS"
```

---

### Task 4: Create settings server utility

**Files:**
- Create: `src/lib/settings/server.ts`

**Step 1: Write the server utility**

```ts
import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { settingsDefaults } from './defaults';

async function fetchAllSettings(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
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
```

**Step 2: Commit**

```bash
git add src/lib/settings/server.ts
git commit -m "feat(settings): add cached getSettings/getSetting server utility"
```

---

### Task 5: Create settings server actions

**Files:**
- Create: `src/app/admin/settings/actions.ts`

**Step 1: Write the server actions**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { settingsDefaults } from '@/lib/settings/defaults'

export async function loadSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, updated_at')
    .order('key')

  if (error) throw new Error(error.message)

  // Merge DB overrides with defaults
  const merged: Record<string, unknown> = { ...settingsDefaults }
  for (const row of data || []) {
    merged[row.key] = row.value
  }

  return merged
}

export async function saveSettings(entries: Record<string, unknown>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')

  // Batch upsert all entries
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }))

  const { error } = await supabase
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) throw new Error(error.message)

  // Bust cache and revalidate relevant paths
  revalidateTag('app-settings')
  revalidatePath('/admin/settings')
  revalidatePath('/')
}

export async function resetSettings(keys: string[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')

  const { error } = await supabase
    .from('app_settings')
    .delete()
    .in('key', keys)

  if (error) throw new Error(error.message)

  revalidateTag('app-settings')
  revalidatePath('/admin/settings')
  revalidatePath('/')
}
```

**Step 2: Commit**

```bash
git add src/app/admin/settings/actions.ts
git commit -m "feat(settings): add load/save/reset server actions"
```

---

## Phase 2: Admin UI (Tabs + 3 Forms)

### Task 6: Create settings tabs container

**Files:**
- Create: `src/components/admin/settings-tabs.tsx`

**Step 1: Write the tab container**

```tsx
'use client'

import { useState } from 'react'
import { Cpu, ShieldCheck, Layout } from 'lucide-react'
import { AISettingsForm } from './ai-settings-form'
import { ComplianceSettingsForm } from './compliance-settings-form'
import { LandingSettingsForm } from './landing-settings-form'

const tabs = [
  { id: 'ai', label: 'AI Settings', icon: Cpu },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'landing', label: 'Landing Page', icon: Layout },
] as const

type TabId = (typeof tabs)[number]['id']

interface SettingsTabsProps {
  settings: Record<string, unknown>
}

export function SettingsTabs({ settings }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ai')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'ai' && <AISettingsForm settings={settings} />}
      {activeTab === 'compliance' && <ComplianceSettingsForm settings={settings} />}
      {activeTab === 'landing' && <LandingSettingsForm settings={settings} />}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/settings-tabs.tsx
git commit -m "feat(settings): add settings tab container"
```

---

### Task 7: Create AI settings form

**Files:**
- Create: `src/components/admin/ai-settings-form.tsx`

**Step 1: Write the AI form**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { saveSettings, resetSettings } from '@/app/admin/settings/actions'

interface AISettingsFormProps {
  settings: Record<string, unknown>
}

export function AISettingsForm({ settings }: AISettingsFormProps) {
  const [model, setModel] = useState(settings['ai.model'] as string)
  const [temperature, setTemperature] = useState(settings['ai.temperature'] as number)
  const [maxTokens, setMaxTokens] = useState(settings['ai.max_tokens'] as number)
  const [qualityModel, setQualityModel] = useState(settings['ai.quality_model'] as string)
  const [qualityTemp, setQualityTemp] = useState(settings['ai.quality_temperature'] as number)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings({
          'ai.model': model,
          'ai.temperature': temperature,
          'ai.max_tokens': maxTokens,
          'ai.quality_model': qualityModel,
          'ai.quality_temperature': qualityTemp,
        })
        setMessage({ type: 'success', text: 'AI settings saved.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset all AI settings to defaults?')) return
    startTransition(async () => {
      try {
        await resetSettings([
          'ai.model', 'ai.temperature', 'ai.max_tokens',
          'ai.quality_model', 'ai.quality_temperature',
        ])
        // Reload page to get fresh defaults
        window.location.reload()
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' })
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'
  const hintClass = 'text-xs text-muted-foreground mt-1'

  return (
    <div className="space-y-6 max-w-xl">
      {/* Generation Model */}
      <div>
        <label className={labelClass}>Generation Model</label>
        <select className={inputClass} value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="gpt-5.2">GPT-5.2</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
        </select>
        <p className={hintClass}>The model used for generating ad copy.</p>
      </div>

      {/* Temperature */}
      <div>
        <label className={labelClass}>
          Temperature: <span className="text-gold">{temperature}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full accent-gold"
        />
        <p className={hintClass}>Higher = more creative. Lower = more consistent. Default: 0.7</p>
      </div>

      {/* Max Tokens */}
      <div>
        <label className={labelClass}>Max Tokens</label>
        <input
          className={inputClass}
          type="number"
          min={1000}
          max={32000}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
        />
        <p className={hintClass}>Maximum output length. Higher = longer ads. Default: 16000</p>
      </div>

      {/* Quality Model */}
      <div>
        <label className={labelClass}>Quality Scoring Model</label>
        <select className={inputClass} value={qualityModel} onChange={(e) => setQualityModel(e.target.value)}>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4o">GPT-4o</option>
        </select>
        <p className={hintClass}>Used for quality scoring and auto-fix. Cheaper model recommended.</p>
      </div>

      {/* Quality Temperature */}
      <div>
        <label className={labelClass}>
          Quality Temperature: <span className="text-gold">{qualityTemp}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1.0"
          step="0.1"
          value={qualityTemp}
          onChange={(e) => setQualityTemp(parseFloat(e.target.value))}
          className="w-full accent-gold"
        />
        <p className={hintClass}>Lower is better for quality analysis. Default: 0.3</p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save AI Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/ai-settings-form.tsx
git commit -m "feat(settings): add AI settings form"
```

---

### Task 8: Create compliance settings form

**Files:**
- Create: `src/components/admin/compliance-settings-form.tsx`

**Step 1: Write the compliance form**

Uses the exact `ViolationCategory` values from `src/lib/types/compliance.ts`.

```tsx
'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { saveSettings, resetSettings } from '@/app/admin/settings/actions'

const CATEGORIES = [
  { key: 'steering', label: 'Steering' },
  { key: 'familial-status', label: 'Familial Status' },
  { key: 'disability', label: 'Disability' },
  { key: 'race-color-national-origin', label: 'Race, Color & National Origin' },
  { key: 'religion', label: 'Religion' },
  { key: 'sex-gender', label: 'Sex & Gender' },
  { key: 'age', label: 'Age' },
  { key: 'marital-status', label: 'Marital Status' },
  { key: 'political-beliefs', label: 'Political Beliefs' },
  { key: 'economic-exclusion', label: 'Economic Exclusion' },
  { key: 'misleading-claims', label: 'Misleading Claims' },
] as const

interface ComplianceSettingsFormProps {
  settings: Record<string, unknown>
}

export function ComplianceSettingsForm({ settings }: ComplianceSettingsFormProps) {
  const [enabled, setEnabled] = useState(settings['compliance.enabled'] as boolean)
  const [state, setState] = useState(settings['compliance.state'] as string)
  const [maxDescLength, setMaxDescLength] = useState(settings['compliance.max_description_length'] as number)
  const [categories, setCategories] = useState<string[]>(settings['compliance.categories'] as string[])
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings({
          'compliance.enabled': enabled,
          'compliance.state': state,
          'compliance.max_description_length': maxDescLength,
          'compliance.categories': categories,
        })
        setMessage({ type: 'success', text: 'Compliance settings saved.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset all compliance settings to defaults?')) return
    startTransition(async () => {
      try {
        await resetSettings([
          'compliance.enabled', 'compliance.state',
          'compliance.max_description_length', 'compliance.categories',
        ])
        window.location.reload()
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' })
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'

  return (
    <div className="space-y-6 max-w-xl">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Enable Compliance Checking</p>
          <p className="text-xs text-muted-foreground">Scan generated ads for fair housing violations</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-gold' : 'bg-muted-foreground/30'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`} />
        </button>
      </div>

      {/* Warning when disabled */}
      {!enabled && (
        <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-400">
            Disabling compliance removes fair housing protection from all generated ads. Proceed with caution.
          </p>
        </div>
      )}

      {/* Rest of form - disabled when compliance is off */}
      <div className={!enabled ? 'opacity-40 pointer-events-none' : ''}>
        {/* State */}
        <div className="mb-6">
          <label className={labelClass}>State</label>
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="MT">Montana</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">More states coming soon.</p>
        </div>

        {/* Max Description Length */}
        <div className="mb-6">
          <label className={labelClass}>Max Description Length</label>
          <input
            className={inputClass}
            type="number"
            min={100}
            max={10000}
            value={maxDescLength}
            onChange={(e) => setMaxDescLength(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground mt-1">Character limit for MLS descriptions. Default: 1000</p>
        </div>

        {/* Category toggles */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Protected Categories</p>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const isActive = categories.includes(cat.key)
              return (
                <div key={cat.key} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                  <span className="text-sm text-foreground">{cat.label}</span>
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      isActive ? 'bg-gold' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Compliance Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/compliance-settings-form.tsx
git commit -m "feat(settings): add compliance settings form with category toggles"
```

---

### Task 9: Create landing page settings form

**Files:**
- Create: `src/components/admin/landing-settings-form.tsx`

**Step 1: Write the landing form**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Plus, Minus } from 'lucide-react'
import { saveSettings, resetSettings } from '@/app/admin/settings/actions'
import type { LandingStat, FAQItem } from '@/lib/types/settings'

interface LandingSettingsFormProps {
  settings: Record<string, unknown>
}

export function LandingSettingsForm({ settings }: LandingSettingsFormProps) {
  // Hero
  const [heroPrefix, setHeroPrefix] = useState(settings['landing.hero_title_prefix'] as string)
  const [heroAccent, setHeroAccent] = useState(settings['landing.hero_title_accent'] as string)
  const [heroTagline, setHeroTagline] = useState(settings['landing.hero_tagline'] as string)
  const [heroDesc, setHeroDesc] = useState(settings['landing.hero_description'] as string)
  const [heroCta, setHeroCta] = useState(settings['landing.hero_cta'] as string)

  // Stats
  const [stats, setStats] = useState<LandingStat[]>(settings['landing.stats'] as LandingStat[])

  // FAQ
  const [faqs, setFaqs] = useState<FAQItem[]>(settings['landing.faq'] as FAQItem[])

  // CTA Footer
  const [ctaHeadline, setCtaHeadline] = useState(settings['landing.cta_headline'] as string)
  const [ctaText, setCtaText] = useState(settings['landing.cta_text'] as string)
  const [ctaBeta, setCtaBeta] = useState(settings['landing.cta_beta'] as string)

  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function updateStat(index: number, field: keyof LandingStat, value: string) {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function updateFaq(index: number, field: keyof FAQItem, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { question: '', answer: '' }])
  }

  function removeFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSettings({
          'landing.hero_title_prefix': heroPrefix,
          'landing.hero_title_accent': heroAccent,
          'landing.hero_tagline': heroTagline,
          'landing.hero_description': heroDesc,
          'landing.hero_cta': heroCta,
          'landing.stats': stats,
          'landing.faq': faqs,
          'landing.cta_headline': ctaHeadline,
          'landing.cta_text': ctaText,
          'landing.cta_beta': ctaBeta,
        })
        setMessage({ type: 'success', text: 'Landing page settings saved.' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset all landing page settings to defaults?')) return
    startTransition(async () => {
      try {
        await resetSettings([
          'landing.hero_title_prefix', 'landing.hero_title_accent',
          'landing.hero_tagline', 'landing.hero_description', 'landing.hero_cta',
          'landing.stats', 'landing.faq',
          'landing.cta_headline', 'landing.cta_text', 'landing.cta_beta',
        ])
        window.location.reload()
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' })
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold'
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1'
  const sectionClass = 'text-sm font-medium text-foreground mb-4 pb-2 border-b border-border'

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Hero Section */}
      <div>
        <h3 className={sectionClass}>Hero Section</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Title Prefix</label>
              <input className={inputClass} value={heroPrefix} onChange={(e) => setHeroPrefix(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Title Accent (gradient text)</label>
              <input className={inputClass} value={heroAccent} onChange={(e) => setHeroAccent(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input className={inputClass} value={heroTagline} onChange={(e) => setHeroTagline(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea className={`${inputClass} min-h-[60px]`} value={heroDesc} onChange={(e) => setHeroDesc(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CTA Button Text</label>
            <input className={inputClass} value={heroCta} onChange={(e) => setHeroCta(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <h3 className={sectionClass}>Social Proof Stats (4 items)</h3>
        <div className="space-y-3">
          {stats.map((stat, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <label className={labelClass}>Value</label>
                <input className={inputClass} value={stat.value} onChange={(e) => updateStat(i, 'value', e.target.value)} placeholder="12+" />
              </div>
              <div>
                <label className={labelClass}>Label</label>
                <input className={inputClass} value={stat.label} onChange={(e) => updateStat(i, 'label', e.target.value)} placeholder="Ad Platforms" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">FAQ Items</h3>
          <button onClick={addFaq} className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <label className={labelClass}>Question</label>
                  <input className={inputClass} value={faq.question} onChange={(e) => updateFaq(i, 'question', e.target.value)} />
                </div>
                <button onClick={() => removeFaq(i)} className="p-1.5 text-muted-foreground hover:text-red-400 mt-4">
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <label className={labelClass}>Answer</label>
                <textarea className={`${inputClass} min-h-[60px]`} value={faq.answer} onChange={(e) => updateFaq(i, 'answer', e.target.value)} />
              </div>
            </div>
          ))}
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No FAQ items. Click &ldquo;Add Item&rdquo; to create one.</p>
          )}
        </div>
      </div>

      {/* CTA Footer Section */}
      <div>
        <h3 className={sectionClass}>Footer CTA</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Headline</label>
            <input className={inputClass} value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CTA Button Text</label>
            <input className={inputClass} value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Beta Notice</label>
            <input className={inputClass} value={ctaBeta} onChange={(e) => setCtaBeta(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Landing Page Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/landing-settings-form.tsx
git commit -m "feat(settings): add landing page settings form"
```

---

### Task 10: Wire up the settings page

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

**Step 1: Replace the placeholder page**

Replace the entire file contents with:

```tsx
import { SettingsTabs } from '@/components/admin/settings-tabs'
import { loadSettings } from './actions'

export default async function SettingsPage() {
  const settings = await loadSettings()

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>
      <SettingsTabs settings={settings} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat(settings): wire up settings page with tabs"
```

---

## Phase 3: Integration (AI, Compliance, Landing Page)

### Task 11: Integrate settings into AI generation

**Files:**
- Modify: `src/lib/ai/generate.ts`

**Step 1: Update generate.ts**

Add `getSetting` import and replace hardcoded values:

```diff
+ import { getSetting } from '@/lib/settings/server';

  export async function generateCampaign(listing: ListingData): Promise<CampaignKit> {
+   const model = await getSetting<string>('ai.model');
+   const temperature = await getSetting<number>('ai.temperature');
+   const maxTokens = await getSetting<number>('ai.max_tokens');
    const prompt = await buildGenerationPrompt(listing);

    const response = await openai.chat.completions.create({
-     model: 'gpt-5.2',
+     model,
      messages: [ ... ],
-     temperature: 0.7,
-     max_completion_tokens: 16000,
+     temperature,
+     max_completion_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });
```

**Step 2: Commit**

```bash
git add src/lib/ai/generate.ts
git commit -m "feat(settings): read AI model/temp/tokens from settings"
```

---

### Task 12: Integrate settings into quality scoring

**Files:**
- Modify: `src/lib/quality/scorer.ts`
- Modify: `src/lib/quality/auto-fix.ts`

**Step 1: Update scorer.ts**

Add `getSetting` import, read quality model/temp before the OpenAI call:

```diff
+ import { getSetting } from '@/lib/settings/server';

  // Inside the scoring function, before the OpenAI call:
+ const qualityModel = await getSetting<string>('ai.quality_model');
+ const qualityTemp = await getSetting<number>('ai.quality_temperature');

  const response = await openai.chat.completions.create({
-   model: 'gpt-4o-mini',
+   model: qualityModel,
    ...
-   temperature: 0.3,
+   temperature: qualityTemp,
  });
```

**Step 2: Update auto-fix.ts**

Same pattern — read quality model/temp from settings:

```diff
+ import { getSetting } from '@/lib/settings/server';

+ const qualityModel = await getSetting<string>('ai.quality_model');
+ const qualityTemp = await getSetting<number>('ai.quality_temperature');

  const response = await openai.chat.completions.create({
-   model: 'gpt-4o-mini',
+   model: qualityModel,
    ...
-   temperature: 0.3,
+   temperature: qualityTemp,
  });
```

**Step 3: Commit**

```bash
git add src/lib/quality/scorer.ts src/lib/quality/auto-fix.ts
git commit -m "feat(settings): read quality model/temp from settings"
```

---

### Task 13: Integrate settings into compliance engine

**Files:**
- Modify: `src/lib/compliance/engine.ts`

**Step 1: Update getDefaultCompliance to be settings-aware**

The key change: create a new async function that builds a filtered compliance config based on admin settings. The existing `getDefaultCompliance()` stays as a sync fallback for client code.

```diff
+ import { getSetting } from '@/lib/settings/server';

+ export async function getComplianceSettings(): Promise<{
+   enabled: boolean;
+   config: MLSComplianceConfig;
+ }> {
+   const enabled = await getSetting<boolean>('compliance.enabled');
+   const stateCode = await getSetting<string>('compliance.state');
+   const activeCategories = await getSetting<string[]>('compliance.categories');
+   const maxDescLength = await getSetting<number>('compliance.max_description_length');
+
+   const baseConfig = complianceConfigs[stateCode.toUpperCase()] ?? montanaCompliance;
+
+   // Filter prohibited terms to only active categories
+   const filteredConfig: MLSComplianceConfig = {
+     ...baseConfig,
+     maxDescriptionLength: maxDescLength,
+     prohibitedTerms: baseConfig.prohibitedTerms.filter(
+       (term) => activeCategories.includes(term.category)
+     ),
+   };
+
+   return { enabled, config: filteredConfig };
+ }
```

**Step 2: Update generate.ts to use compliance settings**

In `generate.ts`, replace:
```diff
- const compliance = getDefaultCompliance();
+ const { enabled: complianceEnabled, config: compliance } = await getComplianceSettings();
```

And wrap the compliance check:
```diff
- campaign.complianceResult = checkAllPlatforms(campaign, compliance);
+ if (complianceEnabled) {
+   campaign.complianceResult = checkAllPlatforms(campaign, compliance);
+ }
```

**Step 3: Update prompt.ts to use compliance settings**

```diff
- const compliance = getDefaultCompliance();
+ const { config: compliance } = await getComplianceSettings();
```

Note: `buildGenerationPrompt` needs to become async if it isn't already.

**Step 4: Commit**

```bash
git add src/lib/compliance/engine.ts src/lib/ai/generate.ts src/lib/ai/prompt.ts
git commit -m "feat(settings): integrate compliance settings with category filtering"
```

---

### Task 14: Update landing page data flow

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/landing/hero.tsx`
- Modify: `src/components/landing/social-proof.tsx`
- Modify: `src/components/landing/faq.tsx`
- Modify: `src/components/landing/cta-footer.tsx`

**Step 1: Update page.tsx to fetch settings**

```tsx
import { getSettings } from '@/lib/settings/server';
import type { LandingStat, FAQItem } from '@/lib/types/settings';
// ... existing imports ...

export default async function Home() {
  const s = await getSettings('landing');

  return (
    <main className="min-h-screen">
      <Hero
        titlePrefix={s['landing.hero_title_prefix'] as string}
        titleAccent={s['landing.hero_title_accent'] as string}
        tagline={s['landing.hero_tagline'] as string}
        description={s['landing.hero_description'] as string}
        ctaText={s['landing.hero_cta'] as string}
      />
      <PlatformBar />
      <HowItWorks />
      <ShowcaseCarousel />
      <SocialProof stats={s['landing.stats'] as LandingStat[]} />
      <FeaturesGrid />
      <WhoItsFor />
      <FAQ faqs={s['landing.faq'] as FAQItem[]} />
      <CTAFooter
        headline={s['landing.cta_headline'] as string}
        ctaText={s['landing.cta_text'] as string}
        betaNotice={s['landing.cta_beta'] as string}
      />
      <MobileCTABar />
    </main>
  );
}
```

**Step 2: Update Hero to accept props**

Add props interface, use props instead of hardcoded text:

```diff
- export function Hero() {
+ interface HeroProps {
+   titlePrefix?: string;
+   titleAccent?: string;
+   tagline?: string;
+   description?: string;
+   ctaText?: string;
+ }
+
+ export function Hero({
+   titlePrefix = 'Ad',
+   titleAccent = 'Drop',
+   tagline = 'Your Listing. 12 Platforms. Zero Effort.',
+   description = 'Enter your property details and get a complete ad campaign — Instagram, Facebook, Google, print, direct mail — in under 60 seconds.',
+   ctaText = 'Start Creating Ads',
+ }: HeroProps) {

  // In the JSX, replace hardcoded text:
- Ad
+ {titlePrefix}

- Drop
+ {titleAccent}

- Your Listing. 12 Platforms. Zero Effort.
+ {tagline}

- Enter your property details ...
+ {description}

- Start Creating Ads
+ {ctaText}
```

**Step 3: Update SocialProof to accept props**

```diff
+ import type { LandingStat } from '@/lib/types/settings';

- const stats = [
+ const defaultStats = [
    { icon: Globe, value: '12+', label: 'Ad Platforms' },
    ...
  ];

- export function SocialProof() {
+ const ICONS = [Globe, FileText, ShieldCheck, Zap];
+
+ interface SocialProofProps {
+   stats?: LandingStat[];
+ }
+
+ export function SocialProof({ stats }: SocialProofProps) {
+   const displayStats = (stats || defaultStats).map((s, i) => ({
+     ...s,
+     icon: ICONS[i] || Zap,
+   }));

  // Use displayStats instead of stats in the map
```

**Step 4: Update FAQ to accept props**

```diff
+ import type { FAQItem } from '@/lib/types/settings';

- const faqs = [
+ const defaultFaqs: FAQItem[] = [
    ...
  ];

- export function FAQ() {
+ interface FAQProps {
+   faqs?: FAQItem[];
+ }
+
+ export function FAQ({ faqs = defaultFaqs }: FAQProps) {
```

**Step 5: Update CTAFooter to accept props**

```diff
- export function CTAFooter() {
+ interface CTAFooterProps {
+   headline?: string;
+   ctaText?: string;
+   betaNotice?: string;
+ }
+
+ export function CTAFooter({
+   headline = 'Your Next Listing Deserves Better Marketing',
+   ctaText = 'Create Your First Campaign',
+   betaNotice = 'Free during beta. No account needed. Seriously.',
+ }: CTAFooterProps) {

  // Replace hardcoded text with props in JSX
```

**Step 6: Commit**

```bash
git add src/app/page.tsx src/components/landing/hero.tsx src/components/landing/social-proof.tsx src/components/landing/faq.tsx src/components/landing/cta-footer.tsx
git commit -m "feat(settings): pass landing page settings as props from server"
```

---

## Phase 4: Verification

### Task 15: Build verification

**Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 2: Smoke test checklist**

1. Navigate to `/admin/settings`
2. Verify 3 tabs render (AI, Compliance, Landing Page)
3. AI tab: change temperature slider → Save → verify success message
4. Compliance tab: toggle off compliance → verify warning appears
5. Landing tab: change hero tagline → Save → navigate to `/` → verify new text shows
6. Reset to Defaults → verify original text restored
7. Test bench: generate a campaign → verify it uses settings values

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): admin settings page complete"
```

---

## Task Summary

| # | Task | Files | Phase |
|---|------|-------|-------|
| 1 | Settings types | 1 new | Foundation |
| 2 | Settings defaults | 1 new | Foundation |
| 3 | Supabase migration | 1 new | Foundation |
| 4 | Settings server utility | 1 new | Foundation |
| 5 | Settings server actions | 1 new | Foundation |
| 6 | Settings tabs container | 1 new | Admin UI |
| 7 | AI settings form | 1 new | Admin UI |
| 8 | Compliance settings form | 1 new | Admin UI |
| 9 | Landing settings form | 1 new | Admin UI |
| 10 | Wire up settings page | 1 modify | Admin UI |
| 11 | AI generation integration | 1 modify | Integration |
| 12 | Quality scoring integration | 2 modify | Integration |
| 13 | Compliance engine integration | 3 modify | Integration |
| 14 | Landing page data flow | 5 modify | Integration |
| 15 | Build verification | — | Verification |
