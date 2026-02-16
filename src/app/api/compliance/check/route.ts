import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { checkComplianceWithAgent } from '@/lib/compliance/agent'
import { getComplianceSettings } from '@/lib/compliance/compliance-settings'
import type { CampaignKit } from '@/lib/types/campaign'

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { campaign } = (await req.json()) as { campaign: CampaignKit }

  if (!campaign) {
    return NextResponse.json({ error: 'campaign is required' }, { status: 400 })
  }

  const { config } = await getComplianceSettings()
  const result = await checkComplianceWithAgent(campaign, config)

  return NextResponse.json(result)
}
