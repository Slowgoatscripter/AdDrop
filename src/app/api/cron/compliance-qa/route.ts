import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCampaign } from '@/lib/ai/generate'
import { getComplianceSettings } from '@/lib/compliance/compliance-settings'
import type {
  RunSummary,
  PropertyTestResult,
  ComplianceTestProperty,
} from '@/lib/types/compliance-qa'

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role client for cron (no user session)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startTime = Date.now()

  // Fetch all test properties
  const { data: properties, error: fetchError } = await supabase
    .from('compliance_test_properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Cron: Database error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }

  if (!properties || properties.length === 0) {
    return NextResponse.json({ message: 'No test properties' })
  }

  const results: PropertyTestResult[] = []
  let totalViolations = 0
  let totalAutoFixes = 0
  let passedCount = 0
  let failedCount = 0

  // Run full pipeline for each property
  for (const property of properties as ComplianceTestProperty[]) {
    try {
      const campaign = await generateCampaign(property.listing_data)

      // Extract platform texts
      const generatedText: Record<string, string> = {}
      if (campaign.instagram) {
        if (campaign.instagram.casual) generatedText['instagram.casual'] = campaign.instagram.casual
        if (campaign.instagram.professional) generatedText['instagram.professional'] = campaign.instagram.professional
        if (campaign.instagram.luxury) generatedText['instagram.luxury'] = campaign.instagram.luxury
      }
      if (campaign.facebook) {
        if (campaign.facebook.casual) generatedText['facebook.casual'] = campaign.facebook.casual
        if (campaign.facebook.professional) generatedText['facebook.professional'] = campaign.facebook.professional
        if (campaign.facebook.luxury) generatedText['facebook.luxury'] = campaign.facebook.luxury
      }
      if (campaign.twitter) generatedText['twitter'] = campaign.twitter
      if (campaign.googleAds) {
        generatedText['googleAds'] = campaign.googleAds.map(ad =>
          `${ad.headline} - ${ad.description}`
        ).join('\n')
      }
      if (campaign.metaAd) {
        generatedText['metaAd'] = `${campaign.metaAd.headline}\n${campaign.metaAd.primaryText}\n${campaign.metaAd.description}`
      }
      if (campaign.magazineFullPage) {
        if (campaign.magazineFullPage.professional) generatedText['magazineFullPage.professional'] = campaign.magazineFullPage.professional.body
        if (campaign.magazineFullPage.luxury) generatedText['magazineFullPage.luxury'] = campaign.magazineFullPage.luxury.body
      }
      if (campaign.magazineHalfPage) {
        if (campaign.magazineHalfPage.professional) generatedText['magazineHalfPage.professional'] = campaign.magazineHalfPage.professional.body
        if (campaign.magazineHalfPage.luxury) generatedText['magazineHalfPage.luxury'] = campaign.magazineHalfPage.luxury.body
      }
      if (campaign.postcard) {
        if (campaign.postcard.professional) generatedText['postcard.professional'] = campaign.postcard.professional.front.body
        if (campaign.postcard.casual) generatedText['postcard.casual'] = campaign.postcard.casual.front.body
      }
      if (campaign.zillow) generatedText['zillow'] = campaign.zillow
      if (campaign.realtorCom) generatedText['realtorCom'] = campaign.realtorCom
      if (campaign.homesComTrulia) generatedText['homesComTrulia'] = campaign.homesComTrulia
      if (campaign.mlsDescription) generatedText['mlsDescription'] = campaign.mlsDescription

      // Save snapshot
      await supabase.from('compliance_test_snapshots').insert({
        property_id: property.id,
        generated_text: generatedText,
        approved: false,
      })

      const complianceResult = campaign.complianceResult
      const passed = complianceResult.campaignVerdict === 'compliant'

      if (passed) passedCount++
      else failedCount++

      totalViolations += complianceResult.totalViolations
      totalAutoFixes += complianceResult.totalAutoFixes

      results.push({
        propertyId: property.id,
        propertyName: property.name,
        state: property.state,
        riskCategory: property.risk_category,
        passed,
        complianceResult,
        generatedText,
        qualityFixesApplied: 0,
        qualitySuggestionsCount: campaign.qualitySuggestions?.length ?? 0,
      })
    } catch (error) {
      console.error(`Cron: Error processing property ${property.id}:`, error)
      failedCount++
      results.push({
        propertyId: property.id,
        propertyName: property.name,
        state: property.state,
        riskCategory: property.risk_category,
        passed: false,
        complianceResult: {
          platforms: [],
          campaignVerdict: 'needs-review',
          violations: [],
          autoFixes: [],
          totalViolations: 0,
          totalAutoFixes: 0,
        },
      })
    }
  }

  const durationMs = Date.now() - startTime

  const summary: RunSummary = {
    totalProperties: properties.length,
    passed: passedCount,
    failed: failedCount,
    totalViolationsFound: totalViolations,
    totalAutoFixes: totalAutoFixes,
    averageViolationsPerProperty:
      properties.length > 0 ? totalViolations / properties.length : 0,
  }

  // Save run to database
  const { error: runError } = await supabase
    .from('compliance_test_runs')
    .insert({
      run_type: 'full-suite',
      run_mode: 'full-pipeline',
      state: null,
      triggered_by: 'scheduled',
      run_by: null,
      run_at: new Date().toISOString(),
      duration_ms: durationMs,
      summary,
      results,
    })

  if (runError) {
    console.error('Cron: Failed to save run:', runError)
  }

  return NextResponse.json({
    message: 'Scheduled run complete',
    count: properties.length,
    summary,
    durationMs,
  })
}
