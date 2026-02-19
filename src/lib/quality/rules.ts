import type { QualityRule, PlatformFormat } from '@/lib/types/quality';

// ---------------------------------------------------------------------------
// Formatting Rules (~5)
//    Regex-based rules that detect formatting issues.
//    Pattern is prefixed with "regex:" to signal literal regex usage.
// ---------------------------------------------------------------------------
export const formattingRules: QualityRule[] = [
  {
    pattern: 'regex:!{3,}',
    category: 'formatting',
    priority: 'required',
    subcategory: 'formatting',
    shortExplanation: 'Three or more consecutive exclamation marks look unprofessional.',
    suggestedFix: 'Use a single exclamation mark at most, or rewrite as a confident statement with a period.',
  },
  // ALL CAPS detection is handled by checkFormattingAbuse() in the engine
  // (uses a simpler approach with explicit exclusion list)
  {
    pattern: 'regex:(?:[\\u{1F600}-\\u{1F64F}\\u{1F300}-\\u{1F5FF}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]\\s*){3,}',
    category: 'formatting',
    priority: 'required',
    subcategory: 'formatting',
    shortExplanation: 'Three or more consecutive emoji look spammy and unprofessional.',
    suggestedFix: 'Limit emoji to 1-2 per section. Use them as visual anchors, not decoration.',
  },
  {
    pattern: 'regex:\\$\\s+\\d|\\$[^\\d\\s]',
    category: 'formatting',
    priority: 'required',
    subcategory: 'formatting',
    shortExplanation: 'Dollar sign separated from its number or followed by non-numeric text is a formatting error.',
    suggestedFix: 'Place the dollar sign directly before the number with no space: "$450,000" not "$ 450,000".',
  },
  {
    pattern: 'regex:\\.{4,}',
    category: 'formatting',
    priority: 'required',
    subcategory: 'formatting',
    shortExplanation: 'Excessive ellipsis (four or more dots) looks sloppy and uncertain.',
    suggestedFix: 'Use a standard three-dot ellipsis sparingly, or rewrite as a complete sentence.',
  },
  {
    pattern: 'regex:\\bJUST\\s+LISTED\\b|\\bJUST\\s+REDUCED\\b',
    category: 'formatting',
    priority: 'required',
    subcategory: 'formatting',
    shortExplanation: '"JUST LISTED" or "JUST REDUCED" in all caps is shouty and outdated.',
    suggestedFix: 'Use sentence case: "Just listed" or "New price" and integrate naturally into the copy.',
  },
];

// ---------------------------------------------------------------------------
// Platform format constraints
// ---------------------------------------------------------------------------
export const platformFormats: Record<string, PlatformFormat> = {
  'instagram.professional': {
    maxChars: 2200,
    truncationPoint: 125,
    maxHashtags: 30,
    minHashtags: 3,
    requiresCTA: true,
  },
  'instagram.casual': {
    maxChars: 2200,
    truncationPoint: 125,
    maxHashtags: 30,
    minHashtags: 3,
    requiresCTA: true,
  },
  'instagram.luxury': {
    maxChars: 2200,
    truncationPoint: 125,
    maxHashtags: 30,
    minHashtags: 3,
    requiresCTA: true,
  },
  'facebook.professional': {
    maxChars: 63206,
    truncationPoint: 125,
    requiresCTA: true,
  },
  'facebook.casual': {
    maxChars: 63206,
    truncationPoint: 125,
    requiresCTA: true,
  },
  'facebook.luxury': {
    maxChars: 63206,
    truncationPoint: 125,
    requiresCTA: true,
  },
  'googleAds.headline': {
    maxChars: 30,
    requiresCTA: false,
  },
  'googleAds.description': {
    maxChars: 90,
    requiresCTA: true,
  },
  'metaAd.primaryText': {
    maxChars: 2200,
    truncationPoint: 125,
    requiresCTA: true,
  },
  'metaAd.headline': {
    maxChars: 40,
    requiresCTA: false,
  },
  'metaAd.description': {
    maxChars: 30,
    requiresCTA: false,
  },
  'twitter': {
    maxChars: 280,
    requiresCTA: true,
  },
  'zillow': {
    maxChars: 4000,
    requiresCTA: false,
  },
  'realtorCom': {
    maxChars: 4000,
    requiresCTA: false,
  },
  'homesComTrulia': {
    maxChars: 4000,
    requiresCTA: false,
  },
  'mlsDescription': {
    maxChars: 1000,
    requiresCTA: false,
  },
  'postcard.professional.front.headline': {
    maxChars: 60,
    requiresCTA: false,
  },
  'postcard.professional.front.body': {
    maxChars: 200,
    requiresCTA: true,
  },
  'postcard.casual.front.headline': {
    maxChars: 60,
    requiresCTA: false,
  },
  'postcard.casual.front.body': {
    maxChars: 200,
    requiresCTA: true,
  },
  'magazineFullPage.professional.headline': {
    maxChars: 80,
    requiresCTA: false,
  },
  'magazineFullPage.luxury.headline': {
    maxChars: 80,
    requiresCTA: false,
  },
  'magazineHalfPage.professional.headline': {
    maxChars: 60,
    requiresCTA: false,
  },
  'magazineHalfPage.luxury.headline': {
    maxChars: 60,
    requiresCTA: false,
  },
};
