import { generateCampaign } from '@/lib/ai/generate';
import { ListingData } from '@/lib/types/listing';
import { PlatformId, CampaignKit } from '@/lib/types/campaign';
import { ComplianceAutoFix } from '@/lib/types/compliance';

/**
 * Reconstructs the pre-compliance version of a campaign by reverting autoFixes.
 * Each autoFix stores the before (pre-compliance) and after (post-compliance) text.
 * We swap `after` back to `before` in the platform text to get the raw campaign.
 */
function revertAutoFixes(campaign: CampaignKit, autoFixes: ComplianceAutoFix[]): CampaignKit {
  if (!autoFixes || autoFixes.length === 0) {
    return campaign;
  }

  // Deep clone to avoid mutating the final campaign
  const raw: CampaignKit = JSON.parse(JSON.stringify(campaign));

  for (const fix of autoFixes) {
    const platform = fix.platform as keyof CampaignKit;
    const platformData = raw[platform];
    if (!platformData) continue;

    // Replace all occurrences of `after` with `before` in the platform's JSON representation
    const platformStr = JSON.stringify(platformData);
    const reverted = platformStr.split(fix.after).join(fix.before);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw as any)[platform] = JSON.parse(reverted);
  }

  return raw;
}

export async function generateWithDiff(
  listing: ListingData,
  platforms: PlatformId[]
): Promise<{ finalCampaign: CampaignKit; rawCampaign: CampaignKit }> {
  const finalCampaign = await generateCampaign(listing, { platforms });

  const autoFixes = finalCampaign.complianceResult?.autoFixes ?? [];
  const rawCampaign = revertAutoFixes(finalCampaign, autoFixes);

  return { finalCampaign, rawCampaign };
}
