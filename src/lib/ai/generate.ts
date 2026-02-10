import OpenAI from 'openai';
import { ListingData, CampaignKit } from '@/lib/types';
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

export async function generateCampaign(listing: ListingData): Promise<CampaignKit> {
  const prompt = await buildGenerationPrompt(listing);

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
    max_completion_tokens: 16000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI model');
  }

  const generated = JSON.parse(content);

  const compliance = getDefaultCompliance();
  const campaignId = crypto.randomUUID();

  // Build a preliminary campaign to run compliance against
  let campaign: CampaignKit = {
    id: campaignId,
    listing,
    createdAt: new Date().toISOString(),
    instagram: generated.instagram,
    facebook: generated.facebook,
    twitter: generated.twitter,
    googleAds: generated.googleAds,
    metaAd: generated.metaAd,
    magazineFullPage: generated.magazineFullPage,
    magazineHalfPage: generated.magazineHalfPage,
    postcard: generated.postcard,
    zillow: generated.zillow,
    realtorCom: generated.realtorCom,
    homesComTrulia: generated.homesComTrulia,
    mlsDescription: generated.mlsDescription,
    complianceResult: { platforms: [], totalChecks: 0, totalPassed: 0, hardViolations: 0, softWarnings: 0, allPassed: true },
    hashtags: generated.hashtags,
    callsToAction: generated.callsToAction,
    targetingNotes: generated.targetingNotes,
    sellingPoints: generated.sellingPoints,
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
