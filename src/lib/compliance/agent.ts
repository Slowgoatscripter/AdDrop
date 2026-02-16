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
import { extractPlatformTexts } from './utils';
import { loadComplianceDocs } from './docs';
import { formatTermsForPrompt } from './utils';

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
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

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
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

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
