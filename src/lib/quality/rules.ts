import type { QualityRule, PlatformFormat } from '@/lib/types/quality';

// ---------------------------------------------------------------------------
// 1. Vague Praise Rules (~12)
//    Phrases that say nothing specific about the property.
// ---------------------------------------------------------------------------
const vaguePraiseRules: QualityRule[] = [
  {
    pattern: 'has great potential',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Has great potential" is vague and tells buyers nothing concrete about the property.',
    suggestedFix: 'Replace with a specific feature: "Oversized 0.4-acre lot allows for pool addition" or "Unfinished basement offers 800 sq ft of expansion space."',
  },
  {
    pattern: 'the possibilities are endless',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"The possibilities are endless" is a filler phrase that adds no value.',
    suggestedFix: 'Name one or two concrete possibilities: "Convert the detached garage into an ADU" or "Add a deck overlooking the creek."',
  },
  {
    pattern: 'must see to appreciate',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Must see to appreciate" implies the ad itself cannot convey the property\'s value.',
    suggestedFix: 'Describe what makes it special: "Floor-to-ceiling windows frame unobstructed mountain views" or "Original 1920s crown molding throughout."',
  },
  {
    pattern: 'dream home',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Dream home" is subjective and overused in real estate copy.',
    suggestedFix: 'Highlight specific standout features instead: "4-bed colonial with chef\'s kitchen and heated pool."',
  },
  {
    pattern: "won't last long",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Won\'t last long" is unsubstantiated urgency that erodes trust.',
    suggestedFix: 'Let desirable features speak for themselves: "3 offers received in the first 48 hours" (if true) or simply describe the property.',
  },
  {
    pattern: 'move-in ready',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Move-in ready" is often unverified and means different things to different buyers.',
    suggestedFix: 'Be specific about what\'s been updated: "New roof (2024), updated HVAC, and freshly refinished hardwoods."',
  },
  {
    pattern: 'turnkey',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Turnkey" is vague jargon that lacks specificity.',
    suggestedFix: 'List the updates that make it turnkey: "All-new kitchen appliances, updated electrical panel, and fresh interior paint."',
  },
  {
    pattern: 'pride of ownership',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Pride of ownership" is a cliche that conveys no useful information.',
    suggestedFix: 'Show the care with specifics: "Meticulously maintained with annual service records for HVAC and roof."',
  },
  {
    pattern: "entertainer's delight",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Entertainer\'s delight" is an overused cliche in real estate.',
    suggestedFix: 'Describe the entertaining features: "Open-plan kitchen flows to a 600 sq ft covered patio with built-in grill."',
  },
  {
    pattern: "nature lover's paradise",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Nature lover\'s paradise" is a generic phrase that could apply to any property near trees.',
    suggestedFix: 'Be specific about the natural surroundings: "Backs to 200-acre state forest with direct trail access."',
  },
  {
    pattern: 'rare find',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Rare find" is overused and rarely substantiated.',
    suggestedFix: 'Explain what makes it rare: "One of only 12 lakefront lots in the subdivision" or "Original mid-century design by noted architect."',
  },
  {
    pattern: 'one of a kind',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"One of a kind" is a cliche that tells the buyer nothing specific.',
    suggestedFix: 'State what makes it unique: "Custom-built with imported Italian marble and a rooftop observatory."',
  },
  {
    pattern: 'highly sought after',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Highly sought after" is unsubstantiated and overused in listings.',
    suggestedFix: 'Provide evidence of demand: "Median days on market in this ZIP code is 6" or name the specific desirable feature.',
  },
  {
    pattern: 'too much to list',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'vague-praise',
    shortExplanation: '"Too much to list" wastes space that could be used to list actual features.',
    suggestedFix: 'List the top 3-5 features instead: "New roof, tankless water heater, smart thermostat, EV charger, and whole-house generator."',
  },
];

