import OpenAI from 'openai';
import { ListingData, CampaignKit, PlatformId, ALL_PLATFORMS } from '@/lib/types';
import { checkAllPlatforms, getDefaultCompliance } from '@/lib/compliance/engine';
import { buildGenerationPrompt } from './prompt';
import {
  checkAllPlatformQuality,
  scoreAllPlatformQuality,
  mergeQualityResults,
  autoFixQuality,
} from '@/lib/quality';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Compute max_completion_tokens based on platform count with 1.3x safety margin (Review Fix #7).
 */
function getMaxCompletionTokens(platformCount: number): number {
  let base: number;
  if (platformCount >= 10) {
    base = 16000;
  } else if (platformCount >= 6) {
    base = 12000;
  } else if (platformCount >= 3) {
    base = 8000;
  } else {
    base = 4000;
  }
  return Math.round(base * 1.3);
}

/**
 * Strip hallucinated platforms from parsed output (Review Fix #4).
 * Only keeps platform fields that were requested, plus strategy fields.
 */
function stripToRequestedPlatforms(
  generated: Record<string, unknown>,
  platforms: PlatformId[]
): Record<string, unknown> {
  const allowed = new Set<string>(platforms);
  const strategyKeys = ['hashtags', 'callsToAction', 'targetingNotes', 'sellingPoints'];

  const stripped: Record<string, unknown> = {};
  for (const key of Object.keys(generated)) {
    if (allowed.has(key as PlatformId) || strategyKeys.includes(key)) {
      stripped[key] = generated[key];
    }
  }
  return stripped;
}

export async function generateCampaign(
  listing: ListingData,
  platforms?: PlatformId[]
): Promise<CampaignKit> {
  // undefined platforms = generate all (backward compatible, Review Fix #5)
  const targetPlatforms = platforms ?? ALL_PLATFORMS;

  const prompt = await buildGenerationPrompt(listing, undefined, undefined, {
    platforms: targetPlatforms,
  });

  const maxTokens = getMaxCompletionTokens(targetPlatforms.length);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content: 'You are a real estate marketing expert. Always respond with valid JSON only. No markdown, no code fences, no explanatory text.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_completion_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI model');
  }

  const rawGenerated = JSON.parse(content);

  // Strip hallucinated platforms — only keep requested + strategy (Review Fix #4)
  const generated = stripToRequestedPlatforms(rawGenerated, targetPlatforms);

  const compliance = getDefaultCompliance();
  const campaignId = crypto.randomUUID();

  // Build campaign with only requested platform fields
  // eslint-disable-next-line
  const gen = generated as any;
  let campaign: CampaignKit = {
    id: campaignId,
    listing,
    createdAt: new Date().toISOString(),
    // Platform fields — only populated if requested
    ...(gen.instagram ? { instagram: gen.instagram } : {}),
    ...(gen.facebook ? { facebook: gen.facebook } : {}),
    ...(gen.twitter ? { twitter: gen.twitter } : {}),
    ...(gen.googleAds ? { googleAds: gen.googleAds } : {}),
    ...(gen.metaAd ? { metaAd: gen.metaAd } : {}),
    ...(gen.magazineFullPage ? { magazineFullPage: gen.magazineFullPage } : {}),
    ...(gen.magazineHalfPage ? { magazineHalfPage: gen.magazineHalfPage } : {}),
    ...(gen.postcard ? { postcard: gen.postcard } : {}),
    ...(gen.zillow ? { zillow: gen.zillow } : {}),
    ...(gen.realtorCom ? { realtorCom: gen.realtorCom } : {}),
    ...(gen.homesComTrulia ? { homesComTrulia: gen.homesComTrulia } : {}),
    ...(gen.mlsDescription ? { mlsDescription: gen.mlsDescription } : {}),
    // Metadata
    complianceResult: { platforms: [], totalChecks: 0, totalPassed: 0, hardViolations: 0, softWarnings: 0, allPassed: true },
    selectedPlatforms: targetPlatforms,
    // Strategy fields — always present
    hashtags: (generated.hashtags as string[]) ?? [],
    callsToAction: (generated.callsToAction as string[]) ?? [],
    targetingNotes: (generated.targetingNotes as string) ?? '',
    sellingPoints: (generated.sellingPoints as string[]) ?? [],
  };

  // Run full compliance check across all platforms
  campaign.complianceResult = checkAllPlatforms(campaign, compliance);

  // Run quality checks (regex layer — instant)
  const regexQuality = checkAllPlatformQuality(campaign);

  // Run AI quality scoring (async — ~2-3 sec)
  const aiQuality = await scoreAllPlatformQuality(campaign, listing);

  // Merge regex + AI quality results
  const mergedQuality = mergeQualityResults(regexQuality, aiQuality);

  // Auto-fix quality issues (regex fixes + AI rewrites)
  const { campaign: fixedCampaign, qualityResult } = await autoFixQuality(campaign, mergedQuality);

  // Apply fixed campaign and store quality result
  campaign = { ...fixedCampaign, qualityResult };

  return campaign;
}
