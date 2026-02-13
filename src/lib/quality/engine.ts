import {
  QualityRule,
  QualityIssue,
  PlatformQualityResult,
  CampaignQualityResult,
  PlatformFormat,
} from '@/lib/types/quality';
import { CampaignKit } from '@/lib/types/campaign';
import { qualityRules, platformFormats } from './rules';

/**
 * Build a word-boundary regex for a quality rule pattern.
 * Patterns prefixed with "regex:" are treated as literal regex.
 * All others get word-boundary wrapping (same as compliance).
 */
export function buildRuleRegex(pattern: string): RegExp {
  if (pattern.startsWith('regex:')) {
    const raw = pattern.slice(6);
    // Add unicode flag when pattern uses \u{} escapes
    const flags = raw.includes('\\u{') ? 'giu' : 'gi';
    return new RegExp(raw, flags);
  }
  // Escape special regex chars except hyphens (handled specially)
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Replace hyphens and spaces with a pattern that matches either
  const flexible = escaped.replace(/[-\s]+/g, '[\\s\\-]+');
  return new RegExp(`\\b${flexible}\\b`, 'gi');
}

/**
 * Extract a context snippet around a match position.
 */
function extractContext(text: string, matchStart: number, matchEnd: number): string {
  const before = 30;
  const after = 30;
  const start = Math.max(0, matchStart - before);
  const end = Math.min(text.length, matchEnd + after);
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '...';
  return snippet;
}

/**
 * Find quality issues in a single text string using regex rules.
 */
export function findQualityIssues(
  text: string,
  platform: string,
  rules?: QualityRule[]
): QualityIssue[] {
  if (!text || text.trim().length === 0) return [];

  const activeRules = rules || qualityRules;
  const issues: QualityIssue[] = [];

  for (const rule of activeRules) {
    // Skip rules that don't apply to this platform
    if (rule.platforms && rule.platforms.length > 0) {
      const matchesPlatform = rule.platforms.some(p => platform.startsWith(p));
      if (!matchesPlatform) continue;
    }

    const regex = buildRuleRegex(rule.pattern);
    const match = regex.exec(text);

    if (match) {
      issues.push({
        platform,
        category: rule.category,
        priority: rule.priority,
        source: 'regex',
        issue: rule.shortExplanation,
        suggestedFix: rule.suggestedFix,
        context: extractContext(text, match.index, match.index + match[0].length),
        originalText: match[0],
      });
    }
  }

  return issues;
}

/**
 * Check platform format constraints (character limits, hashtags, CTA presence).
 */
