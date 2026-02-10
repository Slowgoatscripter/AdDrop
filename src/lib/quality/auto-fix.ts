import OpenAI from 'openai';
import {
  QualityIssue,
  CampaignQualityResult,
} from '@/lib/types/quality';
import { CampaignKit } from '@/lib/types/campaign';
import { buildRuleRegex } from './engine';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Auto-fix a single text by applying regex-based quality fixes.
 * Returns the fixed text and updates issues with originalText/fixedText.
 */
export function autoFixTextRegex(text: string, issues: QualityIssue[]): string {
  let result = text;

  for (const issue of issues) {
    if (issue.source !== 'regex' || !issue.originalText) continue;

    // For anti-pattern matches, remove the phrase (trim surrounding whitespace)
    const regex = buildRuleRegex(issue.originalText);
    const before = result;
    result = result.replace(regex, '');
    // Clean up double spaces left by removal
    result = result.replace(/\s{2,}/g, ' ').trim();

    if (result !== before) {
      issue.fixedText = '[removed]';
    }
  }

  // Fix ALL CAPS (convert to title case)
  const capsExclusions = /^(SQ|FT|MLS|HOA|HVAC|AC|DIY|BBQ|RV|TV|USA|LLC|ID|OK|PM|AM|ADU|SQFT|CBD|NW|NE|SW|SE|AVE|ST|DR|CT|LN|RD|BLVD|HWY|APT)$/;
  const capsIssue = issues.find(i => i.category === 'formatting' && i.issue.includes('ALL CAPS'));
  if (capsIssue) {
    result = result.replace(/\b[A-Z]{3,}\b/g, (match) => {
      if (capsExclusions.test(match)) return match;
      return match.charAt(0) + match.slice(1).toLowerCase();
      });
    capsIssue.fixedText = result;
  }

  // Fix excessive exclamation marks
  const exclIssue = issues.find(i => i.issue.includes('exclamation'));
  if (exclIssue) {
    const before = result;
    result = result.replace(/!{3,}/g, '!');
    if (result !== before) {
      exclIssue.fixedText = result;
    }
  }

  // Fix excessive ellipsis
  const ellipsisIssue = issues.find(i => i.issue.includes('ellipsis'));
  if (ellipsisIssue) {
    const before = result;
    result = result.replace(/\.{4,}/g, '...');
    if (result !== before) {
      ellipsisIssue.fixedText = result;
    }
  }

  return result;
}

/**
 * Use AI to fix issues that can't be handled by regex.
 * Sends flagged copy back with fix instructions.
 */
async function autoFixTextAI(
  text: string,
  platform: string,
  issues: QualityIssue[]
): Promise<string> {
  const aiIssues = issues.filter(i => i.source === 'ai');
  if (aiIssues.length === 0) return text;

  const fixInstructions = aiIssues.map(i =>
    `- ${i.issue}. Fix: ${i.suggestedFix}`
  ).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a real estate ad copy editor. Fix the issues listed below while preserving the core message, tone, and length. Return ONLY the fixed text, no explanations.',
        },
        {
          role: 'user',
          content: `Platform: ${platform}\n\nOriginal copy:\n${text}\n\nIssues to fix:\n${fixInstructions}\n\nReturn the corrected copy only:`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 2000,
    });

    const fixed = response.choices[0]?.message?.content;
    if (fixed && fixed.trim().length > 0) {
      // Store before/after on each AI issue
      for (const issue of aiIssues) {
        issue.originalText = text;
        issue.fixedText = fixed.trim();
      }
      return fixed.trim();
    }
  } catch (error) {
    console.warn(`AI auto-fix failed for ${platform}:`, error);
  }

  return text;
}

/**
 * Set a nested value in an object using a dotted path.
 * Handles paths like "instagram.professional" and "googleAds[0].headline".
 */
function setNestedValue(obj: Record<string, any>, path: string, value: string): void {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined) return;
    current = current[key];
  }

  const lastKey = parts[parts.length - 1];
  if (current[lastKey] !== undefined) {
    current[lastKey] = value;
  }
}

/**
 * Auto-fix an entire campaign kit based on quality results.
 * Applies regex fixes instantly and AI fixes via API calls.
 * Returns a new campaign kit — never mutates the original.
 */
export async function autoFixQuality(
  campaign: CampaignKit,
  qualityResult: CampaignQualityResult
): Promise<{ campaign: CampaignKit; qualityResult: CampaignQualityResult }> {
  // Deep clone to avoid mutation
  const fixed = JSON.parse(JSON.stringify(campaign)) as CampaignKit;
  const updatedResult = JSON.parse(JSON.stringify(qualityResult)) as CampaignQualityResult;
  let improvementsApplied = 0;

  for (const platformResult of updatedResult.platforms) {
    if (platformResult.issues.length === 0) continue;

    const platform = platformResult.platform;
    const regexIssues = platformResult.issues.filter(i => i.source === 'regex' && i.priority === 'required');
    const aiIssues = platformResult.issues.filter(i => i.source === 'ai' && i.priority === 'required');

    // Get the current text for this platform from the fixed campaign
    let currentText = getTextByPlatform(fixed, platform);
    if (!currentText) continue;

    // Store original for all issues
    for (const issue of platformResult.issues) {
      if (!issue.originalText) {
        issue.originalText = currentText;
      }
    }

    // Apply regex fixes
    if (regexIssues.length > 0) {
      const beforeRegex = currentText;
      currentText = autoFixTextRegex(currentText, regexIssues);
      if (currentText !== beforeRegex) {
        improvementsApplied += regexIssues.filter(i => i.fixedText).length;
      }
    }

    // Apply AI fixes
    if (aiIssues.length > 0) {
      const beforeAI = currentText;
      currentText = await autoFixTextAI(currentText, platform, aiIssues);
      if (currentText !== beforeAI) {
        improvementsApplied += aiIssues.filter(i => i.fixedText).length;
      }
    }

    // Write the fixed text back to the campaign
    setNestedValue(fixed as unknown as Record<string, any>, platform, currentText);
  }

  updatedResult.improvementsApplied = improvementsApplied;

  return { campaign: fixed, qualityResult: updatedResult };
}

/**
 * Get text content from a campaign by platform path.
 */
function getTextByPlatform(campaign: CampaignKit, platform: string): string | null {
  const obj = campaign as unknown as Record<string, any>;
  const parts = platform.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: any = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return null;
    current = current[part];
  }

  return typeof current === 'string' ? current : null;
}