// ---------------------------------------------------------------------------
// 2. Euphemism Rules (~10)
//    Words perceived as code for negatives.
// ---------------------------------------------------------------------------
const euphemismRules: QualityRule[] = [
  {
    pattern: 'cozy',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Cozy" is widely perceived as code for "small."',
    suggestedFix: 'Use actual dimensions or layout details: "Efficient open floor plan with 950 sq ft" or "Compact layout maximizes every square foot."',
  },
  {
    pattern: 'quaint',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Quaint" is often read as "outdated" by buyers.',
    suggestedFix: 'Highlight the authentic details positively: "Original 1940s hardwood floors and period-appropriate fixtures."',
  },
  {
    pattern: 'charming',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Charming" is frequently interpreted as "small" or "old" by buyers.',
    suggestedFix: 'Describe the actual appeal: "Classic craftsman bungalow with built-in bookshelves and a wraparound porch."',
  },
  {
    pattern: 'rustic',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Rustic" is often code for "run-down" or "unfinished."',
    suggestedFix: 'If the aesthetic is intentional, be specific: "Exposed reclaimed barn-wood beams and stone fireplace surround."',
  },
  {
    pattern: 'vintage',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Vintage" can imply "old and not updated" to many buyers.',
    suggestedFix: 'Frame the era positively with specifics: "1925 Tudor Revival with original leaded glass windows, updated plumbing and electrical."',
  },
  {
    pattern: 'character home',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Character home" is often interpreted as "needs significant work."',
    suggestedFix: 'Describe the character: "Arched doorways, clawfoot tub, and original crown molding throughout."',
  },
  {
    pattern: 'handyman special',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Handyman special" signals the property is in poor condition.',
    suggestedFix: 'Be transparent about condition and opportunity: "Needs cosmetic updates; structural inspection report available. Priced 20% below comps."',
  },
  {
    pattern: "investor's dream",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Investor\'s dream" often implies an overpriced fixer-upper.',
    suggestedFix: 'Provide the investment case: "Current rent roll $2,400/mo on a $280K purchase price; cap rate 8.5%."',
  },
  {
    pattern: 'up-and-coming',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Up-and-coming" can be perceived as code for gentrification or an undesirable area.',
    suggestedFix: 'Cite specific neighborhood developments: "New light-rail station opening 2026, two new restaurants opened this year."',
  },
  {
    pattern: 'well-loved',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'euphemism',
    shortExplanation: '"Well-loved" is commonly read as "worn out" or "showing heavy use."',
    suggestedFix: 'Describe what the owners maintained: "Same-owner home for 30 years with consistent annual maintenance records."',
  },
];

// ---------------------------------------------------------------------------
// 3. Pressure Tactic Rules (~8)
//    Artificial urgency / pressure language.
// ---------------------------------------------------------------------------
const pressureTacticRules: QualityRule[] = [
  {
    pattern: 'act fast',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Act fast" creates artificial pressure that turns off informed buyers.',
    suggestedFix: 'Let the property details create natural urgency. If demand is real, state facts: "Open house drew 40 visitors last weekend."',
  },
  {
    pattern: "don't miss out",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Don\'t miss out" is manipulative FOMO language.',
    suggestedFix: 'Replace with an informative CTA: "Schedule a private showing this week" or "Download the full property brochure."',
  },
  {
    pattern: "won't last",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Won\'t last" is unsubstantiated pressure that erodes credibility.',
    suggestedFix: 'Describe why demand is high with facts: "Comparable homes in this neighborhood sold within 5 days in Q4."',
  },
  {
    pattern: 'once in a lifetime',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Once in a lifetime" is hyperbolic and not credible.',
    suggestedFix: 'Be specific about rarity: "First time on market in 35 years" or "Only waterfront lot available in this community."',
  },
  {
    pattern: 'last chance',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Last chance" creates unwarranted panic and is rarely true.',
    suggestedFix: 'State factual availability: "Final phase of development: 3 of 24 lots remaining."',
  },
  {
    pattern: 'priced to sell quickly',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Priced to sell quickly" implies desperation rather than value.',
    suggestedFix: 'Show value with data: "Listed 8% below recent comps at $X per sq ft" or "Priced based on recent appraisal."',
  },
  {
    pattern: 'multiple offers expected',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Multiple offers expected" can be seen as manipulative if not backed by market data.',
    suggestedFix: 'Cite real data if available: "Comparable listing at 123 Oak received 6 offers in 3 days." Otherwise, remove.',
  },
  {
    pattern: "hurry before it's gone",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Hurry before it\'s gone" is high-pressure sales language that damages trust.',
    suggestedFix: 'Replace with a factual, low-pressure CTA: "Book a showing at your convenience" or "Request the seller\'s disclosure today."',
  },
  {
    pattern: 'call now',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'pressure-tactic',
    shortExplanation: '"Call now" is aggressive, infomercial-style pressure language.',
    suggestedFix: 'Offer a softer next step: "Schedule a showing at a time that works for you" or "Questions? Text or call our listing agent."',
  },
];

