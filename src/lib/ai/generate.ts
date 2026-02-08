import OpenAI from 'openai';
import { ListingData, CampaignKit } from '@/lib/types';
import { checkCompliance, getDefaultCompliance } from '@/lib/compliance';
import { buildGenerationPrompt } from './prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCampaign(listing: ListingData): Promise<CampaignKit> {
  const prompt = buildGenerationPrompt(listing);

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
  const complianceResults = checkCompliance(generated.mlsDescription || '', compliance);

  const campaignId = crypto.randomUUID();

  return {
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
    mlsComplianceChecklist: complianceResults,
    hashtags: generated.hashtags,
    callsToAction: generated.callsToAction,
    targetingNotes: generated.targetingNotes,
    sellingPoints: generated.sellingPoints,
  };
}
