import { CampaignKit, ProhibitedTerm } from '@/lib/types';

/**
 * Extract all text fields from a CampaignKit, returning [platformLabel, text] pairs.
 */
export function extractPlatformTexts(campaign: CampaignKit): [string, string][] {
  const texts: [string, string][] = [];

  // Instagram (3 tones)
  if (campaign.instagram) {
    for (const [tone, text] of Object.entries(campaign.instagram)) {
      if (typeof text === 'string') texts.push([`instagram.${tone}`, text]);
    }
  }

  // Facebook (3 tones)
  if (campaign.facebook) {
    for (const [tone, text] of Object.entries(campaign.facebook)) {
      if (typeof text === 'string') texts.push([`facebook.${tone}`, text]);
    }
  }

  // Twitter
  if (campaign.twitter) texts.push(['twitter', campaign.twitter]);

  // Google Ads
  if (campaign.googleAds) {
    campaign.googleAds.forEach((ad, i) => {
      if (ad.headline) texts.push([`googleAds[${i}].headline`, ad.headline]);
      if (ad.description) texts.push([`googleAds[${i}].description`, ad.description]);
    });
  }

  // Meta Ad
  if (campaign.metaAd) {
    if (campaign.metaAd.primaryText) texts.push(['metaAd.primaryText', campaign.metaAd.primaryText]);
    if (campaign.metaAd.headline) texts.push(['metaAd.headline', campaign.metaAd.headline]);
    if (campaign.metaAd.description) texts.push(['metaAd.description', campaign.metaAd.description]);
  }

  // Magazine Full Page
  if (campaign.magazineFullPage) {
    for (const [style, ad] of Object.entries(campaign.magazineFullPage)) {
      if (ad.headline) texts.push([`magazineFullPage.${style}.headline`, ad.headline]);
      if (ad.body) texts.push([`magazineFullPage.${style}.body`, ad.body]);
      if (ad.cta) texts.push([`magazineFullPage.${style}.cta`, ad.cta]);
    }
  }

  // Magazine Half Page
  if (campaign.magazineHalfPage) {
    for (const [style, ad] of Object.entries(campaign.magazineHalfPage)) {
      if (ad.headline) texts.push([`magazineHalfPage.${style}.headline`, ad.headline]);
      if (ad.body) texts.push([`magazineHalfPage.${style}.body`, ad.body]);
      if (ad.cta) texts.push([`magazineHalfPage.${style}.cta`, ad.cta]);
    }
  }

  // Postcards
  if (campaign.postcard) {
    for (const [style, card] of Object.entries(campaign.postcard)) {
      if (card.front) {
        if (card.front.headline) texts.push([`postcard.${style}.front.headline`, card.front.headline]);
        if (card.front.body) texts.push([`postcard.${style}.front.body`, card.front.body]);
        if (card.front.cta) texts.push([`postcard.${style}.front.cta`, card.front.cta]);
      }
      if (card.back) texts.push([`postcard.${style}.back`, card.back]);
    }
  }

  // Listing platforms
  if (campaign.zillow) texts.push(['zillow', campaign.zillow]);
  if (campaign.realtorCom) texts.push(['realtorCom', campaign.realtorCom]);
  if (campaign.homesComTrulia) texts.push(['homesComTrulia', campaign.homesComTrulia]);
  if (campaign.mlsDescription) texts.push(['mlsDescription', campaign.mlsDescription]);

  // Hashtags
  if (campaign.hashtags) {
    const hashtagText = campaign.hashtags.join(' ');
    if (hashtagText.trim()) texts.push(['hashtags', hashtagText]);
  }

  // Calls to action
  if (campaign.callsToAction) {
    const ctaText = campaign.callsToAction.join(' ');
    if (ctaText.trim()) texts.push(['callsToAction', ctaText]);
  }

  // Targeting notes
  if (campaign.targetingNotes) texts.push(['targetingNotes', campaign.targetingNotes]);

  // Selling points
  if (campaign.sellingPoints) {
    const spText = campaign.sellingPoints.join(' ');
    if (spText.trim()) texts.push(['sellingPoints', spText]);
  }

  return texts;
}

/**
 * Format prohibited terms grouped by category as readable text for AI prompts.
 * Groups terms by category and formats each as a list item with details.
 */
export function formatTermsForPrompt(terms: ProhibitedTerm[]): string {
  const grouped = new Map<string, ProhibitedTerm[]>();
  for (const t of terms) {
    const existing = grouped.get(t.category) ?? [];
    existing.push(t);
    grouped.set(t.category, existing);
  }

  const sections: string[] = [];
  for (const [category, categoryTerms] of grouped) {
    const lines = categoryTerms.map(t =>
      `- "${t.term}" (${t.severity}) → use "${t.suggestedAlternative}" instead [${t.law}]`
    );
    sections.push(`### ${category}\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}