// ---------------------------------------------------------------------------
// 4. Assumption Rules (~6)
//    Assumptions about the buyer.
// ---------------------------------------------------------------------------
const assumptionRules: QualityRule[] = [
  {
    pattern: 'perfect for your family',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'assumption',
    shortExplanation: 'Assumes the buyer has a family, which may not be the case.',
    suggestedFix: 'Focus on the feature: "4 bedrooms, fenced yard, and top-rated elementary school within walking distance."',
  },
  {
    pattern: "you'll love",
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'assumption',
    shortExplanation: 'Presuming what the buyer will feel is patronizing.',
    suggestedFix: 'Describe the feature and let the buyer decide: "South-facing sunroom receives natural light throughout the day."',
  },
  {
    pattern: 'your dream',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'assumption',
    shortExplanation: 'Assumes you know what the buyer dreams about.',
    suggestedFix: 'State facts instead: "5-bed, 3-bath on a half-acre lot with pool" lets the buyer decide if it matches their aspirations.',
  },
  {
    pattern: 'imagine yourself',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'assumption',
    shortExplanation: '"Imagine yourself" is a presumptuous sales tactic.',
    suggestedFix: 'Describe the scene factually: "The primary suite overlooks a private garden with mature landscaping."',
  },
  {
    pattern: 'picture your family',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'assumption',
    shortExplanation: 'Assumes the buyer has a family and projects a lifestyle onto them.',
    suggestedFix: 'Describe the space objectively: "Open backyard with mature shade trees and a covered patio."',
  },
  {
    pattern: 'you deserve',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'assumption',
    shortExplanation: '"You deserve" is presumptuous and manipulative.',
    suggestedFix: 'Let features stand on their own: "Spa-style primary bath with soaking tub and heated floors."',
  },
];

// ---------------------------------------------------------------------------
// 5. Meaningless Superlative Rules (~8)
//    Empty superlatives that convey no information.
// ---------------------------------------------------------------------------
const meaninglessSuperlativeRules: QualityRule[] = [
  {
    pattern: 'stunning',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Stunning" is overused and subjective; it tells the buyer nothing.',
    suggestedFix: 'Describe what makes it visually striking: "Double-height entry with a floating staircase and skylight."',
  },
  {
    pattern: 'gorgeous',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Gorgeous" is a subjective opinion, not a feature.',
    suggestedFix: 'Be specific: "Newly renovated kitchen with waterfall quartz island and custom cabinetry."',
  },
  {
    pattern: 'breathtaking',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Breathtaking" is hyperbolic and overused in listings.',
    suggestedFix: 'Describe the view or feature: "Unobstructed 180-degree ocean views from the primary bedroom balcony."',
  },
  {
    pattern: 'spectacular',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Spectacular" is an empty superlative that adds no value.',
    suggestedFix: 'Show, don\'t tell: "12-foot ceilings, floor-to-ceiling windows, and a chef\'s kitchen with Viking appliances."',
  },
  {
    pattern: 'magnificent',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Magnificent" is subjective fluff without substance.',
    suggestedFix: 'Use measurable details: "6,200 sq ft estate on 2.5 acres with a 3-car garage and guest house."',
  },
  {
    pattern: 'exquisite',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Exquisite" is vague praise that does not describe a feature.',
    suggestedFix: 'Specify the craftsmanship: "Hand-laid herringbone tile, custom millwork, and imported Venetian plaster walls."',
  },
  {
    pattern: 'impeccable',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Impeccable" is a claim without evidence.',
    suggestedFix: 'Provide evidence: "Professionally maintained with documented annual inspections since 2015."',
  },
  {
    pattern: 'unparalleled',
    category: 'anti-pattern',
    priority: 'recommended',
    subcategory: 'meaningless-superlative',
    shortExplanation: '"Unparalleled" is almost never literally true and sounds hyperbolic.',
    suggestedFix: 'State the competitive advantage specifically: "Highest elevation lot in the subdivision with 270-degree valley views."',
  },
];

