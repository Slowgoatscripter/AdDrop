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

function getWriteClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for demo cache writes. Set it in environment variables.');
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

interface DemoCacheRow {
  property_id: string;
  campaign_result: unknown;
  compliance_result: unknown;
  quality_result: unknown;
  raw_campaign: unknown;
  generated_at: string;
  view_count: number;
}

export interface DemoCacheEntry {
  propertyId: string;
  campaign: CampaignKit;
  compliance: ComplianceAgentResult;
  quality: CampaignQualityResult | null;
  rawCampaign: CampaignKit;
  generatedAt: string;
}

function rowToEntry(data: DemoCacheRow): DemoCacheEntry {
  return {
    propertyId: data.property_id,
    campaign: data.campaign_result as CampaignKit,
    compliance: data.compliance_result as ComplianceAgentResult,
    quality: data.quality_result as CampaignQualityResult | null,
    rawCampaign: data.raw_campaign as CampaignKit,
    generatedAt: data.generated_at,
  };
}

export async function getDemoCacheEntry(propertyId?: string): Promise<DemoCacheEntry | null> {
  const supabase = getAnonClient();

  let data: DemoCacheRow | null = null;

  if (propertyId) {
    const result = await supabase
      .from('demo_cache')
      .select('*')
      .eq('property_id', propertyId)
      .single();
    data = result.data as DemoCacheRow | null;
  } else {
    // Get the entry with the lowest view_count (least recently served)
    const result = await supabase
      .from('demo_cache')
      .select('*')
      .order('view_count', { ascending: true })
      .limit(1);
    const rows = result.data as DemoCacheRow[] | null;
    data = rows && rows.length > 0 ? rows[0] : null;
  }

  if (!data) {
    return null;
  }

  const row = data;

  // Increment view_count asynchronously using service client (bypasses RLS)
  const serviceClient = getWriteClient();
  void serviceClient
    .from('demo_cache')
    .update({ view_count: row.view_count + 1 })
    .eq('property_id', row.property_id)
    .then(() => {
      // Trigger background refresh if thresholds met
      const newViewCount = row.view_count + 1;
      const ageMs = Date.now() - new Date(row.generated_at).getTime();
      if (newViewCount >= VIEW_COUNT_REFRESH_THRESHOLD || ageMs >= AGE_REFRESH_THRESHOLD_MS) {
        refreshDemoCache(row.property_id).catch((err: unknown) =>
          console.error('[demo-cache] Background refresh failed:', err)
        );
      }
    });

  return rowToEntry(row);
}

export async function getAllDemoCacheEntries(): Promise<DemoCacheEntry[]> {
  const supabase = getAnonClient();
  const { data } = await supabase
    .from('demo_cache')
    .select('*')
    .order('generated_at', { ascending: false });

  const rows = data as DemoCacheRow[] | null;
  if (!rows) return [];

  return rows.map(rowToEntry);
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

  const serviceClient = getWriteClient();
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
