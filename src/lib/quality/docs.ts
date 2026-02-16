// Server-only: this module uses Node.js fs/path and must not be imported from client components.
// Import from '@/lib/quality/engine' for client-safe functions.

import { promises as fs } from 'fs';
import path from 'path';
import { QualityRule } from '@/lib/types/quality';
import { formattingRules } from './rules';

/** Doc paths organized by section */
const qualityDocPaths = {
  platforms: [
    'ad-docs/platforms/instagram.md',
    'ad-docs/platforms/facebook.md',
    'ad-docs/platforms/google-ads.md',
    'ad-docs/platforms/meta-ads.md',
    'ad-docs/platforms/twitter.md',
    'ad-docs/platforms/postcard.md',
    'ad-docs/platforms/magazine.md',
    'ad-docs/platforms/listing-platforms.md',
  ],
  copywriting: [
    'ad-docs/copywriting/hooks-and-headlines.md',
    'ad-docs/copywriting/feature-to-benefit.md',
    'ad-docs/copywriting/tone-definitions.md',
    'ad-docs/copywriting/cta-best-practices.md',
  ],
  targeting: [
    'ad-docs/targeting/demographic-tailoring.md',
    'ad-docs/targeting/property-type-tailoring.md',
  ],
};

/**
 * Load quality documentation markdown files.
 * Returns concatenated content for prompt injection.
 * Handles missing files gracefully.
 *
 * SERVER-ONLY: Do not import this from client components.
 */
export async function loadQualityDocs(): Promise<string> {
  const allPaths = [
    ...qualityDocPaths.platforms,
    ...qualityDocPaths.copywriting,
    ...qualityDocPaths.targeting,
  ];

  const contents: string[] = [];

  for (const docPath of allPaths) {
    try {
      const fullPath = path.resolve(process.cwd(), docPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      contents.push(content);
    } catch {
      // Missing doc file — log warning but continue
      console.warn(`Quality doc not found: ${docPath}`);
    }
  }

  return contents.join('\n\n---\n\n');
}

/**
 * Build a concise quality cheat sheet from the rules.
 * Organized by subcategory with pattern, explanation, and suggested fix.
 * Optionally includes demographic and property-type context.
 */
export function buildQualityCheatSheet(options?: {
  demographic?: string;
  propertyType?: string;
}): string {
  const bySubcategory = new Map<string, QualityRule[]>();

  for (const rule of formattingRules) {
    const key = rule.subcategory || rule.category;
    if (!bySubcategory.has(key)) {
      bySubcategory.set(key, []);
    }
    bySubcategory.get(key)!.push(rule);
  }

  const subcategoryLabels: Record<string, string> = {
    'vague-praise': 'Vague Praise (say nothing specific)',
    'euphemism': 'Euphemisms (perceived as code for negatives)',
    'pressure-tactic': 'Pressure Tactics (artificial urgency)',
    'assumption': 'Buyer Assumptions (never assume about the reader)',
    'meaningless-superlative': 'Empty Superlatives (use concrete details instead)',
    'ai-slop': 'AI-Generated Filler (sounds robotic)',
    'avoid-word': 'Weak Words (replace with specifics)',
    'formatting': 'Formatting Issues',
    'weak-cta': 'Weak Calls to Action (use verb-first CTAs)',
  };

  let sheet = '## Ad Quality Cheat Sheet\n\n';
  sheet += 'The following patterns weaken ad copy. Avoid them and use the suggested alternatives.\n\n';

  for (const [subcategory, rules] of Array.from(bySubcategory.entries())) {
    const label = subcategoryLabels[subcategory] || subcategory;
    const requiredRules = rules.filter(r => r.priority === 'required');
    const recommendedRules = rules.filter(r => r.priority === 'recommended');

    sheet += `### ${label}\n`;

    if (requiredRules.length > 0) {
      sheet += '**MUST AVOID:**\n';
      for (const r of requiredRules) {
        sheet += `- "${r.pattern}" — ${r.shortExplanation}. Instead: ${r.suggestedFix}\n`;
      }
    }

    if (recommendedRules.length > 0) {
      sheet += '**SHOULD AVOID:**\n';
      for (const r of recommendedRules) {
        sheet += `- "${r.pattern}" — ${r.shortExplanation}. Instead: ${r.suggestedFix}\n`;
      }
    }

    sheet += '\n';
  }

  // Add demographic guidance if specified
  if (options?.demographic) {
    sheet += `### Target Demographic: ${options.demographic}\n`;
    sheet += `Tailor all copy to resonate with ${options.demographic} buyers. `;
    sheet += 'Use language, emphasis, and emotional triggers appropriate to this audience.\n\n';
  }

  // Add property type guidance if specified
  if (options?.propertyType) {
    sheet += `### Property Type: ${options.propertyType}\n`;
    sheet += `Use vocabulary and selling points appropriate for ${options.propertyType} properties. `;
    sheet += 'Avoid language that contradicts the property type.\n\n';
  }

  return sheet;
}