export function checkPlatformFormat(
  text: string,
  platform: string
): QualityIssue[] {
  const format = platformFormats[platform];
  if (!format) return [];

  const issues: QualityIssue[] = [];

  // Character limit check
  if (format.maxChars && text.length > format.maxChars) {
    issues.push({
      platform,
      category: 'platform-format',
      priority: 'required',
      source: 'regex',
      issue: `Text exceeds ${platform} character limit (${text.length}/${format.maxChars})`,
      suggestedFix: `Trim to ${format.maxChars} characters`,
    });
  }

  // Hashtag count (for Instagram and similar)
  if (format.maxHashtags || format.minHashtags) {
    const hashtagCount = (text.match(/#\w+/g) || []).length;

    if (format.maxHashtags && hashtagCount > format.maxHashtags) {
      issues.push({
        platform,
        category: 'platform-format',
        priority: 'required',
        source: 'regex',
        issue: `Too many hashtags (${hashtagCount}/${format.maxHashtags})`,
        suggestedFix: `Reduce to ${format.maxHashtags} hashtags`,
      });
    }

    if (format.minHashtags && hashtagCount < format.minHashtags && hashtagCount > 0) {
      issues.push({
        platform,
        category: 'platform-format',
        priority: 'recommended',
        source: 'regex',
        issue: `Too few hashtags (${hashtagCount}/${format.minHashtags} minimum)`,
        suggestedFix: `Add at least ${format.minHashtags} relevant hashtags`,
      });
    }
  }

  // CTA presence check
  if (format.requiresCTA) {
    const ctaPatterns = /\b(schedule|book|call|visit|contact|view|explore|discover|request|get|start|claim|reserve|apply|register|download|see|tour|message|text|email|dm|click|tap|swipe)\b/i;
    if (!ctaPatterns.test(text)) {
      issues.push({
        platform,
        category: 'cta-effectiveness',
        priority: 'recommended',
        source: 'regex',
        issue: 'No call to action detected',
        suggestedFix: 'Add a verb-first CTA like "Schedule your private showing" or "View the full gallery"',
      });
    }
  }

  return issues;
}

/**
 * Check for formatting abuse (ALL CAPS, excessive punctuation, etc.).
 */
export function checkFormattingAbuse(
  text: string,
  platform: string
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // ALL CAPS words (3+ chars, excluding common abbreviations)
  const capsExclusions = /^(SQ|FT|MLS|HOA|HVAC|A\/C|AC|DIY|BBQ|RV|TV|USA|LLC|ID|OK|PM|AM|ADU|SQFT|CBD|NW|NE|SW|SE|AVE|ST|DR|CT|LN|RD|BLVD|HWY|APT)$/;
  const capsMatches = text.match(/\b[A-Z]{3,}\b/g) || [];
  const realCapsWords = capsMatches.filter(w => !capsExclusions.test(w));

  if (realCapsWords.length >= 2) {
    issues.push({
      platform,
      category: 'formatting',
      priority: 'required',
      source: 'regex',
      issue: `Excessive ALL CAPS usage: ${realCapsWords.slice(0, 3).join(', ')}`,
      suggestedFix: 'Use title case or sentence case instead of ALL CAPS',
      context: realCapsWords.slice(0, 3).join(', '),
    });
  }

  // Excessive exclamation marks (3+)
  const exclMatch = text.match(/!{3,}/);
  if (exclMatch) {
    issues.push({
      platform,
      category: 'formatting',
      priority: 'required',
      source: 'regex',
      issue: 'Excessive exclamation marks',
      suggestedFix: 'Use a single exclamation mark or a period',
      context: extractContext(text, exclMatch.index!, exclMatch.index! + exclMatch[0].length),
    });
  }

  // Excessive ellipsis (4+ dots)
  const ellipsisMatch = text.match(/\.{4,}/);
  if (ellipsisMatch) {
    issues.push({
      platform,
      category: 'formatting',
      priority: 'recommended',
      source: 'regex',
      issue: 'Excessive ellipsis',
      suggestedFix: 'Use standard ellipsis (...) or a dash (—)',
      context: extractContext(text, ellipsisMatch.index!, ellipsisMatch.index! + ellipsisMatch[0].length),
    });
  }

  return issues;
}

/**
 * Extract all text fields from a CampaignKit, returning [platformLabel, text] pairs.
 * Mirrors the compliance engine's extraction but exported for reuse.
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

  return texts;
}

/**
 * Check all platforms in a campaign kit for quality issues (regex layer only).
 */
export function checkAllPlatformQuality(
  campaign: CampaignKit,
  rules?: QualityRule[]
): CampaignQualityResult {
  const platformTexts = extractPlatformTexts(campaign);
  const platformResults: PlatformQualityResult[] = [];

  for (const [platform, text] of platformTexts) {
    const ruleIssues = findQualityIssues(text, platform, rules);
    const formatIssues = checkPlatformFormat(text, platform);
    const formattingIssues = checkFormattingAbuse(text, platform);
    const allIssues = [...ruleIssues, ...formatIssues, ...formattingIssues];

    platformResults.push({
      platform,
      issues: allIssues,
      passed: allIssues.filter(i => i.priority === 'required').length === 0,
    });
  }

  const totalChecks = platformResults.length;
  const totalPassed = platformResults.filter(p => p.passed).length;
  const allIssues = platformResults.flatMap(p => p.issues);
  const requiredIssues = allIssues.filter(i => i.priority === 'required').length;
  const recommendedIssues = allIssues.filter(i => i.priority === 'recommended').length;

  return {
    platforms: platformResults,
    totalChecks,
    totalPassed,
    requiredIssues,
    recommendedIssues,
    allPassed: requiredIssues === 0,
    improvementsApplied: 0,
  };
}
