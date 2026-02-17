import { BarChart3, CalendarDays, Trophy, CheckCircle } from 'lucide-react'
import type { CampaignKit, PlatformId } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignRow {
  id: string
  created_at: string
  platform?: string | null
  generated_ads?: CampaignKit | null
}

interface StatsBarProps {
  campaigns: CampaignRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_LABELS: Partial<Record<PlatformId | string, string>> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  googleAds: 'Google Ads',
  metaAd: 'Meta Ad',
  magazineFullPage: 'Magazine',
  magazineHalfPage: 'Magazine',
  postcard: 'Postcard',
  zillow: 'Zillow',
  realtorCom: 'Realtor.com',
  homesComTrulia: 'Homes/Trulia',
  mlsDescription: 'MLS',
}

function getMostUsedPlatform(campaigns: CampaignRow[]): string {
  const counts: Record<string, number> = {}

  for (const c of campaigns) {
    const platforms: string[] = c.generated_ads?.selectedPlatforms?.length
      ? c.generated_ads.selectedPlatforms
      : c.platform
      ? c.platform.split(',').map((p) => p.trim()).filter(Boolean)
      : []

    for (const pid of platforms) {
      counts[pid] = (counts[pid] ?? 0) + 1
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!sorted.length) return '—'
  const [topId] = sorted[0]
  return PLATFORM_LABELS[topId] ?? topId
}

function getCompliancePassRate(campaigns: CampaignRow[]): string {
  const withCompliance = campaigns.filter(
    (c) => c.generated_ads?.complianceResult != null
  )
  if (!withCompliance.length) return '—'

  const passing = withCompliance.filter(
    (c) => c.generated_ads?.complianceResult?.campaignVerdict === 'compliant'
  ).length

  return `${Math.round((passing / withCompliance.length) * 100)}%`
}

function getThisMonthCount(campaigns: CampaignRow[]): number {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return campaigns.filter(
    (c) => new Date(c.created_at).getTime() >= firstOfMonth
  ).length
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  iconColor?: string
}

function StatCard({ icon: Icon, label, value, iconColor = 'text-gold' }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
      <div className="p-2 rounded-md bg-muted/50 flex-shrink-0">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium leading-none mb-1">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground leading-none truncate">
          {value}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

export function StatsBar({ campaigns }: StatsBarProps) {
  const total = campaigns.length
  const thisMonth = getThisMonthCount(campaigns)
  const topPlatform = getMostUsedPlatform(campaigns)
  const passRate = getCompliancePassRate(campaigns)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={BarChart3}
        label="Total Campaigns"
        value={total}
        iconColor="text-gold"
      />
      <StatCard
        icon={CalendarDays}
        label="This Month"
        value={thisMonth}
        iconColor="text-blue-400"
      />
      <StatCard
        icon={Trophy}
        label="Top Platform"
        value={topPlatform}
        iconColor="text-amber-400"
      />
      <StatCard
        icon={CheckCircle}
        label="Compliance Pass"
        value={passRate}
        iconColor="text-green-500"
      />
    </div>
  )
}
