import OpenAI from 'openai';
import type { CampaignKit } from '@/lib/types/campaign';
import type {
  ComplianceAgentResult,
  ComplianceAgentViolation,
  ComplianceAutoFix,
  PlatformComplianceVerdict,
  CampaignVerdict,
  MLSComplianceConfig,
} from '@/lib/types/compliance';
import { extractPlatformTexts, extractAdCopyTexts, formatTermsForPrompt } from './utils';
import { loadComplianceDocs } from './docs';
import { callWithRetry } from '@/lib/utils/retry';
import type { RegexScanResult } from './regex-scan';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Check an entire campaign for Fair Housing compliance using GPT-5.2.
 * Returns structured violations, auto-fixes, and campaign verdict.
 */
export async function checkComplianceWithAgent(
  campaign: CampaignKit,
  config: MLSComplianceConfig
): Promise<ComplianceAgentResult> {
  // Extract all platform texts
  const platformTexts = extractPlatformTexts(campaign);

  // Load compliance documentation
  const complianceDocs = await loadComplianceDocs(config);

  // Format prohibited terms for prompt
  const formattedTerms = formatTermsForPrompt(config.prohibitedTerms);

  // Build system prompt
  const systemPrompt = `You are a Fair Housing compliance expert that analyzes real estate advertising copy for violations.

Your job is to:
1. Check for EXACT matches of prohibited terms (case-insensitive)
2. Check for CONTEXTUAL violations that regex would miss (e.g., "perfect for families" when "family-friendly" is prohibited)
3. Distinguish between acceptable usage (e.g., "family room" is fine) and violations (e.g., "perfect for families" is not)
4. Provide safe auto-fixes for soft violations
5. Flag hard violations that require manual review

IMPORTANT CONTEXT RULES:
- "family room" (describing a room type) is ACCEPTABLE
- "perfect for families" (targeting household type) is a VIOLATION
- Consider INTENT and CONTEXT, not just word matching

Return a JSON object with this exact structure:
{
  "platforms": [
    {
      "platform": "string (e.g., 'twitter', 'instagram.casual')",
      "verdict": "pass" | "fail",
      "violationCount": number,
      "autoFixCount": number
    }
  ],
  "campaignVerdict": "compliant" | "needs-review" | "non-compliant",
  "violations": [
    {
      "platform": "string",
      "term": "string (exact term found)",
      "category": "steering" | "familial-status" | "disability" | "race-color-national-origin" | "religion" | "sex-gender" | "age" | "marital-status" | "creed" | "economic-exclusion" | "misleading-claims" | "military-status",
      "severity": "hard" | "soft",
      "explanation": "string",
      "law": "string",
      "isContextual": boolean (true if regex would miss this)
    }
  ],
  "autoFixes": [
    {
      "platform": "string",
      "before": "string (original text)",
      "after": "string (fixed text)",
      "violationTerm": "string",
      "category": "string"
    }
  ],
  "totalViolations": number,
  "totalAutoFixes": number
}

Campaign Verdict Rules:
- "compliant": Zero violations after fixes
- "needs-review": Soft violations auto-fixed (human should review)
- "non-compliant": Hard violations that couldn't be safely auto-fixed`;

  // Build user prompt with all texts
  const textsFormatted = platformTexts
    .map(([platform, text]) => `Platform: ${platform}\nText: ${text}`)
    .join('\n\n');

  const userPrompt = `COMPLIANCE DOCUMENTATION:
${complianceDocs}

PROHIBITED TERMS:
${formattedTerms}

CAMPAIGN TEXTS TO CHECK:
${textsFormatted}

Analyze all texts for Fair Housing violations. Return JSON with violations, auto-fixes, and verdict.`;

  try {
    const response = await callWithRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return createFallbackResult();
    }

    const result = JSON.parse(content) as ComplianceAgentResult;
    return result;
  } catch (error) {
    console.error('Agent compliance check error:', error);
    return createFallbackResult();
  }
}

/**
 * Scan a single text string for compliance violations using GPT-5.2.
 * Used by the Scanner view for ad-hoc text checking.
 */