// ---------------------------------------------------------------------------
// 6. AI Slop Rules (~10)
//    Classic AI-generated filler that sounds robotic and generic.
// ---------------------------------------------------------------------------
const aiSlopRules: QualityRule[] = [
  {
    pattern: 'nestled in',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Nestled in" is the quintessential AI-generated real estate phrase.',
    suggestedFix: 'State the location plainly: "Located on a cul-de-sac in the Maple Ridge subdivision" or "Set back 100 ft from the road on a wooded lot."',
  },
  {
    pattern: 'boasts',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Boasts" is AI filler that anthropomorphizes the property.',
    suggestedFix: 'Simply state the feature: "The home has a 3-car garage" instead of "The home boasts a 3-car garage."',
  },
  {
    pattern: 'beckons',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Beckons" is flowery AI language that sounds artificial.',
    suggestedFix: 'Use direct language: "The covered patio leads to a heated saltwater pool" instead of "The backyard beckons."',
  },
  {
    pattern: 'awaits',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Awaits" is a classic AI-generated filler word in property descriptions.',
    suggestedFix: 'Replace with direct description: "The home includes a finished basement with wet bar" instead of "Your new lifestyle awaits."',
  },
  {
    pattern: 'elevate your',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Elevate your" is generic AI marketing language.',
    suggestedFix: 'Describe the feature directly: "Primary suite with dual walk-in closets and a rain shower" instead of "Elevate your lifestyle."',
  },
  {
    pattern: 'curated',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Curated" is overused AI jargon in property copy.',
    suggestedFix: 'Be specific about what was selected: "Custom Italian tile and designer lighting fixtures throughout."',
  },
  {
    pattern: 'seamlessly',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Seamlessly" is filler that adds nothing meaningful.',
    suggestedFix: 'Describe the actual transition: "Sliding glass doors open the kitchen directly onto the patio" instead of "Indoor and outdoor living blend seamlessly."',
  },
  {
    pattern: 'bespoke',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Bespoke" is overused AI vocabulary that sounds pretentious in most listings.',
    suggestedFix: 'Use "custom-built" or specify: "Custom walnut cabinetry by local woodworker" instead of "bespoke finishes."',
  },
  {
    pattern: 'unwind in',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Unwind in" is a lazy AI-generated phrase.',
    suggestedFix: 'Describe the space itself: "Primary suite includes a sitting area, gas fireplace, and en-suite spa bath."',
  },
  {
    pattern: 'indulge in',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Indulge in" is flowery AI language that sounds generic.',
    suggestedFix: 'State the feature plainly: "The kitchen features a 48-inch range, pot filler, and walk-in pantry."',
  },
  {
    pattern: 'tranquil',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Tranquil" is a favorite AI word that adds flowery vagueness.',
    suggestedFix: 'Describe what creates the calm: "Dead-end street with no through traffic" or "Lot backs to a 50-acre conservation easement."',
  },
  {
    pattern: 'meticulously crafted',
    category: 'anti-pattern',
    priority: 'required',
    subcategory: 'ai-slop',
    shortExplanation: '"Meticulously crafted" is generic AI-generated praise.',
    suggestedFix: 'Name the craft: "Dovetail-joined custom cabinetry" or "Hand-troweled plaster walls" instead of vague praise.',
  },
];

