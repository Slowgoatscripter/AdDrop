import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">Manage your real estate ad campaigns</p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create New Campaign
      </Link>

      {!campaigns || campaigns.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg bg-muted/30">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No campaigns yet. Create your first ad!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{campaign.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {campaign.platform && <span className="capitalize">{campaign.platform}</span>}
                    {campaign.platform && ' · '}
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium capitalize">
                  {campaign.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