export async function scanTextWithAgent(
  text: string,
  stateCode: string,
  platform: string | undefined,
  config: MLSComplianceConfig
): Promise<ComplianceAgentResult> {
  const platformName = platform || 'general';

  // Load compliance documentation
  const complianceDocs = await loadComplianceDocs(config);

  // Format prohibited terms
  const formattedTerms = formatTermsForPrompt(config.prohibitedTerms);

  // Build system prompt (same as campaign check)
  const systemPrompt = `You are a Fair Housing compliance expert that analyzes real estate advertising copy for violations.

Your job is to:
1. Check for EXACT matches of prohibited terms (case-insensitive)
2. Check for CONTEXTUAL violations that regex would miss (e.g., "perfect for families" when "family-friendly" is prohibited)
3. Distinguish between acceptable usage (e.g., "family room" is fine) and violations (e.g., "perfect for families" is not)
4. Provide safe auto-fixes for soft violations
5. Flag hard violations that require manual review

IMPORTANT CONTEXT RULES:
- "family room" (describing a room type) is ACCEPTABLE
- "perfect for families" (targeting household type) is a VIOLATION
- Consider INTENT and CONTEXT, not just word matching

Return a JSON object with this exact structure:
{
  "platforms": [
    {
      "platform": "string",
      "verdict": "pass" | "fail",
      "violationCount": number,
      "autoFixCount": number
    }
  ],
  "campaignVerdict": "compliant" | "needs-review" | "non-compliant",
  "violations": [
    {
      "platform": "string",
      "term": "string (exact term found)",
      "category": "steering" | "familial-status" | "disability" | "race-color-national-origin" | "religion" | "sex-gender" | "age" | "marital-status" | "creed" | "economic-exclusion" | "misleading-claims" | "military-status",
      "severity": "hard" | "soft",
      "explanation": "string",
      "law": "string",
      "isContextual": boolean (true if regex would miss this)
    }
  ],
  "autoFixes": [
    {
      "platform": "string",
      "before": "string (original text)",
      "after": "string (fixed text)",
      "violationTerm": "string",
      "category": "string"
    }
  ],
  "totalViolations": number,
  "totalAutoFixes": number
}

Campaign Verdict Rules:
- "compliant": Zero violations after fixes
- "needs-review": Soft violations auto-fixed (human should review)
- "non-compliant": Hard violations that couldn't be safely auto-fixed`;

  const userPrompt = `COMPLIANCE DOCUMENTATION:
${complianceDocs}

PROHIBITED TERMS:
${formattedTerms}

TEXT TO CHECK:
Platform: ${platformName}
Text: ${text}

Analyze this text for Fair Housing violations. Return JSON with violations, auto-fixes, and verdict.`;

  try {
    const response = await callWithRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return createFallbackResult();
    }

    const result = JSON.parse(content) as ComplianceAgentResult;
    return result;
  } catch (error) {
    console.error('Agent text scan error:', error);
    return createFallbackResult();
  }
}

/**
 * Create fallback result when OpenAI call fails or returns no content
 */
function createFallbackResult(): ComplianceAgentResult {
  return {
    platforms: [],
    campaignVerdict: 'needs-review',
    violations: [],
    autoFixes: [],
    totalViolations: 0,
    totalAutoFixes: 0,
  };
}

/**
 * Apply rewritten texts back into a campaign object using dot-notation paths.
 * Paths like "instagram.casual", "googleAds[0].headline", "twitter" are navigated
 * and the string value is replaced. Unknown paths are logged and skipped.
 */
function applyRewrittenTexts(
  campaign: CampaignKit,
  rewrittenTexts: Record<string, string>
): CampaignKit {
  // Deep clone to avoid mutating the original
  const result = JSON.parse(JSON.stringify(campaign)) as CampaignKit;

  for (const [path, value] of Object.entries(rewrittenTexts)) {
    try {
      // Parse path segments: "googleAds[0].headline" → ["googleAds", "0", "headline"]
      const segments = path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter(Boolean);

      if (segments.length === 0) {
        console.warn(`[rewriteForCompliance] Empty path, skipping`);
        continue;
      }

      // Navigate to parent, then set the final key
      let current: any = result;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        const asNum = Number(seg);
        const key = !isNaN(asNum) && Array.isArray(current) ? asNum : seg;
        if (current[key] === undefined || current[key] === null) {
          console.warn(`[rewriteForCompliance] Path "${path}" not found at segment "${seg}", skipping`);
          current = null;
          break;
        }
        current = current[key];
      }

      if (current !== null && current !== undefined) {
        const finalKey = segments[segments.length - 1];
        const asNum = Number(finalKey);
        const key = !isNaN(asNum) && Array.isArray(current) ? asNum : finalKey;
        if (current[key] !== undefined) {
          current[key] = value;
        } else {
          console.warn(`[rewriteForCompliance] Final key "${finalKey}" not found in path "${path}", skipping`);
        }
      }
    } catch (err) {
      console.warn(`[rewriteForCompliance] Error applying path "${path}":`, err);
    }
  }

  return result;
}

