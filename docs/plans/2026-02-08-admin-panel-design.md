# Admin Panel Design — AdDrop

## Overview
Add an admin panel skeleton to AdDrop with role-based auth via Supabase and a working user management page. Dark, minimal UI — no animations, consistent with the app's dark theme but utilitarian.

## Tech Decisions
- **Auth & Database**: Supabase (Auth + Postgres + RLS)
- **Access control**: Role-based (`admin` | `user`) via `profiles` table
- **Admin gating**: Next.js middleware checks auth + role for `/admin/*` routes

## Database Schema

### `profiles` table
Extends Supabase `auth.users`:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users.id, PK |
| email | text | Synced from auth |
| display_name | text | Nullable |
| role | text | `admin` or `user`, default `user` |
| created_at | timestamptz | Default now() |

### Row-Level Security
- Users can SELECT their own profile
- Admin role can SELECT all profiles
- Admin role can UPDATE role column on any profile
- INSERT handled by a trigger on auth.users creation (auto-creates profile)

### Future tables (not built now)
- `landing_page_config` — section toggles and content overrides

## Auth Flow
1. Supabase client initialized in `src/lib/supabase/` (browser + server clients)
2. `middleware.ts` protects `/admin/*`:
   - Not authenticated → redirect to `/login`
   - Authenticated but not admin → redirect to `/`
   - Authenticated + admin → allow
3. No public signup — admin accounts created manually in Supabase dashboard or seed script
4. After login: admins → `/admin`, regular users → `/`

## Route Structure
```
/login            → Login page
/admin            → Dashboard (stats + placeholder cards)
/admin/users      → User management table
/admin/settings   → Placeholder for landing page controls
```

## Page Designs

### Login (`/login`)
- Dark themed, minimal
- Email + password fields
- Sign-in button
- Error message for bad credentials
- No signup link
- Post-login redirect based on role

### Dashboard (`/admin`)
- Welcome message with admin name
- Stat cards: Total Users, Admin Count, Recent Signups (7 days)
- Recent Users mini-table (last 5 signups)
- Placeholder cards: "Campaign Analytics" and "Landing Page Performance" (coming soon)

### Users (`/admin/users`)
- Data table: Name, Email, Role, Joined Date
- Search/filter bar (by name or email)
- Role badges: admin = gold, user = neutral
- Role change via dropdown (calls Server Action, verified server-side)
- Paginated, sorted by most recent

### Settings (`/admin/settings`)
- Placeholder page
- "Coming soon" card for landing page controls

## Admin Layout
- **Sidebar**: Logo, nav links (Dashboard, Users, Settings), sign-out button
- **Header**: Page title, admin user info badge
- **Content area**: Page-specific content
- Dark background, minimal styling, no gradients or animations

## File Structure
```
src/
  lib/supabase/
    client.ts          — browser Supabase client
    server.ts          — server-side Supabase client
    middleware.ts       — auth + role checking helper
  app/
    login/page.tsx     — login page
    admin/
      layout.tsx       — sidebar + header layout
      page.tsx         — dashboard
      users/page.tsx   — user management
      settings/page.tsx — placeholder
  components/admin/
    sidebar.tsx
    stat-card.tsx
    users-table.tsx
    role-badge.tsx
```

## What's NOT in scope
- User signup flow
- Ban/suspend functionality
- Activity logs
- Campaign analytics
- Landing page content editing
- OAuth providers (email/password only for now)
