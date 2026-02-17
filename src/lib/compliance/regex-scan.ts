import { MLSComplianceConfig } from '@/lib/types';

export interface RegexScanResult {
  platform: string;
  term: string;
  category: string;
  severity: 'hard' | 'soft';
  matchedText: string;
  position: number;
}

/**
 * Allowlist patterns -- these contexts are acceptable even when they contain prohibited term words.
 */
const ALLOWLIST: Record<string, RegExp[]> = {
  family: [/\bfamily\s+room\b/i, /\bfamily\s+size\b/i, /\bfamily\s+sized\b/i],
  master: [/\bmaster\s+(bedroom|bath|bathroom|suite|closet)\b/i],
  walk: [/\bwalk[- ]?in\s+(closet|pantry|shower)\b/i],
  single: [/\bsingle[- ]?(story|level|car|family)\b/i],
};

/**
 * Build a regex for a prohibited term.
 */
function buildTermRegex(term: string): RegExp {
  if (term.includes('-')) {
    const parts = term.split('-');
    const pattern = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[- ]?');
    return new RegExp(`\\b${pattern}\\b`, 'gi');
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${pattern}\\b`, 'gi');
}

/**
 * Check if a match is in an allowed context.
 */
function isAllowedContext(text: string, term: string, matchIndex: number): boolean {
  const words = term.toLowerCase().split(/[\s-]+/);
  for (const word of words) {
    const patterns = ALLOWLIST[word];
    if (patterns) {
      const windowStart = Math.max(0, matchIndex - 20);
      const windowEnd = Math.min(text.length, matchIndex + term.length + 20);
      const window = text.slice(windowStart, windowEnd);
      if (patterns.some(p => p.test(window))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Scan ad copy texts for exact matches of prohibited terms from the state config.
 */
export function scanForProhibitedTerms(
  adCopyTexts: [string, string][],
  config: MLSComplianceConfig
): RegexScanResult[] {
  const results: RegexScanResult[] = [];

  for (const [platform, text] of adCopyTexts) {
    for (const term of config.prohibitedTerms) {
      const regex = buildTermRegex(term.term);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (!isAllowedContext(text, term.term, match.index)) {
          results.push({
            platform,
            term: term.term,
            category: term.category,
            severity: term.severity,
            matchedText: match[0],
            position: match.index,
          });
        }
      }
    }
  }

  return results;
}