/**
 * Phase 2: Surgically rewrite non-compliant text in a campaign.
 * Receives a campaign (already constraint-enforced), the state compliance config,
 * and regex pre-scan findings. Calls GPT-5.2 at temp 0 to fix only non-compliant text,
 * then merges the fixes back into the campaign.
 */
export async function rewriteForCompliance(
  campaign: CampaignKit,
  config: MLSComplianceConfig,
  regexFindings: RegexScanResult[]
): Promise<{ campaign: CampaignKit; complianceResult: ComplianceAgentResult }> {
  // Extract ad copy texts only (excludes strategy fields)
  const adCopyTexts = extractAdCopyTexts(campaign);

  // Load compliance documentation
  const complianceDocs = await loadComplianceDocs(config);

  // Format prohibited terms for prompt
  const formattedTerms = formatTermsForPrompt(config.prohibitedTerms);

  // Format regex findings for the prompt
  const findingsFormatted = regexFindings.length > 0
    ? regexFindings.map(f =>
        `- Platform: ${f.platform} | Term: "${f.term}" | Category: ${f.category} | Severity: ${f.severity} | Matched: "${f.matchedText}"`
      ).join('\n')
    : 'No automated findings (check for contextual violations only).';

  // Format platform texts
  const textsFormatted = adCopyTexts
    .map(([platform, text]) => `Platform: ${platform}\nText: ${text}`)
    .join('\n\n');

  // Count platforms for token budget
  const platformCount = adCopyTexts.length;

  const systemPrompt = `You are a Fair Housing compliance editor for real estate advertising copy.

Your job is SURGICAL: find and replace ONLY non-compliant language. You must:

1. Fix all violations identified by the automated scan (provided below)
2. Find and fix CONTEXTUAL violations that automated scanning missed
   (e.g., "perfect for families" when household-type targeting is prohibited)
3. Preserve the original tone, structure, platform formatting, and character limits EXACTLY
4. Do NOT rewrite sentences that are already compliant
5. Do NOT add disclaimers or compliance language unless required by MLS rules
6. Do NOT change the marketing angle or selling points — only the problematic words/phrases

IMPORTANT CONTEXT RULES:
- "family room" (describing a room type) is ACCEPTABLE
- "perfect for families" (targeting household type) is a VIOLATION
- Consider INTENT and CONTEXT, not just word matching

Return a JSON object with two keys:
{
  "rewrittenTexts": {
    "<platform>": "<fixed text>"
    // Only include platforms that were modified. Omit unchanged platforms.
  },
  "complianceResult": {
    "platforms": [...],
    "campaignVerdict": "compliant" | "needs-review" | "non-compliant",
    "violations": [...],
    "autoFixes": [...],
    "totalViolations": number,
    "totalAutoFixes": number
  }
}`;

  const userPrompt = `COMPLIANCE DOCUMENTATION:
${complianceDocs}

PROHIBITED TERMS:
${formattedTerms}

AUTOMATED SCAN FINDINGS (exact matches already detected):
${findingsFormatted}

CAMPAIGN TEXTS TO REVIEW AND FIX:
${textsFormatted}

Fix all violations — both the automated findings above and any contextual
violations you detect. Return only modified platforms in rewrittenTexts.`;

  try {
    const response = await callWithRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_completion_tokens: platformCount * 800 + 2000,
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[rewriteForCompliance] No content in OpenAI response');
      return {
        campaign,
        complianceResult: {
          ...createFallbackResult(),
          complianceRewriteApplied: false,
          source: 'rewrite',
        },
      };
    }

    const parsed = JSON.parse(content) as {
      rewrittenTexts: Record<string, string>;
      complianceResult: ComplianceAgentResult;
    };

    // Merge rewritten texts back into campaign
    const rewrittenCampaign = applyRewrittenTexts(campaign, parsed.rewrittenTexts);

    return {
      campaign: rewrittenCampaign,
      complianceResult: {
        ...parsed.complianceResult,
        complianceRewriteApplied: true,
        source: 'rewrite',
      },
    };
  } catch (error) {
    console.error('[rewriteForCompliance] Error:', error);
    return {
      campaign,
      complianceResult: {
        ...createFallbackResult(),
        complianceRewriteApplied: false,
        source: 'rewrite',
      },
    };
  }
}
