import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-helpers'
import { checkComplianceWithAgent } from '@/lib/compliance/agent'
import { getComplianceSettings } from '@/lib/compliance/compliance-settings'
import { complianceConfigs } from '@/lib/compliance/terms/montana'
import type { CampaignKit } from '@/lib/types/campaign'

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { campaign } = (await req.json()) as { campaign: CampaignKit }

  if (!campaign) {
    return NextResponse.json({ error: 'campaign is required' }, { status: 400 })
  }

  const { config: settingsConfig, stateCode: settingsState } = await getComplianceSettings()

  // Prefer the campaign's state (set during generation) over global settings
  const effectiveState = campaign.stateCode || settingsState
  const config = complianceConfigs[effectiveState.toUpperCase()] ?? settingsConfig

  const result = await checkComplianceWithAgent(campaign, config)

  return NextResponse.json(result)
}
