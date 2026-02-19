'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Facebook,
  Instagram,
  Twitter,
  Globe,
  Mail,
  Newspaper,
  Home,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ViewToggle } from '@/components/dashboard/view-toggle'
import { CampaignActions } from '@/components/dashboard/campaign-actions'
import { cn } from '@/lib/utils'
import type { CampaignKit, PlatformId, ListingData } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'dashboard-view'

interface Campaign {
  id: string
  name: string
  status: string
  created_at: string
  platform?: string | null
  listing_data?: ListingData | null
  generated_ads?: CampaignKit | null
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from server component to avoid importing server code)
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

function getPlatformIds(campaign: Campaign): string[] {
  if (campaign.generated_ads?.selectedPlatforms?.length) {
    return campaign.generated_ads.selectedPlatforms
  }
  if (campaign.platform) {
    return campaign.platform.split(',').map((p: string) => p.trim()).filter(Boolean)
  }
  return []
}

function getListing(campaign: Campaign): ListingData | null {
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

  const pct = Math.round(score * 10)
  let cls = 'bg-green-500/10 text-green-600 border-green-500/20'
  if (pct < 60) cls = 'bg-red-500/10 text-red-600 border-red-500/20'
  else if (pct < 80) cls = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'

  return (
    <Badge className={`${cls} text-[10px] px-1.5 py-0`}>
      Q: {pct}%
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Card sub-components
// ---------------------------------------------------------------------------

function PlatformIcons({ platformIds }: { platformIds: string[] }) {
  if (platformIds.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {platformIds.slice(0, 6).map((pid) => {
        const entry = PLATFORM_ICON_MAP[pid]
        if (!entry) return null
        const Icon = entry.icon
        return (
          <span key={pid} title={entry.label} className={entry.color}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )
      })}
      {platformIds.length > 6 && (
        <span className="text-[10px] text-muted-foreground">+{platformIds.length - 6}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grid card
// ---------------------------------------------------------------------------

function GridCard({ campaign }: { campaign: Campaign }) {
  const kit = campaign.generated_ads as CampaignKit | null
  const listing = getListing(campaign)
  const platformIds = getPlatformIds(campaign)
  const photoUrl = listing?.photos?.[0] ?? null
  const relDate = formatRelativeDate(campaign.created_at)
  const displayName = listing?.address?.street ?? campaign.name

  return (
    <div className="relative group">
      <Link
        href={`/campaign/${campaign.id}`}
        className="block border border-border rounded-lg bg-muted/30 hover:border-gold/50 transition-colors cursor-pointer overflow-hidden"
      >
        {/* Photo header */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Property photo"
            className="w-full h-32 object-cover bg-muted"
          />
        ) : (
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            <Home className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}

        <div className="p-3">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-foreground text-sm leading-snug truncate flex-1">
              {displayName}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold font-medium capitalize flex-shrink-0">
              {campaign.status}
            </span>
          </div>

          {/* City/state */}
          {listing?.address && (listing.address.city || listing.address.state) && (
            <p className="text-xs text-muted-foreground truncate mb-1">
              {[listing.address.city, listing.address.state, listing.address.zip]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}

          {/* Price + stats */}
          {listing && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
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
            </div>
          )}

          {/* Bottom: platforms + badges + date */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <PlatformIcons platformIds={platformIds} />
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
      </Link>

      {/* Actions button — positioned top-right over the card */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CampaignActions campaignId={campaign.id} campaignName={displayName} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------------

function ListRow({ campaign }: { campaign: Campaign }) {
  const kit = campaign.generated_ads as CampaignKit | null
  const listing = getListing(campaign)
  const platformIds = getPlatformIds(campaign)
  const photoUrl = listing?.photos?.[0] ?? null
  const relDate = formatRelativeDate(campaign.created_at)
  const displayName = listing?.address?.street ?? campaign.name

  return (
    <div className="relative group flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30 hover:border-gold/50 transition-colors">
      {/* Thumbnail */}
      <Link href={`/campaign/${campaign.id}`} className="flex-shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Property photo"
            className="w-16 h-16 rounded-md object-cover bg-muted"
          />
        ) : (
          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
            <Home className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </Link>

      {/* Main content */}
      <Link
        href={`/campaign/${campaign.id}`}
        className="flex-1 min-w-0 block"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">{displayName}</h3>
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

        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <PlatformIcons platformIds={platformIds} />
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
      </Link>

      {/* Actions — top right of card */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <CampaignActions campaignId={campaign.id} campaignName={displayName} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface CampaignGridProps {
  campaigns: Campaign[]
}

export function CampaignGrid({ campaigns }: CampaignGridProps) {
  const [view, setView] = useState<ViewMode>('list')

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'grid' || saved === 'list') {
      setView(saved)
    }
  }, [])

  function handleViewChange(newView: ViewMode) {
    setView(newView)
    localStorage.setItem(STORAGE_KEY, newView)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: view toggle aligned right */}
      <div className="flex items-center justify-end">
        <ViewToggle view={view} onViewChange={handleViewChange} />
      </div>

      {/* Campaign list / grid */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <GridCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <ListRow key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}
