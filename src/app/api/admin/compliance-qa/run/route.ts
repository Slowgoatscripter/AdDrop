import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { generateCampaign } from '@/lib/ai/generate';
import { scanTextWithAgent } from '@/lib/compliance/agent';
import { getComplianceSettings } from '@/lib/compliance/compliance-settings';
import type {
  RunRequest,
  RunResponse,
  RunSummary,
  PropertyTestResult,
  ComplianceTestProperty,
  PropertySnapshot,
} from '@/lib/types/compliance-qa';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const body: RunRequest = await request.json().catch(() => ({} as any));
    const { state, mode } = body;

    if (!mode || (mode !== 'snapshot' && mode !== 'full-pipeline')) {
      return NextResponse.json(
        { error: 'mode must be "snapshot" or "full-pipeline"' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Fetch test properties from database
    let query = supabase
      .from('compliance_test_properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data: properties, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch test properties' },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json(
        { error: 'No test properties found' },
        { status: 404 }
      );
    }

    const { config } = await getComplianceSettings();
    const results: PropertyTestResult[] = [];
    let totalViolations = 0;
    let totalAutoFixes = 0;
    let passedCount = 0;
    let failedCount = 0;

    // Process each property based on mode
    if (mode === 'full-pipeline') {
      // Full pipeline: generate campaign for each property
      for (const property of properties as ComplianceTestProperty[]) {
        try {
          // Run full generation pipeline (includes compliance agent)
          const campaign = await generateCampaign(property.listing_data);

          // Extract platform texts for snapshot
          const generatedText: Record<string, string> = {};
          if (campaign.instagram) {
            if (campaign.instagram.casual) generatedText['instagram.casual'] = campaign.instagram.casual;
            if (campaign.instagram.professional) generatedText['instagram.professional'] = campaign.instagram.professional;
            if (campaign.instagram.luxury) generatedText['instagram.luxury'] = campaign.instagram.luxury;
          }
          if (campaign.facebook) {
            if (campaign.facebook.casual) generatedText['facebook.casual'] = campaign.facebook.casual;
            if (campaign.facebook.professional) generatedText['facebook.professional'] = campaign.facebook.professional;
            if (campaign.facebook.luxury) generatedText['facebook.luxury'] = campaign.facebook.luxury;
          }
          if (campaign.twitter) generatedText['twitter'] = campaign.twitter;
          if (campaign.googleAds) {
            generatedText['googleAds'] = campaign.googleAds.map(ad =>
              `${ad.headline} - ${ad.description}`
            ).join('\n');
          }
          if (campaign.metaAd) {
            generatedText['metaAd'] = `${campaign.metaAd.headline}\n${campaign.metaAd.primaryText}\n${campaign.metaAd.description}`;
          }
          if (campaign.magazineFullPage) {
            if (campaign.magazineFullPage.professional) {
              generatedText['magazineFullPage.professional'] = campaign.magazineFullPage.professional.body;
            }
            if (campaign.magazineFullPage.luxury) {
              generatedText['magazineFullPage.luxury'] = campaign.magazineFullPage.luxury.body;
            }
          }
          if (campaign.magazineHalfPage) {
            if (campaign.magazineHalfPage.professional) {
              generatedText['magazineHalfPage.professional'] = campaign.magazineHalfPage.professional.body;
            }
            if (campaign.magazineHalfPage.luxury) {
              generatedText['magazineHalfPage.luxury'] = campaign.magazineHalfPage.luxury.body;
            }
          }
          if (campaign.postcard) {
            if (campaign.postcard.professional) {
              generatedText['postcard.professional'] = campaign.postcard.professional.front.body;
            }
            if (campaign.postcard.casual) {
              generatedText['postcard.casual'] = campaign.postcard.casual.front.body;
            }
          }
          if (campaign.zillow) generatedText['zillow'] = campaign.zillow;
          if (campaign.realtorCom) generatedText['realtorCom'] = campaign.realtorCom;
          if (campaign.homesComTrulia) generatedText['homesComTrulia'] = campaign.homesComTrulia;
          if (campaign.mlsDescription) generatedText['mlsDescription'] = campaign.mlsDescription;

          // Save snapshot
          await supabase.from('compliance_test_snapshots').insert({
            property_id: property.id,
            generated_text: generatedText,
            approved: false,
          });

          // Use compliance result from campaign
          const complianceResult = campaign.complianceResult;
          const passed = complianceResult.campaignVerdict === 'compliant';

          if (passed) passedCount++;
          else failedCount++;

          totalViolations += complianceResult.totalViolations;
          totalAutoFixes += complianceResult.totalAutoFixes;

          results.push({
            propertyId: property.id,
            propertyName: property.name,
            state: property.state,
            riskCategory: property.risk_category,
            passed,
            complianceResult,
            generatedText,
            qualityFixesApplied: campaign.qualityResult?.improvementsApplied || 0,
          });
        } catch (error) {
          console.error(`Error processing property ${property.id}:`, error);
          failedCount++;
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
          });
        }
      }
    } else {
      // Snapshot mode: scan approved snapshots
      for (const property of properties as ComplianceTestProperty[]) {
        try {
          // Fetch latest approved snapshot
          const { data: snapshots, error: snapshotError } = await supabase
            .from('compliance_test_snapshots')
            .select('*')
            .eq('property_id', property.id)
            .eq('approved', true)
            .order('created_at', { ascending: false })
            .limit(1);

          if (snapshotError || !snapshots || snapshots.length === 0) {
            // No approved snapshot - skip
            console.warn(`No approved snapshot for property ${property.id}`);
            failedCount++;
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
            });
            continue;
          }

          const snapshot = snapshots[0] as PropertySnapshot;
          const generatedText = snapshot.generated_text;

          // Scan each platform text with agent
          const allViolations = [];
          const allAutoFixes = [];
          let propertyViolations = 0;
          let propertyAutoFixes = 0;

          for (const [platform, text] of Object.entries(generatedText)) {
            const scanResult = await scanTextWithAgent(
              text,
              property.state,
              platform,
              config
            );

            allViolations.push(...scanResult.violations);
            allAutoFixes.push(...scanResult.autoFixes);
            propertyViolations += scanResult.totalViolations;
            propertyAutoFixes += scanResult.totalAutoFixes;
          }

          // Aggregate result
          const passed = propertyViolations === 0;
          if (passed) passedCount++;
          else failedCount++;

          totalViolations += propertyViolations;
          totalAutoFixes += propertyAutoFixes;

          results.push({
            propertyId: property.id,
            propertyName: property.name,
            state: property.state,
            riskCategory: property.risk_category,
            passed,
            complianceResult: {
              platforms: [],
              campaignVerdict: passed ? 'compliant' : 'needs-review',
              violations: allViolations,
              autoFixes: allAutoFixes,
              totalViolations: propertyViolations,
              totalAutoFixes: propertyAutoFixes,
            },
          });
        } catch (error) {
          console.error(`Error processing property ${property.id}:`, error);
          failedCount++;
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
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Calculate summary
    const summary: RunSummary = {
      totalProperties: properties.length,
      passed: passedCount,
      failed: failedCount,
      totalViolationsFound: totalViolations,
      totalAutoFixes: totalAutoFixes,
      averageViolationsPerProperty:
        properties.length > 0 ? totalViolations / properties.length : 0,
    };

    // Save run to database
    const { data: runData, error: runError } = await supabase
      .from('compliance_test_runs')
      .insert({
        run_type: state ? 'single-state' : 'full-suite',
        run_mode: mode,
        state: state ? state.toUpperCase() : null,
        triggered_by: 'manual',
        run_by: user.id,
        run_at: new Date().toISOString(),
        duration_ms: durationMs,
        summary,
        results,
      })
      .select()
      .single();

    if (runError) {
      console.error('Failed to save run:', runError);
    }

    const response: RunResponse = {
      runId: runData?.id || 'error-no-id',
      summary,
      results,
      durationMs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Run error:', error);
    return NextResponse.json(
      { error: 'Failed to run test suite' },
      { status: 500 }
    );
  }
}
