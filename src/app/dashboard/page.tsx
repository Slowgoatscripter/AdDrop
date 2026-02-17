import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  FileText,
  ChevronRight,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  Mail,
  Newspaper,
  Home,
  CreditCard,
} from 'lucide-react'
import { getCampaignUsage } from '@/lib/usage/campaign-limits'
import { BetaUsageCard } from '@/components/dashboard/beta-usage-card'
import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { Badge } from '@/components/ui/badge'
import type { CampaignKit, PlatformId, ListingData } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return new Date(dateString).toLocaleDateString()
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

type PlatformIconEntry = {
  icon: React.ElementType
  label: string
  color: string
}

const PLATFORM_ICON_MAP: Partial<Record<PlatformId | string, PlatformIconEntry>> = {
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
  facebook: { icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
  twitter: { icon: Twitter, label: 'Twitter/X', color: 'text-sky-500' },
  googleAds: { icon: Globe, label: 'Google Ads', color: 'text-green-500' },
  metaAd: { icon: Globe, label: 'Meta Ad', color: 'text-blue-500' },
  magazineFullPage: { icon: Newspaper, label: 'Magazine (Full)', color: 'text-amber-600' },
  magazineHalfPage: { icon: Newspaper, label: 'Magazine (Half)', color: 'text-amber-500' },
  postcard: { icon: Mail, label: 'Postcard', color: 'text-purple-500' },
  zillow: { icon: Home, label: 'Zillow', color: 'text-blue-400' },
  realtorCom: { icon: Home, label: 'Realtor.com', color: 'text-red-500' },
  homesComTrulia: { icon: Home, label: 'Homes/Trulia', color: 'text-teal-500' },
  mlsDescription: { icon: CreditCard, label: 'MLS', color: 'text-muted-foreground' },
}

function getPlatformIds(campaign: {
  platform?: string | null
  generated_ads?: CampaignKit | null
}): string[] {
  // Prefer structured selectedPlatforms from generated_ads
  if (campaign.generated_ads?.selectedPlatforms?.length) {
    return campaign.generated_ads.selectedPlatforms
  }
  // Fall back to comma-separated platform column
  if (campaign.platform) {
    return campaign.platform.split(',').map((p: string) => p.trim()).filter(Boolean)
  }
  return []
}

function getListing(campaign: {
  listing_data?: ListingData | null
  generated_ads?: CampaignKit | null
}): ListingData | null {
  if (campaign.listing_data) return campaign.listing_data as ListingData
  if (campaign.generated_ads?.listing) return campaign.generated_ads.listing
  return null
}

function getComplianceBadge(kit: CampaignKit | null | undefined): React.ReactNode {
  if (!kit?.complianceResult) return null
  const { campaignVerdict, totalViolations } = kit.complianceResult
  if (campaignVerdict === 'compliant') {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-1.5 py-0">
        Compliant
      </Badge>
    )
  }
  if (campaignVerdict === 'needs-review') {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px] px-1.5 py-0">
        Review ({totalViolations})
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] px-1.5 py-0">
      {totalViolations} Violation{totalViolations !== 1 ? 's' : ''}
    </Badge>
  )
}

function getQualityBadge(kit: CampaignKit | null | undefined): React.ReactNode {
  if (!kit?.qualityResult) return null
  const score = kit.qualityResult.overallScore
  if (score === undefined || score === null) return null

  const pct = Math.round(score)
  let cls = 'bg-green-500/10 text-green-600 border-green-500/20'
  if (pct < 50) cls = 'bg-red-500/10 text-red-600 border-red-500/20'
  else if (pct < 75) cls = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'

  return (
    <Badge className={`${cls} text-[10px] px-1.5 py-0`}>
      Q: {pct}%
    </Badge>
  )
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
              {campaigns.map((campaign) => {
                const kit = campaign.generated_ads as CampaignKit | null
                const listing = getListing({ listing_data: campaign.listing_data, generated_ads: kit })
                const platformIds = getPlatformIds({ platform: campaign.platform, generated_ads: kit })
                const photoUrl = listing?.photos?.[0] ?? null
                const relDate = formatRelativeDate(campaign.created_at)

                return (
                  <Link
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                    className="block p-4 border border-border rounded-lg bg-muted/30 hover:border-gold/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrl}
                          alt="Property photo"
                          className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 flex items-center justify-center">
                          <Home className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                              {listing?.address?.street ?? campaign.name}
                            </h3>
                            {listing?.address && (listing.address.city || listing.address.state) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[listing.address.city, listing.address.state, listing.address.zip]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium capitalize">
                              {campaign.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Price + stats */}
                        {listing && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            {listing.price > 0 && (
                              <span className="text-sm font-semibold text-foreground">
                                {formatPrice(listing.price)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {[
                                listing.beds > 0 && `${listing.beds} bd`,
                                listing.baths > 0 && `${listing.baths} ba`,
                                listing.sqft > 0 && `${listing.sqft.toLocaleString()} sqft`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                            {listing.propertyType && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-auto border-muted-foreground/30 text-muted-foreground"
                              >
                                {listing.propertyType}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Bottom row: platform icons + compliance/quality badges + date */}
                        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                          {/* Platform icons */}
                          <div className="flex items-center gap-1">
                            {platformIds.length > 0
                              ? platformIds.slice(0, 6).map((pid) => {
                                  const entry = PLATFORM_ICON_MAP[pid]
                                  if (!entry) return null
                                  const Icon = entry.icon
                                  return (
                                    <span
                                      key={pid}
                                      title={entry.label}
                                      className={`${entry.color}`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                  )
                                })
                              : null}
                            {platformIds.length > 6 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{platformIds.length - 6}
                              </span>
                            )}
                          </div>

                          {/* Compliance + quality badges + date */}
                          <div className="flex items-center gap-1.5">
                            {getComplianceBadge(kit)}
                            {getQualityBadge(kit)}
                            <span
                              className="text-xs text-muted-foreground"
                              title={new Date(campaign.created_at).toISOString()}
                            >
                              {relDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
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
