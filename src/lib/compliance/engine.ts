import {
  MLSComplianceConfig,
  ComplianceViolation,
  PlatformComplianceResult,
  CampaignComplianceResult,
  CampaignKit,
} from '@/lib/types';
import { montanaCompliance } from './montana';

export const complianceConfigs: Record<string, MLSComplianceConfig> = {
  MT: montanaCompliance,
};

export function getComplianceConfig(stateCode: string): MLSComplianceConfig | null {
  return complianceConfigs[stateCode.toUpperCase()] ?? null;
}

export function getDefaultCompliance(): MLSComplianceConfig {
  return montanaCompliance;
}

/**
 * Build a word-boundary regex for a prohibited term.
 * Handles hyphenated variants: "family-friendly" matches "family friendly" and "family-friendly".
 */
export function buildTermRegex(term: string): RegExp {
  // Escape special regex chars except hyphens (handled specially)
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Replace hyphens and spaces with a pattern that matches either
  const pattern = escaped.replace(/[-\s]+/g, '[\\s\\-]+');
  return new RegExp(`\\b${pattern}\\b`, 'gi');
}

/**
 * Extract a context snippet around a match position.
 * Returns ~30 chars before and after the match.
 */
function extractContext(text: string, matchStart: number, matchEnd: number): string {
  const contextBefore = 30;
  const contextAfter = 30;
  const start = Math.max(0, matchStart - contextBefore);
  const end = Math.min(text.length, matchEnd + contextAfter);
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '...';
  return snippet;
}

/**
 * Find all compliance violations in a single text string.
 */
export function findViolations(
  text: string,
  platform: string,
  config: MLSComplianceConfig
): ComplianceViolation[] {
  if (!text || text.trim().length === 0) return [];

  const violations: ComplianceViolation[] = [];

  for (const prohibitedTerm of config.prohibitedTerms) {
    const regex = buildTermRegex(prohibitedTerm.term);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      violations.push({
        platform,
        term: match[0],
        category: prohibitedTerm.category,
        severity: prohibitedTerm.severity,
        explanation: prohibitedTerm.shortExplanation,
        law: prohibitedTerm.law,
        alternative: prohibitedTerm.suggestedAlternative,
        context: extractContext(text, match.index, match.index + match[0].length),
      });
      // Only report first occurrence per term per text
      break;
    }
  }

  return violations;
}

/**
 * Extract all text fields from a CampaignKit, returning [platformLabel, text] pairs.
 */
