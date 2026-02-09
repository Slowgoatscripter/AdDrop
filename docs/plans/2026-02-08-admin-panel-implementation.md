# Admin Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin panel skeleton with Supabase auth, role-based access, and a working user management page.

**Architecture:** Supabase provides auth + Postgres + RLS. Next.js middleware gates `/admin/*` routes by role. Server Components fetch data, Server Actions handle mutations. Dark minimal UI, no animations.

**Tech Stack:** Next.js 15, Supabase (auth + postgres), Tailwind CSS, Lucide React, shadcn/ui patterns

---

### Task 1: Install Supabase Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Verify installation**

Run:
```bash
npm ls @supabase/supabase-js @supabase/ssr
```
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install supabase dependencies"
```

---

### Task 2: Add Supabase Environment Variables

**Files:**
- Modify: `.env.local`

**Step 1: Add Supabase env vars to `.env.local`**

Append these lines to the existing `.env.local` file (DO NOT overwrite existing content):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 2: Commit**

No commit — `.env.local` is gitignored.

> **Note to implementer:** The user must replace placeholder values with real Supabase project credentials. Pause and inform the user they need to:
> 1. Create a Supabase project at https://supabase.com
> 2. Go to Project Settings → API
> 3. Copy the Project URL and anon/public key
> 4. Paste them into `.env.local`

---

### Task 3: Create Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`

**Step 1: Create browser client (`src/lib/supabase/client.ts`)**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create server client (`src/lib/supabase/server.ts`)**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

**Step 3: Create middleware helper (`src/lib/supabase/middleware.ts`)**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated admins away from login page
  if (request.nextUrl.pathname === '/login' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
```

**Step 4: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add supabase client utilities (browser, server, middleware)"
```

---

### Task 4: Create Next.js Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add next.js middleware for supabase auth session"
```

---

### Task 5: Create Database Schema (SQL Migration)

**Files:**
- Create: `supabase/migrations/001_profiles.sql`

**Step 1: Create migration file**

```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: admins can update any profile
create policy "Admins can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add profiles table migration with RLS policies"
```

> **Note to implementer:** Inform the user they need to run this SQL in their Supabase dashboard:
> 1. Go to Supabase Dashboard → SQL Editor
> 2. Paste the migration SQL and run it
> 3. Then create their admin account: go to Authentication → Users → Add User
> 4. After creating the user, go to Table Editor → profiles → find the row → change `role` to `admin`

---

### Task 6: Create Admin Types

**Files:**
- Create: `src/lib/types/admin.ts`

**Step 1: Create types file**

```typescript
export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'user'
  created_at: string
}

export interface AdminStats {
  totalUsers: number
  adminCount: number
  recentSignups: number
}
```

**Step 2: Commit**

```bash
git add src/lib/types/admin.ts
git commit -m "feat: add admin type definitions"
```

---

### Task 7: Create Login Page

**Files:**
- Create: `src/app/login/page.tsx`

**Step 1: Create login page**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check role and redirect
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    }

    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">AdDrop</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

**Step 2: Verify it renders**

Run:
```bash
npm run dev
```
Visit `/login` — should see a dark-themed login form.

**Step 3: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page"
```

---

### Task 8: Create Admin Layout with Sidebar

**Files:**
- Create: `src/components/admin/sidebar.tsx`
- Create: `src/app/admin/layout.tsx`

**Step 1: Create sidebar component (`src/components/admin/sidebar.tsx`)**

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <Link href="/admin" className="text-lg font-bold text-gold">
          AdDrop
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
```

**Step 2: Create admin layout (`src/app/admin/layout.tsx`)**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, role')
    .eq('id', user!.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
              {profile?.role}
            </span>
            <span className="text-sm text-muted-foreground">
              {profile?.display_name || profile?.email}
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/admin/sidebar.tsx src/app/admin/layout.tsx
git commit -m "feat: add admin layout with sidebar navigation"
```

---

### Task 9: Create Dashboard Page

**Files:**
- Create: `src/components/admin/stat-card.tsx`
- Create: `src/app/admin/page.tsx`

**Step 1: Create stat card component (`src/components/admin/stat-card.tsx`)**

```tsx
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
}

export function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
    </div>
  )
}
```

**Step 2: Create dashboard page (`src/app/admin/page.tsx`)**

