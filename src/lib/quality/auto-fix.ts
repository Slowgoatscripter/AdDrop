import {
  QualityIssue,
  CampaignQualityResult,
} from '@/lib/types/quality';
import { CampaignKit } from '@/lib/types/campaign';

/**
 * Auto-fix a single text by applying regex-based quality fixes.
 * Returns the fixed text and updates issues with originalText/fixedText.
 */
export function autoFixTextRegex(text: string, issues: QualityIssue[]): string {
  let result = text;

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
 * Set a nested value in an object using a dotted path.
 * Handles paths like "instagram.professional" and "googleAds[0].headline".
 */
function setNestedValue(obj: Record<string, any>, path: string, value: string): void {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');

  // Guard against prototype pollution
  if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) return;

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
 * Applies regex-based format fixes (ALL CAPS, punctuation).
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

    // Get the current text for this platform from the fixed campaign
    let currentText = getTextByPlatform(fixed, platform);
    if (!currentText) continue;

    // Store original for all issues
    for (const issue of platformResult.issues) {
      if (!issue.originalText) {
        issue.originalText = currentText;
      }
    }

    // Apply regex format fixes
    if (regexIssues.length > 0) {
      const beforeRegex = currentText;
      currentText = autoFixTextRegex(currentText, regexIssues);
      if (currentText !== beforeRegex) {
        improvementsApplied += regexIssues.filter(i => i.fixedText).length;
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
