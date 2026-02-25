# adDrop Full-Site Rebrand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-envision the entire adDrop site around "drop" branding — midnight ink color palette, liquid gold accents, deep teal secondary, droplet shapes, ripple interactions, water caustics, and the "drop" identity across every page.

**Architecture:** Token-first approach. Phase 1 migrates CSS variables and Tailwind config, transforming the entire app in one pass. Phase 2 builds reusable brand components (RippleButton, DropletSpinner, LiquidProgress, CausticsOverlay, DropletShape). Phase 3+ applies these to specific pages, from highest-impact (landing, auth) to lowest (admin, legal). All animations use Framer Motion (already installed). All components use existing shadcn/ui patterns.

**Tech Stack:** Next.js 15 (App Router), React 18, Tailwind CSS v3, Framer Motion, shadcn/ui (Radix + CVA), Supabase, TypeScript

---

## Phase 1: Design Tokens & Global CSS

### Task 1: Migrate Color Variables in globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace all CSS custom properties in the `:root` block**

Replace the existing `:root` variables with the new midnight ink palette:

```css
:root {
    --background: 220 25% 6%;
    --foreground: 40 20% 96%;
    --card: 220 20% 10%;
    --card-foreground: 40 20% 96%;
    --popover: 220 22% 8%;
    --popover-foreground: 40 20% 96%;
    --primary: 42 95% 55%;
    --primary-foreground: 220 25% 6%;
    --secondary: 220 20% 14%;
    --secondary-foreground: 40 20% 96%;
    --muted: 220 12% 18%;
    --muted-foreground: 220 10% 50%;
    --accent: 42 95% 55%;
    --accent-foreground: 220 25% 6%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 220 15% 15%;
    --input: 220 15% 15%;
    --ring: 42 95% 55%;
    --gold: 42 95% 55%;
    --gold-muted: 42 75% 32%;
    --gold-light: 45 90% 70%;
    --gold-bright: 43 96% 62%;
    --cream: 40 20% 94%;
    --sage: 160 20% 55%;
    --teal: 185 60% 30%;
    --teal-light: 185 40% 45%;
    --teal-muted: 185 30% 20%;
    --surface: 220 18% 12%;
    --surface-hover: 220 15% 16%;
    --chart-1: 43 96% 56%;
    --chart-2: 185 58% 39%;
    --chart-3: 220 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 185 40% 45%;
    --radius: 0.75rem;
}
```

Key changes from current:
- All `30 x% y%` warm brown backgrounds → `220 x% y%` cool midnight ink
- `--gold` hue shifts from 38 → 42 (warmer amber)
- New `--teal`, `--teal-light`, `--teal-muted` tokens added
- `--radius` bumped from `0.5rem` to `0.75rem` (12px, softer cards/inputs)
- Chart colors updated to use teal instead of the old warm secondaries

**Step 2: Verify the app renders correctly**

Run: `npm run build`
Expected: Build succeeds. Every page now has the cool midnight ink background instead of warm brown.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(rebrand): migrate color tokens to midnight ink palette"
```

---

### Task 2: Add Water Caustics Overlay (Replace Grain Texture)

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the `.noise-overlay::after` block**

Replace the existing grain texture with a water caustics effect:

```css
.noise-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.025;
  background:
    radial-gradient(ellipse at 20% 50%, hsl(185 60% 30% / 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, hsl(42 95% 55% / 0.08) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 80%, hsl(185 40% 45% / 0.1) 0%, transparent 45%);
  animation: caustics 20s ease-in-out infinite alternate;
}