```tsx
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/admin/stat-card'
import { Users, ShieldCheck, UserPlus, BarChart3, Globe } from 'lucide-react'
import type { Profile } from '@/lib/types/admin'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch stats
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const allProfiles = (profiles || []) as Profile[]
  const totalUsers = allProfiles.length
  const adminCount = allProfiles.filter((p) => p.role === 'admin').length
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentSignups = allProfiles.filter(
    (p) => new Date(p.created_at) > sevenDaysAgo
  ).length
  const recentUsers = allProfiles.slice(0, 5)

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Users" value={totalUsers} icon={Users} />
        <StatCard title="Admins" value={adminCount} icon={ShieldCheck} />
        <StatCard title="Signups (7 days)" value={recentSignups} icon={UserPlus} />
      </div>

      {/* Recent users */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Recent Users</h2>
        </div>
        <div className="divide-y divide-border">
          {recentUsers.map((user) => (
            <div key={user.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">
                  {user.display_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.role === 'admin'
                    ? 'bg-gold/10 text-gold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {user.role}
              </span>
            </div>
          ))}
          {recentUsers.length === 0 && (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              No users yet
            </p>
          )}
        </div>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-lg border border-border border-dashed bg-card/50 p-8 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Campaign Analytics</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Coming soon</p>
        </div>
        <div className="rounded-lg border border-border border-dashed bg-card/50 p-8 flex flex-col items-center justify-center text-center">
          <Globe className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Landing Page Performance</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/admin/stat-card.tsx src/app/admin/page.tsx
git commit -m "feat: add admin dashboard with stats and recent users"
```

---

### Task 10: Create User Management Page

**Files:**
- Create: `src/components/admin/role-badge.tsx`
- Create: `src/components/admin/users-table.tsx`
- Create: `src/app/admin/users/actions.ts`
- Create: `src/app/admin/users/page.tsx`

**Step 1: Create role badge component (`src/components/admin/role-badge.tsx`)**

```tsx
interface RoleBadgeProps {
  role: 'admin' | 'user'
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        role === 'admin'
          ? 'bg-gold/10 text-gold'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {role}
    </span>
  )
}
```

**Step 2: Create server action (`src/app/admin/users/actions.ts`)**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserRole(userId: string, newRole: 'admin' | 'user') {
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized')

  // Prevent self-demotion
  if (userId === user.id) throw new Error('Cannot change your own role')

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  revalidatePath('/admin')
}
```

**Step 3: Create users table component (`src/components/admin/users-table.tsx`)**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateUserRole } from '@/app/admin/users/actions'
import { RoleBadge } from './role-badge'
import { Search } from 'lucide-react'
import type { Profile } from '@/lib/types/admin'

interface UsersTableProps {
  profiles: Profile[]
  currentUserId: string
}

export function UsersTable({ profiles, currentUserId }: UsersTableProps) {
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = profiles.filter(
    (p) =>
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  function handleRoleChange(userId: string, newRole: 'admin' | 'user') {
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update role')
      }
    })
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-md bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
        />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Joined</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((profile) => (
              <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm text-foreground">
                  {profile.display_name || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {profile.email}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={profile.role} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {profile.id === currentUserId ? (
                    <span className="text-xs text-muted-foreground">You</span>
                  ) : (
                    <select
                      value={profile.role}
                      onChange={(e) =>
                        handleRoleChange(profile.id, e.target.value as 'admin' | 'user')
                      }
                      disabled={isPending}
                      className="text-xs px-2 py-1 rounded bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Showing {filtered.length} of {profiles.length} users
      </p>
    </div>
  )
}
```

**Step 4: Create users page (`src/app/admin/users/page.tsx`)**

```tsx
import { createClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/admin/users-table'
import type { Profile } from '@/lib/types/admin'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Users</h1>
      <UsersTable
        profiles={(profiles || []) as Profile[]}
        currentUserId={user!.id}
      />
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/components/admin/role-badge.tsx src/components/admin/users-table.tsx src/app/admin/users/
git commit -m "feat: add user management page with role editing"
```

---

### Task 11: Create Settings Placeholder Page

**Files:**
- Create: `src/app/admin/settings/page.tsx`

**Step 1: Create settings placeholder**

```tsx
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Settings</h1>
      <div className="rounded-lg border border-border border-dashed bg-card/50 p-12 flex flex-col items-center justify-center text-center">
        <Settings className="w-10 h-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground">Landing Page Settings</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
          Control landing page sections, headlines, and CTAs from here. Coming soon.
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/admin/settings/
git commit -m "feat: add settings placeholder page"
```

---

### Task 12: Verify Full Build

**Step 1: Run type check**

Run:
```bash
npx tsc --noEmit
```
Expected: No type errors

**Step 2: Run build**

Run:
```bash
npm run build
```
Expected: Build succeeds

**Step 3: Fix any errors**

If there are type or build errors, fix them before proceeding.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors in admin panel"
```

---

That's the complete file. Write it exactly as shown above.
