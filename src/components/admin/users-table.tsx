'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, toggleRateLimitExempt } from '@/app/admin/users/actions'
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

  function handleRateLimitToggle(userId: string, currentExempt: boolean) {
    startTransition(async () => {
      try {
        await toggleRateLimitExempt(userId, !currentExempt)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to toggle rate limit')
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
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Rate Limit</th>
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
                  {profile.role === 'admin' ? (
                    <span className="text-xs text-muted-foreground">Admin (exempt)</span>
                  ) : (
                    <button
                      onClick={() => handleRateLimitToggle(profile.id, !!profile.rate_limit_exempt)}
                      disabled={isPending}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-50 ${
                        profile.rate_limit_exempt ? 'bg-gold' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          profile.rate_limit_exempt ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                  )}
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
