import OpenAI from 'openai';
import {
  QualityScore,
  QualityIssue,
  QualityCategory,
  QualityPriority,
  PlatformQualityResult,
  CampaignQualityResult,
} from '@/lib/types/quality';
import { CampaignKit } from '@/lib/types/campaign';
import { ListingData } from '@/lib/types/listing';
import { extractPlatformTexts } from './engine';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ------------------------------------------------------------------ */
/*  Internal types                                                     */
/* ------------------------------------------------------------------ */

interface AIScoreResponse {
  platforms: Record<string, {
    scores: Array<{
      category: string;
      score: number;
      issue?: string;
      suggestedFix?: string;
      context?: string;
    }>;
  }>;
}

/** The 9 AI quality dimensions */
const AI_CATEGORIES: QualityCategory[] = [
  'hook-strength',
  'specificity',
  'feature-to-benefit',
  'tone-consistency',
  'variation-redundancy',
  'platform-optimization',
  'demographic-fit',
  'property-type-fit',
  'emotional-triggers',
];

/* ------------------------------------------------------------------ */
/*  Prompt construction helpers                                        */
/* ------------------------------------------------------------------ */

function buildPropertyContext(listing?: ListingData): string {
  if (!listing) return 'No property context available.';

  const parts: string[] = [];
  if (listing.address) {
    const a = listing.address;
    parts.push(`Address: ${a.street}, ${a.city}, ${a.state} ${a.zip}`);
  }
  if (listing.price) parts.push(`Price: $${listing.price.toLocaleString()}`);
  if (listing.beds) parts.push(`Beds: ${listing.beds}`);
  if (listing.baths) parts.push(`Baths: ${listing.baths}`);
  if (listing.sqft) parts.push(`Sqft: ${listing.sqft.toLocaleString()}`);
  if (listing.propertyType) parts.push(`Property type: ${listing.propertyType}`);
  if (listing.features && listing.features.length > 0) {
    parts.push(`Features: ${listing.features.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No property context available.';
}

function buildPlatformTextBlock(platformTexts: [string, string][]): string {
  return platformTexts
    .map(([key, text]) => `--- ${key} ---\n${text}`)
    .join('\n\n');
}

function buildScoringPrompt(
  propertyContext: string,
  platformTextBlock: string,
  demographic?: string
): string {
  const demographicLine = demographic
    ? `Target demographic: ${demographic}`
    : 'No target demographic specified.';

  return `You are a real estate ad copy quality analyst. Score the following platform ad texts on a 1-10 scale for each quality dimension.

## Property Context
${propertyContext}

## ${demographicLine}

## Platform Texts to Score
${platformTextBlock}

## Scoring Rubric (1-10 scale)

Score each platform text on these 9 dimensions:

1. **hook-strength**: Does the opening grab attention with something specific and compelling? (1 = generic opener, 10 = irresistible hook with unique property detail)
2. **specificity**: What is the ratio of concrete details (numbers, names, specific features) to generic claims ("beautiful", "amazing")? (1 = all generic, 10 = rich in specifics)
3. **feature-to-benefit**: Are property features translated into lifestyle benefits? ("granite countertops" -> "prep meals on premium granite") (1 = feature dump, 10 = every feature tied to a benefit)
4. **tone-consistency**: Does the tone hold throughout the entire text? No jarring shifts? (1 = inconsistent, 10 = perfectly consistent)
5. **variation-redundancy**: When multiple tone variations exist for a platform, are they genuinely different in approach, not just synonym swaps? (1 = nearly identical, 10 = distinct angles). If only one variation exists, score 7.
6. **platform-optimization**: Is the copy tailored to the specific platform's conventions? (Instagram: visual, hashtags; Google Ads: concise, keyword-rich; Facebook: community-oriented; etc.) (1 = generic, 10 = platform-native)
7. **demographic-fit**: Does the copy match the target buyer persona's values, concerns, and language? ${demographic ? '(1 = mismatched, 10 = perfectly targeted)' : '(Score 7 if no demographic specified)'}
8. **property-type-fit**: Does the vocabulary and framing match the property type? (luxury condo vs starter home vs family house vs investment property) (1 = mismatched tone, 10 = perfectly calibrated)
9. **emotional-triggers**: Does the copy use evidence-backed emotional levers? (scarcity, social proof, aspiration, fear of missing out, belonging) (1 = no emotional appeal, 10 = multiple well-executed triggers)

## Response Format

Return ONLY valid JSON with this structure:
{
  "platforms": {
    "<platformKey>": {
      "scores": [
        {
          "category": "<category-name>",
          "score": <1-10>,
          "issue": "<brief description if score < 7, omit if >= 7>",
          "suggestedFix": "<concrete improvement suggestion if score < 7, omit if >= 7>",
          "context": "<relevant quote from the text if score < 7, omit if >= 7>"
        }
      ]
    }
  }
}

Group related platform fields together. For example, group all "instagram.*" texts under one "instagram" platform key, all "facebook.*" under "facebook", all "googleAds[*].*" under "googleAds", all "metaAd.*" under "metaAd", all "magazineFullPage.*" under "magazineFullPage", all "magazineHalfPage.*" under "magazineHalfPage", all "postcard.*" under "postcard".

Each platform key should have exactly 9 score entries (one per category). Ensure every category from the rubric is scored.`;
}

/* ------------------------------------------------------------------ */
/*  Platform key grouping                                              */
/* ------------------------------------------------------------------ */

/**
 * Map a fine-grained platform text key (e.g. "instagram.professional")
 * to the coarse platform group key used in AI results (e.g. "instagram").
 */
function toPlatformGroup(key: string): string {
  // googleAds[0].headline -> googleAds
  if (key.startsWith('googleAds')) return 'googleAds';
  // metaAd.primaryText -> metaAd
  if (key.startsWith('metaAd')) return 'metaAd';
  // magazineFullPage.professional.headline -> magazineFullPage
  if (key.startsWith('magazineFullPage')) return 'magazineFullPage';
  // magazineHalfPage.luxury.body -> magazineHalfPage
  if (key.startsWith('magazineHalfPage')) return 'magazineHalfPage';
  // postcard.professional.front.headline -> postcard
  if (key.startsWith('postcard')) return 'postcard';
  // instagram.professional -> instagram
  // facebook.casual -> facebook
  const dotIndex = key.indexOf('.');
  return dotIndex > 0 ? key.substring(0, dotIndex) : key;
}

/* ------------------------------------------------------------------ */
/*  Main scoring function                                              */
/* ------------------------------------------------------------------ */

/**
 * Score all platform copy across 9 AI quality dimensions in a single
 * OpenAI API call. Returns the AI portion of a CampaignQualityResult.
 *
 * If the API call fails for any reason the function returns an empty
 * result so it never breaks the pipeline.
 */
export async function scoreAllPlatformQuality(
  campaign: CampaignKit,
  listing?: ListingData,
  demographic?: string
): Promise<CampaignQualityResult> {
  const emptyResult: CampaignQualityResult = {
    platforms: [],
    totalChecks: 0,
    totalPassed: 0,
    requiredIssues: 0,
    recommendedIssues: 0,
    allPassed: true,
    improvementsApplied: 0,
  };

  const platformTexts = extractPlatformTexts(campaign);
  if (platformTexts.length === 0) return emptyResult;

  const propertyContext = buildPropertyContext(listing);
  const platformTextBlock = buildPlatformTextBlock(platformTexts);
  const prompt = buildScoringPrompt(propertyContext, platformTextBlock, demographic);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a real estate ad copy quality analyst. Always respond with valid JSON only. No markdown, no code fences, no explanatory text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return emptyResult;

    const parsed: AIScoreResponse = JSON.parse(content);
    if (!parsed.platforms) return emptyResult;

    return convertAIResponseToResult(parsed, platformTexts);
  } catch {
    // AI scoring is non-critical — return empty so the pipeline continues
    return emptyResult;
  }
}

/* ------------------------------------------------------------------ */
/*  AI response conversion                                             */
/* ------------------------------------------------------------------ */

/**
 * Convert the raw AI JSON response into a CampaignQualityResult,
 * expanding grouped platform keys back to per-text-field results
 * and converting low scores into QualityIssue objects.
 */
function convertAIResponseToResult(
  aiResponse: AIScoreResponse,
  platformTexts: [string, string][]
): CampaignQualityResult {
  // Build a map from group key -> list of fine-grained platform keys
  const groupToKeys = new Map<string, string[]>();
  for (const [key] of platformTexts) {
    const group = toPlatformGroup(key);
    const existing = groupToKeys.get(group) || [];
    existing.push(key);
    groupToKeys.set(group, existing);
  }

  const platformResults: PlatformQualityResult[] = [];
  const allScores: number[] = [];

  for (const [groupKey, scoreData] of Object.entries(aiResponse.platforms)) {
    const fineKeys = groupToKeys.get(groupKey) || [groupKey];

    // Each fine-grained key gets the same set of AI issues (since AI
    // scored them as a group). We attach issues to the first key only
    // to avoid double-counting; others get an issue-free pass.
    const issues: QualityIssue[] = [];

    for (const entry of scoreData.scores) {
      const category = entry.category as QualityCategory;
      if (!AI_CATEGORIES.includes(category)) continue;

      allScores.push(entry.score);

      // Only flag scores below 7 as issues
      if (entry.score < 7) {
        const priority: QualityPriority = entry.score < 4 ? 'required' : 'recommended';

        issues.push({
          platform: groupKey,
          category,
          priority,
          source: 'ai',
          issue: entry.issue || `Low ${category} score (${entry.score}/10)`,
          suggestedFix: entry.suggestedFix || `Improve ${category}`,
          context: entry.context,
          score: entry.score,
        });
      }
    }

    // Attach issues to the first fine key; mark remaining as passed
    for (let i = 0; i < fineKeys.length; i++) {
      const keyIssues = i === 0 ? issues : [];
      platformResults.push({
        platform: fineKeys[i],
        issues: keyIssues,
        passed: keyIssues.filter(iss => iss.priority === 'required').length === 0,
      });
    }
  }

  // Also add entries for platforms that the AI response might have missed
  const coveredKeys = new Set(platformResults.map(r => r.platform));
  for (const [key] of platformTexts) {
    if (!coveredKeys.has(key)) {
      platformResults.push({ platform: key, issues: [], passed: true });
    }
  }

  const totalChecks = platformResults.length;
  const totalPassed = platformResults.filter(p => p.passed).length;
  const allIssues = platformResults.flatMap(p => p.issues);
  const requiredIssues = allIssues.filter(i => i.priority === 'required').length;
  const recommendedIssues = allIssues.filter(i => i.priority === 'recommended').length;
  const overallScore =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : undefined;

  return {
    platforms: platformResults,
    totalChecks,
    totalPassed,
    requiredIssues,
    recommendedIssues,
    allPassed: requiredIssues === 0,
    overallScore,
    improvementsApplied: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Merge regex + AI results                                           */
/* ------------------------------------------------------------------ */

/**
 * Merge two CampaignQualityResult objects (one from the regex engine,
 * one from the AI scorer) into a single unified result.
 *
 * Deduplication: if regex and AI flag the same platform+category,
 * keep both only if they describe genuinely different issues. If
 * they overlap (same category on same platform), prefer the AI
 * description for its specificity but preserve the regex issue when
 * the descriptions differ.
 */
export function mergeQualityResults(
  regexResult: CampaignQualityResult,
  aiResult: CampaignQualityResult
): CampaignQualityResult {
  // Index regex results by platform
  const regexByPlatform = new Map<string, PlatformQualityResult>();
  for (const pr of regexResult.platforms) {
    regexByPlatform.set(pr.platform, pr);
  }

  // Index AI results by platform
  const aiByPlatform = new Map<string, PlatformQualityResult>();
  for (const pr of aiResult.platforms) {
    aiByPlatform.set(pr.platform, pr);
  }

  // Collect all unique platform keys
  const allPlatformKeys = new Set<string>([
    ...regexByPlatform.keys(),
    ...aiByPlatform.keys(),
  ]);

  const mergedPlatforms: PlatformQualityResult[] = [];

  for (const platform of allPlatformKeys) {
    const regexPR = regexByPlatform.get(platform);
    const aiPR = aiByPlatform.get(platform);

    const regexIssues = regexPR?.issues || [];
    const aiIssues = aiPR?.issues || [];

    // Start with all regex issues
    const mergedIssues: QualityIssue[] = [...regexIssues];

    // Build a set of category keys already present from regex
    const regexCategorySet = new Set(
      regexIssues.map(i => i.category)
    );

    for (const aiIssue of aiIssues) {
      if (regexCategorySet.has(aiIssue.category)) {
        // Same platform + category exists in regex results.
        // Check if the AI description is meaningfully different.
        const matchingRegex = regexIssues.find(
          r => r.category === aiIssue.category
        );

        if (matchingRegex && matchingRegex.issue === aiIssue.issue) {
          // Identical description — skip the AI duplicate, but update
          // the existing issue with AI's score if available
          if (aiIssue.score !== undefined) {
            matchingRegex.score = aiIssue.score;
          }
        } else {
          // Different descriptions — keep both (genuinely different issues)
          mergedIssues.push(aiIssue);
        }
      } else {
        // Category not present in regex results — add it
        mergedIssues.push(aiIssue);
      }
    }

    mergedPlatforms.push({
      platform,
      issues: mergedIssues,
      passed: mergedIssues.filter(i => i.priority === 'required').length === 0,
    });
  }

  // Recalculate aggregates
  const totalChecks = mergedPlatforms.length;
  const totalPassed = mergedPlatforms.filter(p => p.passed).length;
  const allIssues = mergedPlatforms.flatMap(p => p.issues);
  const requiredIssues = allIssues.filter(i => i.priority === 'required').length;
  const recommendedIssues = allIssues.filter(i => i.priority === 'recommended').length;

  // Overall score: average of all AI scores across platforms
  const aiScores = allIssues
    .filter(i => i.source === 'ai' && i.score !== undefined)
    .map(i => i.score!);

  // Also include implicit 7+ scores from AI result's overallScore
  const overallScore =
    aiResult.overallScore !== undefined
      ? aiResult.overallScore
      : aiScores.length > 0
        ? Math.round((aiScores.reduce((a, b) => a + b, 0) / aiScores.length) * 10) / 10
        : undefined;

  return {
    platforms: mergedPlatforms,
    totalChecks,
    totalPassed,
    requiredIssues,
    recommendedIssues,
    allPassed: requiredIssues === 0,
    overallScore,
    improvementsApplied: regexResult.improvementsApplied + aiResult.improvementsApplied,
  };
}
