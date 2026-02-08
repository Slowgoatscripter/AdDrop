import { ListingData } from '@/lib/types';
import { getDefaultCompliance } from '@/lib/compliance';

export function buildGenerationPrompt(listing: ListingData): string {
  const compliance = getDefaultCompliance();
  const addr = listing.address;
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

  return `You are an expert real estate marketing copywriter. Generate a complete campaign kit for the following property listing.

## Property Details
- **Address:** ${fullAddress}
- **Price:** $${listing.price.toLocaleString()}
- **Bedrooms:** ${listing.beds}
- **Bathrooms:** ${listing.baths}
- **Square Feet:** ${listing.sqft.toLocaleString()}
${listing.lotSize ? `- **Lot Size:** ${listing.lotSize}` : ''}
${listing.yearBuilt ? `- **Year Built:** ${listing.yearBuilt}` : ''}
- **Property Type:** ${listing.propertyType}
${listing.features.length > 0 ? `- **Features:** ${listing.features.join(', ')}` : ''}
${listing.listingAgent ? `- **Listing Agent:** ${listing.listingAgent}` : ''}
${listing.broker ? `- **Broker:** ${listing.broker}` : ''}

## Listing Description
${listing.description || 'No description available — generate based on property details above.'}

## MLS Compliance Rules (${compliance.state})
- MLS: ${compliance.mlsName}
- Rules: ${compliance.rules.join('; ')}
- Required disclosures: ${compliance.requiredDisclosures.join('; ')}
- PROHIBITED TERMS (never use): ${compliance.prohibitedTerms.join(', ')}
${compliance.maxDescriptionLength ? `- Max MLS description length: ${compliance.maxDescriptionLength} characters` : ''}

## Output Requirements

Return a JSON object with EXACTLY this structure. Do not include any text outside the JSON.

{
  "instagram": {
    "professional": "Instagram caption, professional tone, emoji-friendly, max 2200 chars",
    "casual": "Instagram caption, casual/fun tone, emoji-friendly, max 2200 chars",
    "luxury": "Instagram caption, luxury/aspirational tone, emoji-friendly, max 2200 chars"
  },
  "facebook": {
    "professional": "Facebook post, professional tone, lifestyle-focused, 500-800 words",
    "casual": "Facebook post, casual conversational tone, 500-800 words",
    "luxury": "Facebook post, luxury/aspirational tone, 500-800 words"
  },
  "twitter": "Ultra-short tweet, max 280 chars, include key stats and link placeholder [LINK]",
  "googleAds": [
    { "headline": "Max 30 chars", "description": "Max 90 chars" },
    { "headline": "Max 30 chars", "description": "Max 90 chars" },
    { "headline": "Max 30 chars", "description": "Max 90 chars" }
  ],
  "metaAd": {
    "primaryText": "Engaging ad copy for Meta/Facebook paid ad, 125 chars ideal",
    "headline": "Attention-grabbing headline, max 40 chars",
    "description": "Supporting description, max 30 chars"
  },
  "magazineFullPage": {
    "professional": { "headline": "Print headline", "body": "Full page ad body copy", "cta": "Call to action" },
    "luxury": { "headline": "Print headline", "body": "Full page ad body copy", "cta": "Call to action" }
  },
  "magazineHalfPage": {
    "professional": { "headline": "Print headline", "body": "Condensed half page body", "cta": "Call to action" },
    "luxury": { "headline": "Print headline", "body": "Condensed half page body", "cta": "Call to action" }
  },
  "postcard": {
    "professional": { "front": { "headline": "Postcard front headline", "body": "Brief teaser", "cta": "Call to action" }, "back": "Back details text" },
    "casual": { "front": { "headline": "Postcard front headline", "body": "Brief teaser", "cta": "Call to action" }, "back": "Back details text" }
  },
  "zillow": "Zillow-optimized listing description, SEO-focused, professional tone",
  "realtorCom": "Realtor.com-optimized description, warm and informative tone",
  "homesComTrulia": "Homes.com/Trulia description, detail-oriented, professional tone",
  "mlsDescription": "MLS-compliant description, max ${compliance.maxDescriptionLength || 1000} chars, professional tone. MUST include required disclosures. MUST NOT use prohibited terms.",
  "hashtags": ["15-20 hashtags mixing broad (#realestate), local (#${addr.city?.replace(/\s/g, '') || 'Montana'}homes), and niche"],
  "callsToAction": ["CTA 1", "CTA 2", "CTA 3"],
  "targetingNotes": "Audience/geo targeting recommendations with suggested radius",
  "sellingPoints": ["Top selling point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
}

IMPORTANT RULES:
- Respect ALL character limits exactly
- Use MLS compliance rules for the mlsDescription
- Never use prohibited terms in ANY output
- Make each platform's copy feel native to that platform
- Hashtags should be a mix of broad reach + local + niche (15-20 total)
- Selling points ranked by marketing impact (best first)
- All copy must be Fair Housing compliant`;
}
