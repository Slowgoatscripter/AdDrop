# Phase 2 Implementation Plan: Admin MFA + Profile Management

**Design Doc:** `docs/plans/2026-02-10-user-accounts-design.md`
**Goal:** Mandatory MFA for admins, profile management for all users, JWT claims optimization.

---

## Agent Team Structure

### Agent 1: `database` — Migration, Backup Codes, Server Actions

**Owned files:**
- `supabase/migrations/20260210_phase2_mfa_settings.sql` (CREATE)
- `src/lib/mfa/backup-codes.ts` (CREATE)
- `src/app/settings/security/actions.ts` (CREATE)
- `src/app/settings/account/actions.ts` (CREATE)

**Tasks:**

1. **Install bcryptjs** — `npm install bcryptjs @types/bcryptjs`

2. **Create migration: `20260210_phase2_mfa_settings.sql`**
   - MFA backup codes table:
     ```sql
     create table public.mfa_backup_codes (
       id uuid primary key default gen_random_uuid(),
       user_id uuid references auth.users on delete cascade not null,
       code_hash text not null,
       used_at timestamptz,
       created_at timestamptz default now()
     );
     alter table public.mfa_backup_codes enable row level security;
     -- Server-side only (service_role), no user-facing policies
     ```
   - JWT claims helper function (for role caching in JWT):
     ```sql
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
     -- Grant needed permissions
     grant usage on schema public to supabase_auth_admin;
     grant execute on function public.custom_access_token_hook to supabase_auth_admin;
     revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
     ```

3. **Create backup codes module: `src/lib/mfa/backup-codes.ts`**
   - `generateBackupCodes()` — Generate 8 random codes (format: XXXX-XXXX)
   - `hashBackupCode(code)` — Hash with bcryptjs
   - `verifyBackupCode(code, hash)` — Compare with bcryptjs
   - `storeBackupCodes(userId, codes)` — Hash and store all codes (uses service_role client)
   - `useBackupCode(userId, code)` — Verify against stored hashes, mark used
   - `getRemainingCount(userId)` — Count unused codes

4. **Create security server actions: `src/app/settings/security/actions.ts`**
   - `enrollMfa()` — Start TOTP enrollment, return QR URI + secret
   - `verifyMfaEnrollment(factorId, code)` — Verify the enrollment with a challenge
   - `unenrollMfa(factorId)` — Remove MFA factor
   - `generateNewBackupCodes()` — Generate, hash, store, return plaintext codes
   - `verifyBackupCode(code)` — Verify a backup code during MFA challenge
   - `getMfaStatus()` — Get user's MFA factors and backup code count

5. **Create account server actions: `src/app/settings/account/actions.ts`**
   - `updateProfile(data)` — Update display_name, company, phone, avatar_url
   - `requestEmailChange(newEmail)` — Call updateUser({ email }) for dual confirmation
   - `getProfile()` — Get current user's profile data

### Agent 2: `frontend` — Settings UI Pages

**Owned files:**
- `src/app/settings/layout.tsx` (CREATE)
- `src/app/settings/page.tsx` (CREATE — redirect to /settings/account)
- `src/app/settings/account/page.tsx` (CREATE)
- `src/app/settings/security/page.tsx` (CREATE)
- `src/app/mfa-challenge/page.tsx` (CREATE)

**Tasks:**

1. **Create settings layout: `src/app/settings/layout.tsx`**
   - Server component
   - Sidebar navigation: Account, Security
   - Header with user info (mirror dashboard layout style)
   - Active page indicator in nav

2. **Create settings redirect: `src/app/settings/page.tsx`**
   - Simple redirect to /settings/account

3. **Create account page: `src/app/settings/account/page.tsx`**
   - Profile form: display_name, company, phone (editable)
   - Email display with "Change email" button
   - Email change flow: enter new email → show "Confirmation sent to both addresses"
   - Success/error feedback
   - Use server actions from `actions.ts`

4. **Create security page: `src/app/settings/security/page.tsx`**
   - MFA status display (enrolled or not)
   - "Enable MFA" button → shows QR code + manual secret → verification input
   - After enrollment: show backup codes once with "Download" / "Copy" buttons
   - Backup codes section: show remaining count, "Regenerate" button
   - "Disable MFA" button (requires re-entering a TOTP code)
   - For admins: show banner "MFA is required for admin accounts"

