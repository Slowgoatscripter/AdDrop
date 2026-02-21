import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { CampaignKit, ComplianceAgentResult } from '@/lib/types';
import { CampaignQualityResult } from '@/lib/types/quality';
import { SAMPLE_PROPERTIES, ALL_PLATFORM_IDS } from './sample-properties';
import { generateWithDiff } from './generate-with-diff';

const VIEW_COUNT_REFRESH_THRESHOLD = 50;
const AGE_REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

function getPropertyId(street: string): string {
  return street.toLowerCase().replace(/\s+/g, '-');
}

function getAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface DemoCacheEntry {
  propertyId: string;
  campaign: CampaignKit;
  compliance: ComplianceAgentResult;
  quality: CampaignQualityResult | null;
  rawCampaign: CampaignKit;
  generatedAt: string;
}

export async function getDemoCacheEntry(propertyId?: string): Promise<DemoCacheEntry | null> {
  const supabase = getAnonClient();

  let query = supabase.from('demo_cache').select('*');

  if (propertyId) {
    query = query.eq('property_id', propertyId).single();
  } else {
    query = query.order('view_count', { ascending: true }).limit(1).single();
  }

  const { data, error } = await query;

  if (error || !data) {
    return null;
  }

  // Increment view_count asynchronously using service client (bypasses RLS)
  const serviceClient = getServiceClient();
  serviceClient
    .from('demo_cache')
    .update({ view_count: data.view_count + 1 })
    .eq('property_id', data.property_id)
    .then(() => {
      // Trigger background refresh if thresholds met
      const newViewCount = data.view_count + 1;
      const ageMs = Date.now() - new Date(data.generated_at).getTime();
      if (newViewCount >= VIEW_COUNT_REFRESH_THRESHOLD || ageMs >= AGE_REFRESH_THRESHOLD_MS) {
        refreshDemoCache(data.property_id).catch((err) =>
          console.error('[demo-cache] Background refresh failed:', err)
        );
      }
    })
    .catch((err) => console.error('[demo-cache] Failed to increment view_count:', err));

  return {
    propertyId: data.property_id,
    campaign: data.campaign_result as CampaignKit,
    compliance: data.compliance_result as ComplianceAgentResult,
    quality: data.quality_result as CampaignQualityResult | null,
    rawCampaign: data.raw_campaign as CampaignKit,
    generatedAt: data.generated_at,
  };
}

export async function getAllDemoCacheEntries(): Promise<DemoCacheEntry[]> {
  const supabase = getAnonClient();
  const { data, error } = await supabase.from('demo_cache').select('*').order('generated_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    propertyId: row.property_id,
    campaign: row.campaign_result as CampaignKit,
    compliance: row.compliance_result as ComplianceAgentResult,
    quality: row.quality_result as CampaignQualityResult | null,
    rawCampaign: row.raw_campaign as CampaignKit,
    generatedAt: row.generated_at,
  }));
}

export async function refreshDemoCache(propertyId: string): Promise<void> {
  const property = SAMPLE_PROPERTIES.find(
    (p) => getPropertyId(p.address.street) === propertyId
  );

  if (!property) {
    throw new Error(`No sample property found for propertyId: ${propertyId}`);
  }

  const platforms = [...ALL_PLATFORM_IDS];
  const { finalCampaign, rawCampaign } = await generateWithDiff(property, platforms);

  const serviceClient = getServiceClient();
  const { error } = await serviceClient.from('demo_cache').upsert(
    {
      property_id: propertyId,
      campaign_result: finalCampaign,
      compliance_result: finalCampaign.complianceResult,
      quality_result: finalCampaign.qualityResult ?? null,
      raw_campaign: rawCampaign,
      generated_at: new Date().toISOString(),
      view_count: 0,
    },
    { onConflict: 'property_id' }
  );

  if (error) {
    throw new Error(`Failed to upsert demo cache for ${propertyId}: ${error.message}`);
  }
}

export async function seedDemoCache(): Promise<void> {
  await Promise.all(
    SAMPLE_PROPERTIES.map((property) =>
      refreshDemoCache(getPropertyId(property.address.street))
    )
  );
}

