import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import { BetaUsageCard } from '@/components/dashboard/beta-usage-card'
import { WelcomeCard } from '@/components/dashboard/welcome-card'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const [{ data: profile }, { data: campaigns }, usage] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getCampaignUsage(supabase, user.id),
  ])

  // Show welcome card for first-time users:
  // - No campaigns AND (welcome param OR profile created within last 10 minutes)
  const isNewUser =
    (!campaigns || campaigns.length === 0) &&
    (params.welcome === '1' ||
      (profile?.created_at &&
        Date.now() - new Date(profile.created_at).getTime() < 10 * 60 * 1000))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">Manage your real estate ad campaigns</p>
      </div>

      {/* Beta usage card */}
      <BetaUsageCard usage={usage} />

      {isNewUser ? (
        <WelcomeCard />
      ) : (
        <>
          <Link
            href="/create"
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
                <Link
                  key={campaign.id}
                  href={`/campaign/${campaign.id}`}
                  className="block p-4 border border-border rounded-lg bg-muted/30 hover:border-gold/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {campaign.platform && <span className="capitalize">{campaign.platform}</span>}
                        {campaign.platform && ' · '}
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium capitalize">
                        {campaign.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Beta footer */}
          <p className="text-xs text-muted-foreground text-center pt-4">
            AdDrop Beta &mdash; 2 campaigns per week, free during beta.
          </p>
        </>
      )}
    </div>
  )
}
