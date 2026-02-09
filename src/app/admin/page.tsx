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
