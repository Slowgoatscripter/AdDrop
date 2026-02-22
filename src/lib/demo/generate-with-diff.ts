import { generateCampaign } from '@/lib/ai/generate';
import { ListingData } from '@/lib/types/listing';
import { PlatformId, CampaignKit } from '@/lib/types/campaign';
import { ComplianceAutoFix } from '@/lib/types/compliance';

/**
 * Traverse an object by dot-delimited path and replace `after` with `before`
 * only in the targeted leaf field.
 */
function revertAtPath(obj: Record<string, unknown>, path: string, before: string, after: string): void {
  const segments = path.split('.');
  // Walk to the parent, applying the replacement only at the leaf
  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (current == null || typeof current !== 'object') return;
    current = (current as Record<string, unknown>)[segments[i]];
  }
  if (current == null || typeof current !== 'object') return;

  const leafKey = segments[segments.length - 1];
  const leaf = (current as Record<string, unknown>)[leafKey];
  if (typeof leaf === 'string') {
    (current as Record<string, unknown>)[leafKey] = leaf.replaceAll(after, before);
  }
}

/**
 * Reconstructs the pre-compliance version of a campaign by reverting autoFixes.
 * Each autoFix stores the before (pre-compliance) and after (post-compliance) text.
 * The platform field is a dot-path (e.g. "MagazineFullPage.Professional.Headline")
 * so we walk to the exact field to avoid unintended replacements elsewhere.
 */
function revertAutoFixes(campaign: CampaignKit, autoFixes: ComplianceAutoFix[]): CampaignKit {
  if (!autoFixes || autoFixes.length === 0) {
    return campaign;
  }

  // Deep clone to avoid mutating the final campaign
  const raw: CampaignKit = JSON.parse(JSON.stringify(campaign));

  for (const fix of autoFixes) {
    const path = fix.platform;
    // Convert the first segment from PascalCase to camelCase to match CampaignKit keys
    const segments = path.split('.');
    segments[0] = segments[0].charAt(0).toLowerCase() + segments[0].slice(1);

    if (segments.length === 1) {
      // Single key — platform-level string field (e.g. "instagram")
      const key = segments[0] as keyof CampaignKit;
      const val = raw[key];
      if (typeof val === 'string') {
        (raw as unknown as Record<string, unknown>)[key] = val.replaceAll(fix.after, fix.before);
      }
    } else {
      // Dot-path — walk to the exact field
      revertAtPath(raw as unknown as Record<string, unknown>, segments.join('.'), fix.before, fix.after);
    }
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
