import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  FileText,
  SlidersHorizontal,
} from 'lucide-react'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import { BetaUsageCard } from '@/components/dashboard/beta-usage-card'
import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { Breadcrumbs } from '@/components/nav/breadcrumbs'
import { CampaignFilters } from '@/components/dashboard/campaign-filters'
import { CampaignGrid } from '@/components/dashboard/campaign-grid'
import type { SortOption } from '@/components/dashboard/campaign-filters'
import type { CampaignKit, ListingData } from '@/lib/types'

// ---------------------------------------------------------------------------
// Filter + sort helpers (server-side, applied after fetch)
// ---------------------------------------------------------------------------

type CampaignRow = {
  id: string
  name: string
  status: string
  platform: string | null
  created_at: string
  listing_data: unknown
  generated_ads: unknown
  [key: string]: unknown
}

function getListingFromRow(campaign: CampaignRow): ListingData | null {
  const kit = campaign.generated_ads as CampaignKit | null
  if (campaign.listing_data) return campaign.listing_data as ListingData
  if (kit?.listing) return kit.listing
  return null
}

/** Pull out searchable text for a campaign row */
function getCampaignSearchText(campaign: CampaignRow): string {
  const listing = getListingFromRow(campaign)
  const parts: string[] = []
  if (campaign.name) parts.push(campaign.name.toLowerCase())
  if (listing?.address?.street) parts.push(listing.address.street.toLowerCase())
  if (listing?.address?.city) parts.push(listing.address.city.toLowerCase())
  if (listing?.address?.state) parts.push(listing.address.state.toLowerCase())
  if (listing?.address?.zip) parts.push(listing.address.zip.toLowerCase())
  return parts.join(' ')
}

/** Get listing price for sort, falling back to 0 */
function getCampaignPrice(campaign: CampaignRow): number {
  const listing = getListingFromRow(campaign)
  return listing?.price ?? 0
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const [{ data: profile }, { data: rawCampaigns }, usage] = await Promise.all([
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

  // ---------------------------------------------------------------------------
  // Read filter params
  // ---------------------------------------------------------------------------
  const searchQuery = typeof params.q === 'string' ? params.q.trim().toLowerCase() : ''
  const sortParam = typeof params.sort === 'string' ? params.sort : 'newest'
  const sortOption: SortOption =
    sortParam === 'oldest' || sortParam === 'price-high' || sortParam === 'price-low'
      ? sortParam
      : 'newest'

  // ---------------------------------------------------------------------------
  // Apply filter + sort
  // ---------------------------------------------------------------------------
  let campaigns = rawCampaigns ?? []

  // Filter by search query
  if (searchQuery) {
    campaigns = campaigns.filter((c) => getCampaignSearchText(c).includes(searchQuery))
  }

  // Sort
  campaigns = [...campaigns].sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortOption === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    if (sortOption === 'price-high') {
      return getCampaignPrice(b) - getCampaignPrice(a)
    }
    if (sortOption === 'price-low') {
      return getCampaignPrice(a) - getCampaignPrice(b)
    }
    return 0
  })

  const isNewUser =
    (!rawCampaigns || rawCampaigns.length === 0) &&
    (params.welcome === '1' ||
      (profile?.created_at &&
        Date.now() - new Date(profile.created_at).getTime() < 10 * 60 * 1000))

  const hasAnyRawCampaigns = rawCampaigns && rawCampaigns.length > 0
  const isFiltered = searchQuery.length > 0

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard' },
        ]}
        className="mb-4"
      />

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
          {/* Summary stats */}
          {hasAnyRawCampaigns && (
            <StatsBar campaigns={rawCampaigns!} />
          )}

          {/* Action row: create button */}
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Campaign
          </Link>

          {/* Search and filter bar — only shown when there are campaigns */}
          {hasAnyRawCampaigns && (
            <CampaignFilters initialQ={searchQuery} initialSort={sortOption} />
          )}

          {/* Campaign list */}
          {!hasAnyRawCampaigns ? (
            <div className="text-center py-12 border border-border rounded-lg bg-muted/30">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No campaigns yet. Create your first ad!</p>
            </div>
          ) : campaigns.length === 0 ? (
            /* No results after filtering */
            <div className="text-center py-12 border border-border rounded-lg bg-muted/30">
              <SlidersHorizontal className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No campaigns match your filters</p>
              {isFiltered && (
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different address, name, or clear your search
                </p>
              )}
            </div>
          ) : (
            <CampaignGrid campaigns={campaigns} />
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