// ---------------------------------------------------------------------------
// 7. Avoid Word Rules (~8)
//    Generic adjectives that weaken ad copy.
// ---------------------------------------------------------------------------
const avoidWordRules: QualityRule[] = [
  {
    pattern: 'nice',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Nice" is the weakest adjective in real estate copy.',
    suggestedFix: 'Replace with a specific detail: "Updated" / "Sun-filled" / "Professionally landscaped" depending on context.',
  },
  {
    pattern: 'great',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Great" is generic and tells the buyer nothing.',
    suggestedFix: 'Quantify what makes it great: "A 500 sq ft deck" instead of "a great deck."',
  },
  {
    pattern: 'good',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Good" is vague and unconvincing.',
    suggestedFix: 'Be specific: "Well-maintained" / "Energy-efficient" / "Move-in condition" depending on context.',
  },
  {
    pattern: 'beautiful',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Beautiful" is subjective and overused in every listing.',
    suggestedFix: 'Describe what makes it beautiful: "Mature Japanese maple garden visible from every room."',
  },
  {
    pattern: 'lovely',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Lovely" is weak and non-descriptive.',
    suggestedFix: 'Use a concrete detail: "Tree-lined street with sidewalks" instead of "lovely neighborhood."',
  },
  {
    pattern: 'wonderful',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Wonderful" conveys enthusiasm but zero information.',
    suggestedFix: 'Name the feature: "Award-winning school district (rated 9/10)" instead of "wonderful schools nearby."',
  },
  {
    pattern: 'amazing',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Amazing" is hyperbolic and adds nothing.',
    suggestedFix: 'Quantify or describe: "Panoramic city skyline views from the 12th-floor balcony" instead of "amazing views."',
  },
  {
    pattern: 'fantastic',
    category: 'power-avoid-words',
    priority: 'recommended',
    subcategory: 'avoid-word',
    shortExplanation: '"Fantastic" is empty praise without supporting detail.',
    suggestedFix: 'Replace with specifics: "5-minute walk to Metro, Whole Foods, and 3 parks" instead of "fantastic location."',
  },
];

// ---------------------------------------------------------------------------
// 8. Formatting Rules (~6)
//    Regex-based rules that detect formatting issues.
//    Pattern is prefixed with "regex:" to signal literal regex usage.
// ---------------------------------------------------------------------------
const formattingRules: QualityRule[] = [
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
// 9. Weak CTA Rules (~6)
//    Generic calls to action that miss conversion opportunities.
// ---------------------------------------------------------------------------
const ctaRules: QualityRule[] = [
  {
    pattern: 'click here',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"Click here" is the weakest possible CTA and provides no context.',
    suggestedFix: 'Use a specific, verb-first CTA: "Schedule your private showing" or "View all 42 listing photos."',
  },
  {
    pattern: 'learn more',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"Learn more" is generic and does not tell the buyer what they will get.',
    suggestedFix: 'Be specific about the action: "Download the floor plan" or "Request the seller\'s disclosure packet."',
  },
  {
    pattern: 'check it out',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"Check it out" is informal and vague as a CTA.',
    suggestedFix: 'Direct the buyer: "Take the 3D virtual tour" or "See the full photo gallery."',
  },
  {
    pattern: 'see more',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"See more" lacks specificity about what the buyer will see.',
    suggestedFix: 'Tell them what they will see: "Browse the complete renovation timeline" or "Request the full photo gallery."',
  },
  {
    pattern: 'contact us',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"Contact us" is passive and does not specify the next step.',
    suggestedFix: 'Use a direct action: "Call 555-0123 to schedule a showing" or "Text your questions to our listing agent."',
  },
  {
    pattern: 'reach out',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"Reach out" is vague corporate-speak that weakens the CTA.',
    suggestedFix: 'Be specific: "Book your showing online at [link]" or "Send a message to request the inspection report."',
  },
  {
    pattern: 'for more info',
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"For more info" is lazy and does not tell the buyer what info they will get.',
    suggestedFix: 'Specify the value: "Request the property fact sheet" or "Get the full inspection and disclosure reports."',
  },
  {
    pattern: "don't hesitate",
    category: 'cta-effectiveness',
    priority: 'recommended',
    subcategory: 'weak-cta',
    shortExplanation: '"Don\'t hesitate" is a weak, negative-framed CTA.',
    suggestedFix: 'Use positive framing: "Schedule your private tour today" or "Reserve your showing slot this weekend."',
  },
];

// ---------------------------------------------------------------------------
// Combined master list
// ---------------------------------------------------------------------------
export const qualityRules: QualityRule[] = [
  ...vaguePraiseRules,
  ...euphemismRules,
  ...pressureTacticRules,
  ...assumptionRules,
  ...meaninglessSuperlativeRules,
  ...aiSlopRules,
  ...avoidWordRules,
  ...formattingRules,
  ...ctaRules,
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