function extractPlatformTexts(campaign: CampaignKit): [string, string][] {
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
 * Check all platforms in a campaign kit for compliance violations.
 */
export function checkAllPlatforms(
  campaign: CampaignKit,
  config: MLSComplianceConfig
): CampaignComplianceResult {
  const platformTexts = extractPlatformTexts(campaign);
  const platformResults: PlatformComplianceResult[] = [];

  for (const [platform, text] of platformTexts) {
    const violations = findViolations(text, platform, config);
    const hardCount = violations.filter(v => v.severity === 'hard').length;
    const softCount = violations.filter(v => v.severity === 'soft').length;

    platformResults.push({
      platform,
      violations,
      passed: violations.length === 0,
      hardCount,
      softCount,
    });
  }

  const totalChecks = platformResults.length;
  const totalPassed = platformResults.filter(p => p.passed).length;
  const hardViolations = platformResults.reduce((sum, p) => sum + p.hardCount, 0);
  const softWarnings = platformResults.reduce((sum, p) => sum + p.softCount, 0);

  return {
    platforms: platformResults,
    totalChecks,
    totalPassed,
    hardViolations,
    softWarnings,
    allPassed: hardViolations === 0 && softWarnings === 0,
  };
}

/**
 * Auto-fix a single text by replacing violations with their suggested alternatives.
 * Preserves case: if the original was capitalized, the replacement will be too.
 */
export function autoFixText(text: string, violations: ComplianceViolation[]): string {
  let result = text;

  for (const violation of violations) {
    const regex = buildTermRegex(violation.term);
    result = result.replace(regex, (matched) => {
      const alt = violation.alternative;
      // Preserve case: if matched is all caps, make alternative all caps
      if (matched === matched.toUpperCase() && matched !== matched.toLowerCase()) {
        return alt.toUpperCase();
      }
      // If matched starts with uppercase, capitalize first letter of alternative
      if (matched[0] === matched[0].toUpperCase() && matched[0] !== matched[0].toLowerCase()) {
        return alt.charAt(0).toUpperCase() + alt.slice(1);
      }
      return alt;
    });
  }

  return result;
}

/**
 * Auto-fix an entire campaign kit. Returns a new campaign kit with all violations replaced.
 */
export function autoFixCampaign(
  campaign: CampaignKit,
  complianceResult: CampaignComplianceResult
): CampaignKit {
  // Deep clone the campaign to avoid mutation
  const fixed = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

  // Build a map of platform -> violations for quick lookup
  const violationsByPlatform = new Map<string, ComplianceViolation[]>();
  for (const platformResult of complianceResult.platforms) {
    if (platformResult.violations.length > 0) {
      violationsByPlatform.set(platformResult.platform, platformResult.violations);
    }
  }

  // Helper to fix a value if it has violations
  const fix = (platform: string, text: string): string => {
    const violations = violationsByPlatform.get(platform);
    if (!violations || violations.length === 0) return text;
    return autoFixText(text, violations);
  };

  // Instagram
  if (fixed.instagram) {
    for (const tone of Object.keys(fixed.instagram) as Array<keyof typeof fixed.instagram>) {
      fixed.instagram[tone] = fix(`instagram.${tone}`, fixed.instagram[tone]);
    }
  }

  // Facebook
  if (fixed.facebook) {
    for (const tone of Object.keys(fixed.facebook) as Array<keyof typeof fixed.facebook>) {
      fixed.facebook[tone] = fix(`facebook.${tone}`, fixed.facebook[tone]);
    }
  }

  // Twitter
  if (fixed.twitter) fixed.twitter = fix('twitter', fixed.twitter);

  // Google Ads
  if (fixed.googleAds) {
    fixed.googleAds.forEach((ad, i) => {
      ad.headline = fix(`googleAds[${i}].headline`, ad.headline);
      ad.description = fix(`googleAds[${i}].description`, ad.description);
    });
  }

  // Meta Ad
  if (fixed.metaAd) {
    fixed.metaAd.primaryText = fix('metaAd.primaryText', fixed.metaAd.primaryText);
    fixed.metaAd.headline = fix('metaAd.headline', fixed.metaAd.headline);
    fixed.metaAd.description = fix('metaAd.description', fixed.metaAd.description);
  }

  // Magazine Full Page
  if (fixed.magazineFullPage) {
    for (const [style, ad] of Object.entries(fixed.magazineFullPage)) {
      ad.headline = fix(`magazineFullPage.${style}.headline`, ad.headline);
      ad.body = fix(`magazineFullPage.${style}.body`, ad.body);
      ad.cta = fix(`magazineFullPage.${style}.cta`, ad.cta);
    }
  }

  // Magazine Half Page
  if (fixed.magazineHalfPage) {
    for (const [style, ad] of Object.entries(fixed.magazineHalfPage)) {
      ad.headline = fix(`magazineHalfPage.${style}.headline`, ad.headline);
      ad.body = fix(`magazineHalfPage.${style}.body`, ad.body);
      ad.cta = fix(`magazineHalfPage.${style}.cta`, ad.cta);
    }
  }

  // Postcards
  if (fixed.postcard) {
    for (const [style, card] of Object.entries(fixed.postcard)) {
      if (card.front) {
        card.front.headline = fix(`postcard.${style}.front.headline`, card.front.headline);
        card.front.body = fix(`postcard.${style}.front.body`, card.front.body);
        card.front.cta = fix(`postcard.${style}.front.cta`, card.front.cta);
      }
      if (card.back) {
        (fixed.postcard as Record<string, { front: any; back: string }>)[style].back = fix(
          `postcard.${style}.back`,
          card.back
        );
      }
    }
  }

  // Listing platforms
  if (fixed.zillow) fixed.zillow = fix('zillow', fixed.zillow);
  if (fixed.realtorCom) fixed.realtorCom = fix('realtorCom', fixed.realtorCom);
  if (fixed.homesComTrulia) fixed.homesComTrulia = fix('homesComTrulia', fixed.homesComTrulia);
  if (fixed.mlsDescription) fixed.mlsDescription = fix('mlsDescription', fixed.mlsDescription);

  // Hashtags
  if (fixed.hashtags) {
    const hashtagViolations = violationsByPlatform.get('hashtags');
    if (hashtagViolations && hashtagViolations.length > 0) {
      fixed.hashtags = fixed.hashtags.map(h => autoFixText(h, hashtagViolations));
    }
  }

  // Calls to action
  if (fixed.callsToAction) {
    const ctaViolations = violationsByPlatform.get('callsToAction');
    if (ctaViolations && ctaViolations.length > 0) {
      fixed.callsToAction = fixed.callsToAction.map(c => autoFixText(c, ctaViolations));
    }
  }

  // Targeting notes
  if (fixed.targetingNotes) fixed.targetingNotes = fix('targetingNotes', fixed.targetingNotes);

  // Selling points
  if (fixed.sellingPoints) {
    const spViolations = violationsByPlatform.get('sellingPoints');
    if (spViolations && spViolations.length > 0) {
      fixed.sellingPoints = fixed.sellingPoints.map(s => autoFixText(s, spViolations));
    }
  }

  return fixed;
}

// Backward compatibility: simple check for a single text
export function checkCompliance(
  text: string,
  config: MLSComplianceConfig
): { passed: boolean; rule: string; detail?: string }[] {
  const results: { passed: boolean; rule: string; detail?: string }[] = [];

  for (const term of config.prohibitedTerms) {
    const regex = buildTermRegex(term.term);
    const found = regex.test(text);
    results.push({
      passed: !found,
      rule: `No prohibited term: "${term.term}"`,
      detail: found ? `Found "${term.term}" in description` : undefined,
    });
  }

  if (config.maxDescriptionLength) {
    const withinLimit = text.length <= config.maxDescriptionLength;
    results.push({
      passed: withinLimit,
      rule: `Max ${config.maxDescriptionLength} characters`,
      detail: withinLimit
        ? undefined
        : `Description is ${text.length} characters (${text.length - config.maxDescriptionLength} over limit)`,
    });
  }

  return results;
}