5. **Create MFA challenge page: `src/app/mfa-challenge/page.tsx`**
   - Standalone page for when middleware redirects admins who need AAL2
   - 6-digit code input
   - "Use backup code" link → switches to backup code input
   - Call mfa.challenge() then mfa.verify()
   - On success: redirect to original destination (via `next` query param, validated)
   - Accessible at AAL1 (not behind AAL2 protection)

### Agent 3: `middleware` — MFA Enforcement + JWT Claims

**Owned files:**
- `src/lib/supabase/middleware.ts` (MODIFY)

**Tasks:**

1. **Add 4-state MFA logic for admin routes (C3):**
   - State 1: Not authenticated → redirect to /login (existing)
   - State 2: Admin, no MFA factors enrolled → redirect to /settings/security
   - State 3: Admin, MFA enrolled but session is AAL1 → redirect to /mfa-challenge?next=[original-url]
   - State 4: Admin, AAL2 → allow through (existing admin check still applies)

   Implementation:
   ```typescript
   // After confirming user is admin:
   const { data: { currentLevel, nextLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

   if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
     // MFA is enrolled but not verified this session
     const url = request.nextUrl.clone()
     url.pathname = '/mfa-challenge'
     url.searchParams.set('next', request.nextUrl.pathname)
     return NextResponse.redirect(url)
   }

   if (nextLevel === 'aal1') {
     // No MFA enrolled — send to enrollment
     const url = request.nextUrl.clone()
     url.pathname = '/settings/security'
     return NextResponse.redirect(url)
   }
   ```

2. **Ensure /settings/security and /mfa-challenge are accessible at AAL1**
   - These pages must NOT require AAL2 (would create chicken-and-egg lockout)
   - Add explicit exception in middleware for these paths when user is admin

3. **Switch to JWT claims for role check (I3):**
   - After the custom_access_token_hook is configured in Supabase, the JWT will contain `user_role`
   - Change middleware from querying profiles table to reading `user.app_metadata.user_role` or JWT claim
   - Keep profiles query as fallback if claim is missing (backward compatibility during transition)

---

## File Ownership Matrix

| File | Owner | Action |
|------|-------|--------|
| `supabase/migrations/20260210_phase2_mfa_settings.sql` | database | CREATE |
| `src/lib/mfa/backup-codes.ts` | database | CREATE |
| `src/app/settings/security/actions.ts` | database | CREATE |
| `src/app/settings/account/actions.ts` | database | CREATE |
| `src/app/settings/layout.tsx` | frontend | CREATE |
| `src/app/settings/page.tsx` | frontend | CREATE |
| `src/app/settings/account/page.tsx` | frontend | CREATE |
| `src/app/settings/security/page.tsx` | frontend | CREATE |
| `src/app/mfa-challenge/page.tsx` | frontend | CREATE |
| `src/lib/supabase/middleware.ts` | middleware | MODIFY |

**Zero file conflicts.**

---

## Dependency Order

```
database (tasks 1-2: migration + backup codes) ──┐
                                                   ├──→ frontend (needs server actions from database)
database (tasks 3-5: server actions) ─────────────┘
middleware (independent — can start immediately)
```

---

## Verification Checklist

- [ ] `npm run build` passes (TypeScript clean)
- [ ] Admin without MFA enrolled → redirected to /settings/security
- [ ] Admin with MFA enrolled but not verified → redirected to /mfa-challenge
- [ ] Admin with AAL2 → can access /admin normally
- [ ] MFA enrollment flow: QR code → verify code → backup codes shown
- [ ] Backup codes: generate, display, verify, count remaining
- [ ] MFA challenge page: enter code → redirect to original page
- [ ] MFA challenge with backup code works
- [ ] Profile editing: update name/company/phone saves correctly
- [ ] Email change triggers dual confirmation
- [ ] /settings/security accessible without AAL2 (no lockout)
- [ ] /mfa-challenge accessible without AAL2
- [ ] Regular users can access settings but MFA is optional for them
- [ ] Existing login/signup/dashboard flows still work
