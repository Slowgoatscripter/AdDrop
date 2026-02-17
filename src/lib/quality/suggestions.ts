import { CampaignQualityResult, QualitySuggestion } from '@/lib/types/quality';

export function buildQualitySuggestions(
  qualityResult: CampaignQualityResult
): QualitySuggestion[] {
  const suggestions: QualitySuggestion[] = [];
  let id = 0;

  for (const platformResult of qualityResult.platforms) {
    for (const issue of platformResult.issues || []) {
      suggestions.push({
        id: `suggestion-${++id}`,
        platform: issue.platform,
        category: issue.category,
        severity: issue.priority === 'required' ? 'high' : 'medium',
        issue: issue.issue,
        currentText: issue.originalText || '',
        suggestedRewrite: issue.suggestedFix || issue.fixedText,
        explanation: issue.suggestedFix || issue.issue,
      });
    }
  }

  return suggestions;
}
