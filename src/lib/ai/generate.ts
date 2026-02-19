import OpenAI from 'openai';
import { ListingData, CampaignKit, PlatformId, ALL_PLATFORMS } from '@/lib/types';
import { rewriteForCompliance } from '@/lib/compliance/agent';
import { scanForProhibitedTerms } from '@/lib/compliance/regex-scan';
import { extractAdCopyTexts } from '@/lib/compliance/utils';
import { getComplianceSettings } from '@/lib/compliance/compliance-settings';
import { buildGenerationPrompt } from './prompt';
import {
  checkAllPlatformQuality,
  scoreAllPlatformQuality,
  mergeQualityResults,
  buildQualitySuggestions,
  enforceConstraints,
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

export interface GenerateOptions {
  platforms?: PlatformId[];
  demographic?: string;
  tone?: 'professional' | 'casual' | 'luxury';
}

export async function generateCampaign(
  listing: ListingData,
  platformsOrOptions?: PlatformId[] | GenerateOptions
): Promise<CampaignKit> {
  // Support both legacy (platforms array) and new options-object signatures
  const opts: GenerateOptions =
    Array.isArray(platformsOrOptions)
      ? { platforms: platformsOrOptions }
      : platformsOrOptions ?? {};
  const { platforms, demographic, tone } = opts;
  // undefined platforms = generate all (backward compatible, Review Fix #5)
  const targetPlatforms = platforms ?? ALL_PLATFORMS;

  const prompt = await buildGenerationPrompt(listing, undefined, undefined, {
    platforms: targetPlatforms,
    demographic,
  });

  const maxTokens = getMaxCompletionTokens(targetPlatforms.length);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content: 'You are a real estate marketing expert specializing in platform-native ad copy. Generate compelling, specific marketing content. Always respond with valid JSON only. No markdown, no code fences, no explanatory text.\n\nImportant: All copy must comply with the Fair Housing Act. Never target or exclude based on protected classes. Describe property features, not ideal residents.',
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

  const { config, stateCode } = await getComplianceSettings();
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
    complianceResult: { platforms: [], campaignVerdict: 'compliant' as const, violations: [], autoFixes: [], totalViolations: 0, totalAutoFixes: 0 },
    selectedPlatforms: targetPlatforms,
    stateCode,
    // Strategy fields — always present
    hashtags: (generated.hashtags as string[]) ?? [],
    callsToAction: (generated.callsToAction as string[]) ?? [],
    targetingNotes: (generated.targetingNotes as string) ?? '',
    sellingPoints: (generated.sellingPoints as string[]) ?? [],
  };

  // --- Constraint Enforcement (instant) ---
  const { campaign: constrainedCampaign, constraints } = enforceConstraints(campaign, config);
  campaign = constrainedCampaign;

  // --- Compliance Regex Pre-Scan ---
  const adCopyTexts = extractAdCopyTexts(campaign);
  const regexFindings = scanForProhibitedTerms(adCopyTexts, config);

  // --- Phase 2: Compliance Rewrite ---
  try {
    const { campaign: compliantCampaign, complianceResult } =
      await rewriteForCompliance(campaign, config, regexFindings);
    campaign = compliantCampaign;
    campaign.complianceResult = { ...complianceResult, complianceRewriteApplied: true, source: 'rewrite' };
  } catch (error) {
    console.error('Phase 2 compliance rewrite failed:', error);
    campaign.complianceResult = {
      platforms: [], campaignVerdict: 'needs-review',
      violations: [], autoFixes: [],
      totalViolations: regexFindings.length, totalAutoFixes: 0,
      complianceRewriteApplied: false, source: 'rewrite',
    };
  }

  // --- Quality Check (read-only — suggestions only) ---
  const regexQuality = checkAllPlatformQuality(campaign);
  const aiQuality = await scoreAllPlatformQuality(campaign, listing, demographic, tone);
  const mergedQuality = mergeQualityResults(regexQuality, aiQuality);
  const qualitySuggestions = buildQualitySuggestions(mergedQuality);

  // --- Return with new fields ---
  campaign.qualityConstraints = constraints;
  campaign.qualitySuggestions = qualitySuggestions;
  // Backward compatibility: keep qualityResult for transition period
  campaign.qualityResult = mergedQuality;

  return campaign;
}