@keyframes caustics {
  0% {
    background:
      radial-gradient(ellipse at 20% 50%, hsl(185 60% 30% / 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 20%, hsl(42 95% 55% / 0.08) 0%, transparent 40%),
      radial-gradient(ellipse at 50% 80%, hsl(185 40% 45% / 0.1) 0%, transparent 45%);
  }
  33% {
    background:
      radial-gradient(ellipse at 40% 30%, hsl(185 60% 30% / 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 60% 60%, hsl(42 95% 55% / 0.1) 0%, transparent 40%),
      radial-gradient(ellipse at 30% 70%, hsl(185 40% 45% / 0.08) 0%, transparent 45%);
  }
  66% {
    background:
      radial-gradient(ellipse at 60% 40%, hsl(185 60% 30% / 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 30% 80%, hsl(42 95% 55% / 0.12) 0%, transparent 40%),
      radial-gradient(ellipse at 70% 30%, hsl(185 40% 45% / 0.15) 0%, transparent 45%);
  }
  100% {
    background:
      radial-gradient(ellipse at 50% 60%, hsl(185 60% 30% / 0.13) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 40%, hsl(42 95% 55% / 0.09) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 70%, hsl(185 40% 45% / 0.11) 0%, transparent 45%);
  }
}
```

This creates slowly drifting light-refraction patterns in teal and gold — like light through water. Very subtle (0.025 opacity) so it doesn't distract but adds depth.

**Step 2: Verify in browser**

Run: `npm run dev`
Expected: Very subtle shifting light patterns visible on the background. Not distracting. Performance smooth at 60fps.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(rebrand): replace grain texture with water caustics overlay"
```

---

### Task 3: Add New Tailwind Tokens & Update Border Radius

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Add teal color tokens and update border radius**

In the `colors` section of `theme.extend`, add:

```ts
teal: {
  DEFAULT: 'hsl(var(--teal))',
  light: 'hsl(var(--teal-light))',
  muted: 'hsl(var(--teal-muted))',
},
```

Update the `borderRadius` section:

```ts
borderRadius: {
  '2xl': '1rem',
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
},
```

Add new keyframes:

```ts
keyframes: {
  marquee: {
    '0%': { transform: 'translateX(0%)' },
    '100%': { transform: 'translateX(-100%)' },
  },
  'pulse-gold': {
    '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--gold) / 0.5)' },
    '50%': { boxShadow: '0 0 0 10px hsl(var(--gold) / 0)' },
  },
  'droplet-bounce': {
    '0%, 100%': { transform: 'translateY(0) scaleX(1) scaleY(1)' },
    '50%': { transform: 'translateY(-8px) scaleX(0.95) scaleY(1.05)' },
  },
  ripple: {
    '0%': { transform: 'scale(0)', opacity: '0.6' },
    '100%': { transform: 'scale(4)', opacity: '0' },
  },
},
animation: {
  marquee: 'marquee 30s linear infinite',
  'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
  'droplet-bounce': 'droplet-bounce 1.2s ease-in-out infinite',
  ripple: 'ripple 0.6s ease-out forwards',
},
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. New `teal`, `teal-light`, `teal-muted` classes available. New `rounded-2xl`, `animate-droplet-bounce`, `animate-ripple` classes available.

**Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(rebrand): add teal tokens, droplet/ripple animations, update border radius"
```

---

### Task 4: Add Droplet Shape CSS Utility

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add droplet utilities in the `@layer utilities` block**

```css
@layer utilities {
  .droplet-shape {
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  }
  .droplet-shape-sm {
    border-radius: 50% 50% 50% 50% / 58% 58% 42% 42%;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(rebrand): add droplet shape CSS utilities"
```

---

## Phase 2: Global Brand Components

### Task 5: Create RippleButton Component

**Files:**
- Create: `src/components/ui/ripple-button.tsx`

**Step 1: Create the RippleButton**

This wraps the existing `Button` component with a ripple effect on click. The ripple emanates from the click point as concentric gold rings.

```tsx
'use client'

import * as React from 'react'
import { Button, type ButtonProps } from './button'
import { cn } from '@/lib/utils'

export const RippleButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = Date.now()
      setRipples((prev) => [...prev, { x, y, id }])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
      onClick?.(e)
    }

    return (
      <Button
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        onClick={handleClick}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute w-4 h-4 rounded-full bg-gold-light/30 animate-ripple pointer-events-none"
            style={{ left: ripple.x - 8, top: ripple.y - 8 }}
          />
        ))}
        {children}
      </Button>
    )
  }
)
RippleButton.displayName = 'RippleButton'
```

**Step 2: Commit**

```bash
git add src/components/ui/ripple-button.tsx
git commit -m "feat(rebrand): add RippleButton component with click ripple effect"
```

---

### Task 6: Update Button Component — Pill Shape Default

**Files:**
- Modify: `src/components/ui/button.tsx`

**Step 1: Change the base class from `rounded-md` to `rounded-full`**

In the `buttonVariants` cva call, change the base string:
- Replace: `rounded-md` with `rounded-full`

Also update the `size` variants to remove `rounded-md`:
- `sm`: change `"h-8 rounded-md px-3 text-xs"` to `"h-8 px-3 text-xs"`
- `lg`: change `"h-10 rounded-md px-8"` to `"h-10 px-8"`

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. All buttons across the app are now pill-shaped.

**Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(rebrand): make all buttons pill-shaped (rounded-full)"
```

---

### Task 7: Create DropletSpinner Component

**Files:**
- Create: `src/components/ui/droplet-spinner.tsx`

**Step 1: Create the loading spinner**

Replaces generic spinners with a bouncing gold droplet:

```tsx
import { cn } from '@/lib/utils'

interface DropletSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = {
  sm: 'w-4 h-5',
  md: 'w-6 h-7',
  lg: 'w-8 h-10',
}

export function DropletSpinner({ className, size = 'md', label }: DropletSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'droplet-shape bg-gradient-to-b from-gold-light to-gold animate-droplet-bounce',
          sizes[size]
        )}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/droplet-spinner.tsx
git commit -m "feat(rebrand): add DropletSpinner loading component"
```

---

### Task 8: Create LiquidProgress Component

**Files:**
- Create: `src/components/ui/liquid-progress.tsx`

**Step 1: Create the liquid fill progress bar**

A progress bar where the filled portion has a subtle wave animation at the surface edge:

```tsx
'use client'

import { cn } from '@/lib/utils'

interface LiquidProgressProps {
  value: number // 0-100
  className?: string
  variant?: 'gold' | 'teal' | 'auto'
}

export function LiquidProgress({ value, className, variant = 'auto' }: LiquidProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))

  const barColor =
    variant === 'auto'
      ? clamped >= 90
        ? 'bg-destructive'
        : clamped >= 75
          ? 'bg-amber-500'
          : 'bg-gold'
      : variant === 'teal'
        ? 'bg-teal'
        : 'bg-gold'

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
        style={{ width: `${clamped}%` }}
      />
      {/* Wave surface effect at the fill edge */}
      {clamped > 5 && clamped < 100 && (
        <div
          className="absolute top-0 h-full w-3 opacity-60"
          style={{ left: `calc(${clamped}% - 6px)` }}
        >
          <div className={cn('h-full w-full rounded-full blur-sm', barColor)} />
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/liquid-progress.tsx
git commit -m "feat(rebrand): add LiquidProgress bar component"
```

---

### Task 9: Create DropletIcon Brand Mark Component

**Files:**
- Create: `src/components/ui/droplet-icon.tsx`

**Step 1: Create the brand mark droplet SVG**

Used in header, footer, empty states, and as a favicon source:

```tsx
import { cn } from '@/lib/utils'

interface DropletIconProps {
  className?: string
  size?: number
  glow?: boolean
}

export function DropletIcon({ className, size = 20, glow = false }: DropletIconProps) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 20 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(glow && 'drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)]', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="droplet-gradient" x1="10" y1="0" x2="10" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--gold-light))" />
          <stop offset="100%" stopColor="hsl(var(--gold))" />
        </linearGradient>
      </defs>
      <path
        d="M10 0C10 0 0 12 0 17C0 22.5228 4.47715 26 10 26C15.5228 26 20 22.5228 20 17C20 12 10 0 10 0Z"
        fill="url(#droplet-gradient)"
      />
      {/* Highlight reflection */}
      <ellipse cx="7" cy="15" rx="2.5" ry="3.5" fill="hsl(var(--gold-light))" opacity="0.3" />
    </svg>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/droplet-icon.tsx
git commit -m "feat(rebrand): add DropletIcon brand mark SVG component"
```

---

## Phase 3: Navigation Updates

### Task 10: Update AppHeader with Brand Mark & Teal Accents

**Files:**
- Modify: `src/components/nav/app-header.tsx`

**Step 1: Import DropletIcon**

Add import: `import { DropletIcon } from '@/components/ui/droplet-icon'`

**Step 2: Update the logo rendering in ALL variants**

Find every occurrence of the logo pattern (appears 2 times — auth variant and main variants):

```tsx
<span className="text-xl font-bold text-foreground">Ad</span>
<span className="text-xl font-bold italic text-gold font-serif">Drop</span>
```

Replace with:

```tsx
<span className="text-xl font-bold text-foreground">Ad</span>
<span className="text-xl font-bold italic text-gold font-serif">Drop</span>
<DropletIcon size={8} className="ml-0.5 -mb-0.5 opacity-80" />
```

**Step 3: Update landing variant glass effect**

Change the scrolled state from warm to cool:

Replace:
```
'bg-background/80 backdrop-blur-lg border-b border-gold/10'
```
With:
```
'bg-card/70 backdrop-blur-xl border-b border-teal/10'
```

**Step 4: Update active nav link underline**

No change needed — the gold underline already works with the new palette.

**Step 5: Verify in browser and commit**

Run: `npm run dev`
Check: Logo shows tiny droplet mark. Landing header has cooler glass effect on scroll.

```bash
git add src/components/nav/app-header.tsx
git commit -m "feat(rebrand): add droplet brand mark to header, update glass effect"
```

---

### Task 11: Update Footer with Brand Mark & Teal Links

**Files:**
- Modify: `src/components/nav/footer.tsx`

**Step 1: Add DropletIcon and update styling**

```tsx
import Link from 'next/link'
import { DropletIcon } from '@/components/ui/droplet-icon'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4 text-xs text-muted-foreground">
        <DropletIcon size={12} className="opacity-40" />
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-teal-light transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-teal-light transition-colors">Privacy</Link>
          <Link href="/cookies" className="hover:text-teal-light transition-colors">Cookies</Link>
          <Link href="/disclaimer" className="hover:text-teal-light transition-colors">Disclaimer</Link>
        </nav>
        <p>&copy; {currentYear} AdDrop. All rights reserved.</p>
      </div>
    </footer>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/nav/footer.tsx
git commit -m "feat(rebrand): add droplet to footer, teal hover on legal links"
```

---

### Task 12: Update Badge Component with Droplet Variant

**Files:**
- Modify: `src/components/ui/badge.tsx`

**Step 1: Add a `droplet` variant**

Add to the variants object:

```ts
droplet:
  "droplet-shape-sm bg-gold/15 text-gold border-transparent",
```

**Step 2: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat(rebrand): add droplet-shaped badge variant"
```

---

## Phase 4: Auth Pages

### Task 13: Update Login Page with Glass Card & Caustic Background

**Files:**
- Modify: `src/app/login/page.tsx`

**Step 1: Add glass card wrapper around the form**

Find the outer container for the form (the `w-full max-w-sm` wrapper) and wrap the content in a glass card:

Change the form container from bare content to:
```tsx
<div className="w-full max-w-sm bg-card/50 backdrop-blur-xl border border-border/30 rounded-2xl p-8">
```

**Step 2: Update the page icon**

Find the "AdDrop" heading area and wrap the icon (if any Lucide icon like `LogIn` is decorative) in a droplet frame:
```tsx
<div className="w-14 h-14 mx-auto mb-4 droplet-shape bg-gold/10 border border-gold/20 flex items-center justify-center">
  <LogIn className="w-6 h-6 text-gold" />
</div>
```

**Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(rebrand): add glass card and droplet icon frame to login"
```

---

### Task 14: Update Signup, Forgot Password, Reset Password, MFA Pages

**Files:**
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/forgot-password/page.tsx`
- Modify: `src/app/reset-password/page.tsx`
- Modify: `src/app/mfa-challenge/page.tsx`

**Step 1: Apply the same glass card pattern to each auth page**

For each page, wrap the form container in:
```tsx
<div className="w-full max-w-sm bg-card/50 backdrop-blur-xl border border-border/30 rounded-2xl p-8">
```

**Step 2: Wrap each page's icon in the droplet frame**

For each icon (KeyRound, Mail, Shield, ShieldCheck, Lock):
```tsx
<div className="w-14 h-14 mx-auto mb-4 droplet-shape bg-gold/10 border border-gold/20 flex items-center justify-center">
  <IconName className="w-6 h-6 text-gold" />
</div>
```

**Step 3: Commit**

```bash
git add src/app/signup/page.tsx src/app/forgot-password/page.tsx src/app/reset-password/page.tsx src/app/mfa-challenge/page.tsx
git commit -m "feat(rebrand): apply glass card and droplet frames to all auth pages"
```

---

## Phase 5: Dashboard & App Pages

### Task 15: Update Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Update the "Create New Campaign" CTA**

Find the create campaign button/link. Change its text to "Drop a New Campaign" and ensure it uses the pill button style. Replace the `Plus` icon import with `Droplets` from lucide-react (or keep Plus if Droplets isn't available — check lucide docs).

**Step 2: Update empty state styling**

Find the empty state div (border-dashed box). Replace with:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <DropletSpinner size="lg" />
  <p className="mt-4 text-muted-foreground">No campaigns yet. Ready to make your first drop?</p>
  <Link href="/create" className="mt-4">
    <RippleButton>Drop Your First Campaign</RippleButton>
  </Link>
</div>
```

Import `DropletSpinner` and `RippleButton` at the top. Note: if the dashboard is a server component, use the standard Button for the CTA and add the RippleButton in a client wrapper.

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(rebrand): update dashboard CTAs and empty states with drop branding"
```

---

### Task 16: Update Campaign Card Hover Effects

**Files:**
- Find and modify the campaign card component (likely in `src/components/dashboard/` or `src/components/campaign/`)

**Step 1: Locate the campaign grid card component**

Search for the component rendering campaign cards in the dashboard grid. Add hover styling:
```tsx
className="... rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/20 hover:shadow-lg hover:shadow-teal/5"
```

**Step 2: Commit**

```bash
git add [campaign-card-file]
git commit -m "feat(rebrand): add liquid hover effect to campaign cards"
```

---

### Task 17: Update Campaign Generating View

**Files:**
- Modify: `src/components/campaign/campaign-generating-view.tsx`

**Step 1: Replace or enhance the loading animation**

Import `DropletSpinner` and use it as the primary loading indicator. If there's existing progress text, keep it but add the droplet:

```tsx
<div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
  <DropletSpinner size="lg" label={progressMessage || 'Crafting your campaign...'} />
</div>
```

**Step 2: Commit**

```bash
git add src/components/campaign/campaign-generating-view.tsx
git commit -m "feat(rebrand): use droplet spinner in campaign generating view"
```

---

### Task 18: Update Campaign Viewer Tabs

**Files:**
- Modify the CampaignTabs component (find exact location)

**Step 1: Update tab active indicator**

If the tabs use a custom active indicator, change it to use a small gold droplet dot below the active tab instead of a standard underline:

```tsx
{active && (
  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2.5 droplet-shape bg-gold" />
)}
```

**Step 2: Commit**

```bash
git add [campaign-tabs-file]
git commit -m "feat(rebrand): use droplet indicator on campaign tabs"
```

---

### Task 19: Update Create Campaign Page

**Files:**
- Modify: `src/app/create/page.tsx`

**Step 1: Update page heading and CTA copy**

Change "Create Your Campaign" to "Create Your Campaign" (keep it — "Pour In Your Property" is too forced for an app page).

Update the usage badge styling to use the droplet badge variant if applicable.

Ensure the back link uses teal color:
```tsx
className="text-teal-light hover:text-teal transition-colors"
```

**Step 2: Commit**

```bash
git add src/app/create/page.tsx
git commit -m "feat(rebrand): update create page with teal accents"
```

---

## Phase 6: Shared Campaign & Pricing

### Task 20: Update Shared Campaign Page

**Files:**
- Modify: `src/app/share/[token]/page.tsx`

**Step 1: Update the "Generated by AdDrop" footer**

Replace the simple text link with a branded footer:
```tsx
<footer className="border-t border-border/30 py-8 flex flex-col items-center gap-2">
  <DropletIcon size={14} glow />
  <p className="text-sm text-muted-foreground">
    Made with{' '}
    <a href="https://addrop.app" className="text-gold hover:text-gold-light transition-colors font-medium">
      adDrop
    </a>
  </p>
  <a
    href="https://addrop.app/signup"
    className="mt-2 text-xs text-teal-light hover:text-teal transition-colors"
  >
    Create your own campaigns — free
  </a>
</footer>
```

**Step 2: Update the expired view**

Change the expired state heading to "This drop has evaporated" with a muted droplet icon (outline style):
```tsx
<div className="flex flex-col items-center gap-4 text-center">
  <div className="w-16 h-16 droplet-shape border-2 border-muted-foreground/30 flex items-center justify-center">
    <Droplets className="w-8 h-8 text-muted-foreground/50" />
  </div>
  <h1 className="text-2xl font-serif text-foreground">This drop has evaporated</h1>
  <p className="text-muted-foreground max-w-md">Shared campaigns expire after their set duration.</p>
  <a href="https://addrop.app" className="mt-4">
    <Button variant="outline">Visit adDrop</Button>
  </a>
</div>
```

**Step 3: Commit**

```bash
git add src/app/share/[token]/page.tsx
git commit -m "feat(rebrand): brand shared campaign footer and expired state"
```

---

### Task 21: Update Pricing Page

**Files:**
- Modify: `src/app/pricing/page.tsx`
- Modify the PricingTable/PlanCard component (find exact location)

**Step 1: Add AppHeader to pricing page**

The pricing page currently has no header. Add `AppHeader variant="landing"` at the top.

**Step 2: Update page heading**

Change to Fraunces serif: `className="font-serif text-4xl md:text-5xl text-cream"` (likely already this). Update subtitle.

**Step 3: Update plan card styling**

Ensure cards use `rounded-2xl`. The highlighted Pro card should have:
```tsx
className="border-gold/40 bg-gold/5 shadow-lg shadow-gold/5 rounded-2xl"
```

**Step 4: Change feature checkmarks to droplet bullets**

Where the plan cards list features with checkmarks, replace the check icon with:
```tsx
<span className="w-2 h-2.5 droplet-shape bg-gold inline-block mr-2 shrink-0" />
```

**Step 5: Commit**

```bash
git add src/app/pricing/page.tsx [plan-card-file]
git commit -m "feat(rebrand): update pricing with header, rounded cards, droplet bullets"
```

---

## Phase 7: Settings & Admin

### Task 22: Update Settings Pages

**Files:**
- Modify: `src/app/settings/layout.tsx` or `src/components/settings/settings-nav.tsx`
- Modify: `src/app/settings/billing/page.tsx`

**Step 1: Update settings nav active state**

Find the active link styling. Change from `bg-gold/10 text-gold` to:
```tsx
className={active ? 'bg-teal-muted/50 text-gold pl-4 border-l-2 border-l-gold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
```

**Step 2: Update billing progress bar**

If there's a usage progress bar on the billing page, replace it with the `LiquidProgress` component:
```tsx
<LiquidProgress value={usagePercent} variant="auto" />
```

**Step 3: Update tier badge styling**

Use the droplet badge for tier indicators:
- Free: `<Badge variant="secondary">Free</Badge>`
- Pro: `<Badge variant="droplet">Pro</Badge>`
- Enterprise: `<Badge className="droplet-shape-sm bg-teal/15 text-teal-light border-transparent">Enterprise</Badge>`

**Step 4: Commit**

```bash
git add src/app/settings/ src/components/settings/
git commit -m "feat(rebrand): update settings nav, billing progress, tier badges"
```

---

### Task 23: Update Admin Sidebar & Dashboard

**Files:**
- Modify: Admin sidebar component (find exact location)
- Modify: `src/app/admin/page.tsx`

**Step 1: Update sidebar styling**

Change sidebar background:
```tsx
className="... bg-card/80 backdrop-blur-sm border-r border-border"
```

Add the DropletIcon brand mark next to the "AdDrop" text in the sidebar header:
```tsx
<DropletIcon size={8} className="ml-0.5 opacity-80" />
```

Update active nav item:
```tsx
className={active ? 'bg-teal-muted/50 text-gold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
```

**Step 2: Update admin stat cards**

If stat cards have icons, wrap each icon in a teal-tinted droplet frame:
```tsx
<div className="w-10 h-10 droplet-shape bg-teal-muted/50 flex items-center justify-center">
  <IconName className="w-5 h-5 text-teal-light" />
</div>
```

Update cards to use `rounded-2xl`.

**Step 3: Update the "Coming soon" placeholder**

Replace with branded empty state:
```tsx
<div className="rounded-2xl border border-dashed border-border p-12 flex flex-col items-center gap-3 text-center">
  <DropletSpinner size="sm" />
  <p className="text-sm text-muted-foreground">Coming soon</p>
</div>
```

**Step 4: Commit**

```bash
git add src/app/admin/ src/components/admin/
git commit -m "feat(rebrand): update admin sidebar and dashboard with drop branding"
```

---

## Phase 8: Landing Page Sections

### Task 24: Update Hero Section

**Files:**
- Modify: `src/components/landing/hero.tsx`

**Step 1: Update background treatment**

Replace the Unsplash background image + warm gradient with the midnight ink base. Keep a subtle gradient but shift to cool tones:
```tsx
<div className="absolute inset-0 bg-gradient-to-b from-background via-background to-teal-muted/10" />
```

Replace the animated gold glow blob with a centered droplet animation — a large golden droplet that pulses with `animate-pulse-gold`.

**Step 2: Update copy**

Change the CTA button text to "Drop Your First Ad" (passed as prop from page.tsx — update the prop value there).

Ensure CTA uses `RippleButton` (or the existing button with `rounded-full`):
```tsx
<Link href="/signup">
  <RippleButton size="lg" variant="outline" className="border-2 border-gold text-gold hover:bg-gold hover:text-background uppercase tracking-widest px-8">
    {ctaText}
  </RippleButton>
</Link>
```

**Step 3: Commit**

```bash
git add src/components/landing/hero.tsx src/app/page.tsx
git commit -m "feat(rebrand): update hero with midnight gradient, droplet animation, new CTA"
```

---

### Task 25: Update PlatformBar

**Files:**
- Modify: `src/components/landing/platform-bar.tsx`

**Step 1: Add a subtle teal tint to the section background**

```tsx
className="... bg-teal-muted/20 border-y border-teal/10"
```

**Step 2: Commit**

```bash
git add src/components/landing/platform-bar.tsx
git commit -m "feat(rebrand): add teal tint to platform bar"
```

---

### Task 26: Update HowItWorks Section

**Files:**
- Modify: `src/components/landing/how-it-works.tsx`

**Step 1: Update step numbers**

If step numbers are rendered as circles, change to droplet shapes:
```tsx
<div className="w-10 h-12 droplet-shape bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-bold">
  {stepNumber}
</div>
```

**Step 2: Update the connecting timeline line color from gold to teal**

Find the animated vertical gold line and change to:
```tsx
className="... bg-gradient-to-b from-gold via-teal to-gold"
```

**Step 3: Update copy to use "drop" language**

Step 1: "Enter Your Property" → "Pour In Your Property"
Step 2: "AI Generates" → "Watch It Form"
Step 3: "Get Your Campaign" → "Let It Drop"

(These may be passed as props or hardcoded — update wherever they're defined.)

**Step 4: Commit**

```bash
git add src/components/landing/how-it-works.tsx
git commit -m "feat(rebrand): droplet step markers and drop language in how-it-works"
```

---

### Task 27: Update FeaturesGrid (Bento Grid)

**Files:**
- Modify: `src/components/landing/features-grid.tsx`

**Step 1: Update card styling**

All feature cards get `rounded-2xl`. Add hover effect:
```tsx
className="... rounded-2xl transition-all duration-300 hover:border-teal/20 hover:shadow-lg hover:shadow-teal/5"
```

**Step 2: Replace the dot-grid background pattern with a subtle teal-tinted version**

If there's a decorative dot grid, change its color from the current color to `teal-muted`.

**Step 3: Change section heading to use "drop" language**

If heading is "Features" or similar, consider "What's In The Drop" — update text.

**Step 4: Commit**

```bash
git add src/components/landing/features-grid.tsx
git commit -m "feat(rebrand): update features grid with teal accents and drop heading"
```

---

### Task 28: Update SocialProof & WhoItsFor

**Files:**
- Modify: `src/components/landing/social-proof.tsx`
- Modify: `src/components/landing/who-its-for.tsx`

**Step 1: SocialProof — update stat styling**

Ensure the count-up numbers use `text-gold` and the gradient text effect uses the new gold values. Section should have no layout changes, just inherits new color tokens.

**Step 2: WhoItsFor — update persona cards**

Add `rounded-2xl` to persona cards. If persona icons have circular frames, change to droplet-shaped frames:
```tsx
<div className="w-12 h-12 droplet-shape bg-gold/10 border border-gold/20 flex items-center justify-center">
  <IconName className="w-6 h-6 text-gold" />
</div>
```

**Step 3: Commit**

```bash
git add src/components/landing/social-proof.tsx src/components/landing/who-its-for.tsx
git commit -m "feat(rebrand): update social proof and persona cards with droplet frames"
```

---

### Task 29: Update PricingSection & CTAFooter (Landing)

**Files:**
- Modify: `src/components/landing/pricing-section.tsx`
- Modify: `src/components/landing/cta-footer.tsx`

**Step 1: PricingSection — update card radius and feature bullets**

Cards get `rounded-2xl`. Feature checkmarks become droplet bullets (same as Task 21).

**Step 2: CTAFooter — update heading and CTA**

Change CTA text to "Drop Your First Ad — Free". Ensure button is pill-shaped with ripple effect.

If there's a background image, update the gradient overlay to use midnight ink:
```tsx
className="bg-gradient-to-t from-background via-background/80 to-background/40"
```

**Step 3: Commit**

```bash
git add src/components/landing/pricing-section.tsx src/components/landing/cta-footer.tsx
git commit -m "feat(rebrand): update landing pricing and CTA sections"
```

---

### Task 30: Update MobileCTABar & ShowcaseCarousel

**Files:**
- Modify: `src/components/landing/mobile-cta-bar.tsx`
- Modify: `src/components/landing/showcase-carousel.tsx`

**Step 1: MobileCTABar — ensure pill shape**

The sticky mobile CTA should be pill-shaped and use "Drop Your First Ad" text. It should already inherit the rounded-full from the button update but verify.

**Step 2: ShowcaseCarousel — update card styling**

Ensure showcase cards use `rounded-2xl` and the carousel dots use droplet shapes.

**Step 3: Commit**

```bash
git add src/components/landing/mobile-cta-bar.tsx src/components/landing/showcase-carousel.tsx
git commit -m "feat(rebrand): update mobile CTA bar and showcase carousel"
```

---

## Phase 9: Assets & Polish

### Task 31: Create New Favicon

**Files:**
- Modify: `public/favicon.svg`

**Step 1: Replace favicon with golden droplet SVG**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" fill="none">
  <defs>
    <linearGradient id="g" x1="16" y1="0" x2="16" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f5c842"/>
      <stop offset="100%" stop-color="#d4a017"/>
    </linearGradient>
  </defs>
  <path d="M16 0C16 0 0 19.2 0 27.2C0 36 7.16 42 16 42C24.84 42 32 36 32 27.2C32 19.2 16 0 16 0Z" fill="url(#g)"/>
  <ellipse cx="11" cy="24" rx="4" ry="5.5" fill="#f5d470" opacity="0.3"/>
</svg>
```

**Step 2: Commit**

```bash
git add public/favicon.svg
git commit -m "feat(rebrand): replace favicon with golden droplet"
```

---

### Task 32: Create New OG Image

**Files:**
- Create: `public/opengraph-image.png`

**Step 1: Generate OG image**

Create a 1200x630 OG image with:
- Midnight ink background (`#0f1118`)
- Centered golden droplet icon (large, ~200px)
- Concentric teal ripple rings emanating from the drop
- "AdDrop" text below in Fraunces serif (gold italic "Drop")
- Tagline: "One drop. Every platform."
- Subtle water caustic light patterns in background

This will require either a design tool export or a programmatic generation using `@vercel/og` or similar. If programmatic is not feasible, create a simple version with CSS-in-SVG.

**Step 2: Update metadata in layout.tsx if image path changes**

The current path `'/opengraph-image.png'` should remain the same.

**Step 3: Commit**

```bash
git add public/opengraph-image.png
git commit -m "feat(rebrand): add new droplet-themed OG image"
```

---

### Task 33: Update Toaster Styling

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update Sonner toast classes**

```tsx
<Toaster
  position="bottom-left"
  theme="dark"
  toastOptions={{
    className: 'bg-card/90 backdrop-blur-sm border border-border/50 text-cream shadow-lg rounded-2xl',
    duration: 4000,
  }}
/>
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(rebrand): update toast styling with glass effect and rounded corners"
```

---

### Task 34: Final Build Verification & Cleanup

**Step 1: Clear caches**

```bash
rm -rf .next/
```

**Step 2: Run full build**

```bash
npm run build
```

Expected: Clean build with no errors.

**Step 3: Visual verification**

Run: `npm run dev`

Check each page group:
- [ ] Landing page: midnight ink bg, gold accents pop, caustics visible, all sections rounded
- [ ] Auth pages: glass card, droplet icon frames, pill buttons
- [ ] Dashboard: updated CTA copy, rounded cards, hover effects
- [ ] Create: teal back link, rounded inputs
- [ ] Campaign viewer: droplet tab indicators, pill buttons
- [ ] Shared campaign: branded footer, expired state
- [ ] Settings: teal nav accents, liquid progress, droplet tier badges
- [ ] Admin: frosted sidebar, teal nav, droplet stat icons
- [ ] Pricing: header added, droplet bullets, rounded cards
- [ ] Legal: cool tones inherited, no other changes

**Step 4: Fix any visual regressions found during verification**

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(rebrand): final polish and visual verification pass"
```

---

## Summary

| Phase | Tasks | Scope | Impact |
|-------|-------|-------|--------|
| 1: Design Tokens | 1-4 | globals.css, tailwind.config.ts | Transforms entire app at once |
| 2: Global Components | 5-9 | 5 new components | Brand interaction vocabulary |
| 3: Navigation | 10-12 | Header, Footer, Badge | Brand mark everywhere |
| 4: Auth | 13-14 | 5 auth pages | Premium entry experience |
| 5: App Pages | 15-19 | Dashboard, Create, Campaign | Daily-use pages |
| 6: Shared & Pricing | 20-21 | Public-facing pages | Marketing pages |
| 7: Settings & Admin | 22-23 | Internal pages | Cohesive polish |
| 8: Landing Sections | 24-30 | All landing components | Highest-visibility rebrand |
| 9: Assets & Polish | 31-34 | Favicon, OG, toasts, QA | Final touches |

**Total: 34 tasks across 9 phases**
