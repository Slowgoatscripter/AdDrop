import { CampaignKit, MLSComplianceConfig } from '@/lib/types';
import { QualityConstraintViolation } from '@/lib/types/quality';

const GOOGLE_AD_LIMITS = { headline: 30, description: 90 };

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? truncated.slice(0, lastSpace) : truncated).trimEnd() + '\u2026';
}

export function enforceConstraints(
  campaign: CampaignKit,
  config: MLSComplianceConfig
): { campaign: CampaignKit; constraints: QualityConstraintViolation[] } {
  const constraints: QualityConstraintViolation[] = [];
  const fixed = { ...campaign };
  let constraintId = 0;

  const add = (
    platform: string,
    type: QualityConstraintViolation['type'],
    issue: string,
    currentText: string,
    fixedText?: string
  ) => {
    constraints.push({
      id: `constraint-${++constraintId}`,
      platform, type, severity: 'critical', issue, currentText,
      autoFixed: !!fixedText, fixedText,
    });
  };

  // Twitter: 280 chars
  if (fixed.twitter && fixed.twitter.length > 280) {
    const original = fixed.twitter;
    fixed.twitter = truncateAtWord(original, 280);
    add('twitter', 'character-limit', `Tweet is ${original.length} chars, max 280`, original, fixed.twitter);
  }

  // Meta Ad
  if (fixed.metaAd) {
    const meta = { ...fixed.metaAd };
    if (meta.primaryText && meta.primaryText.length > 125) {
      const o = meta.primaryText;
      meta.primaryText = truncateAtWord(o, 125);
      add('metaAd.primaryText', 'character-limit', `Primary text is ${o.length} chars, ideal max 125`, o, meta.primaryText);
    }
    if (meta.headline && meta.headline.length > 40) {
      const o = meta.headline;
      meta.headline = truncateAtWord(o, 40);
      add('metaAd.headline', 'character-limit', `Headline is ${o.length} chars, max 40`, o, meta.headline);
    }
    if (meta.description && meta.description.length > 30) {
      const o = meta.description;
      meta.description = truncateAtWord(o, 30);
      add('metaAd.description', 'character-limit', `Description is ${o.length} chars, max 30`, o, meta.description);
    }
    fixed.metaAd = meta;
  }

  // Google Ads
  if (fixed.googleAds) {
    fixed.googleAds = fixed.googleAds.map((ad, i) => {
      const fixedAd = { ...ad };
      if (fixedAd.headline && fixedAd.headline.length > GOOGLE_AD_LIMITS.headline) {
        const o = fixedAd.headline;
        fixedAd.headline = truncateAtWord(o, GOOGLE_AD_LIMITS.headline);
        add(`googleAds[${i}].headline`, 'character-limit', `Headline is ${o.length} chars, max ${GOOGLE_AD_LIMITS.headline}`, o, fixedAd.headline);
      }
      if (fixedAd.description && fixedAd.description.length > GOOGLE_AD_LIMITS.description) {
        const o = fixedAd.description;
        fixedAd.description = truncateAtWord(o, GOOGLE_AD_LIMITS.description);
        add(`googleAds[${i}].description`, 'character-limit', `Description is ${o.length} chars, max ${GOOGLE_AD_LIMITS.description}`, o, fixedAd.description);
      }
      return fixedAd;
    });
  }

  // MLS description
  if (fixed.mlsDescription && config.maxDescriptionLength && fixed.mlsDescription.length > config.maxDescriptionLength) {
    const o = fixed.mlsDescription;
    fixed.mlsDescription = truncateAtWord(o, config.maxDescriptionLength);
    add('mlsDescription', 'character-limit', `MLS description is ${o.length} chars, max ${config.maxDescriptionLength}`, o, fixed.mlsDescription);
  }

  return { campaign: fixed, constraints };
}
