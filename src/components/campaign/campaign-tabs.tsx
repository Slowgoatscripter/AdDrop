'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignKit, PlatformId, ComplianceAgentResult, ComplianceViolation, PlatformComplianceResult } from '@/lib/types';
import { extractPlatformTexts } from '@/lib/compliance/utils';
import type { QualitySuggestion, QualityConstraintViolation, QualityIssue, PlatformQualityResult } from '@/lib/types/quality';
import { InstagramCard } from './instagram-card';
import { FacebookCard } from './facebook-card';
import { TwitterCard } from './twitter-card';
import { GoogleAdsCard } from './google-ads-card';
import { MetaAdCard } from './meta-ad-card';
import { PrintAdCard } from './print-ad-card';
import { PostcardCard } from './postcard-card';
import { ZillowCard } from './zillow-card';
import { RealtorCard } from './realtor-card';
import { HomesTruliaCard } from './homes-trulia-card';
import { MlsCard } from './mls-card';
import { MarketingCard } from './marketing-card';
import { PhotosTab } from './photos-tab';

interface CategoryConfig {
  value: string;
  label: string;
  platforms: PlatformId[];
}

const CATEGORIES: CategoryConfig[] = [
  { value: 'social', label: 'Social Media', platforms: ['instagram', 'facebook', 'twitter'] },
  { value: 'paid', label: 'Paid Ads', platforms: ['googleAds', 'metaAd'] },
  { value: 'print', label: 'Print', platforms: ['magazineFullPage', 'magazineHalfPage', 'postcard'] },
  { value: 'listings', label: 'Online Listings', platforms: ['zillow', 'realtorCom', 'homesComTrulia'] },
  { value: 'mls', label: 'MLS', platforms: ['mlsDescription'] },
];

interface CampaignTabsProps {
  campaign: CampaignKit;
  onReplace?: (platform: string, oldTerm: string, newTerm: string) => void;
  onRevert?: (issue: QualityIssue) => void;
  onEditText?: (platform: string, field: string, newValue: string) => void;
  onRegenerate?: (platform: string, tone: string) => void;
  regeneratingPlatform?: string | null;
  qualitySuggestions?: QualitySuggestion[];
  qualityConstraints?: QualityConstraintViolation[];
  onApplySuggestion?: (suggestion: QualitySuggestion) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
  onPhotosChange?: (photos: string[]) => void;
  userId?: string;
}

function extractContext(term: string, platformTexts: Map<string, string>, platformPrefix: string): string {
  if (!term) return '';
  // Search platform texts for the term and extract surrounding context
  for (const [key, text] of platformTexts) {
    if (key === platformPrefix || key.startsWith(platformPrefix + '.')) {
      const idx = text.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + term.length + 40);
        let snippet = text.slice(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        return snippet;
      }
    }
  }
  return term;
}

function buildPlatformResult(
  agentResult: ComplianceAgentResult | undefined,
  platformTexts: Map<string, string>,
  platformPrefix: string
): PlatformComplianceResult | undefined {
  if (!agentResult) return undefined;

  // Filter violations for this platform (exact match or dot-prefixed sub-platforms)
  const violations: ComplianceViolation[] = agentResult.violations
    .filter(v => v.platform === platformPrefix || v.platform.startsWith(platformPrefix + '.'))
    .map(v => {
      // Find matching auto-fix for suggested alternative
      const fix = agentResult.autoFixes.find(
        f => f.platform === v.platform && f.violationTerm === v.term
      );
      return {
        platform: v.platform,
        term: v.term,
        category: v.category,
        severity: v.severity,
        explanation: v.explanation,
        law: v.law,
        alternative: fix?.after || 'review this term',
        context: extractContext(v.term, platformTexts, platformPrefix),
      };
    });

  // Check for explicit verdict; if platform is missing from verdict list, infer from violations
  const platformVerdict = agentResult.platforms.find(p => p.platform === platformPrefix);
  const passed = platformVerdict
    ? platformVerdict.verdict === 'pass'
    : violations.length === 0;

  return {
    platform: platformPrefix,
    violations,
    passed,
    hardCount: violations.filter(v => v.severity === 'hard').length,
    softCount: violations.filter(v => v.severity === 'soft').length,
  };
}

function buildPlatformQualityResult(
  qualitySuggestions: QualitySuggestion[] | undefined,
  qualityConstraints: QualityConstraintViolation[] | undefined,
  platformPrefix: string
): PlatformQualityResult | undefined {
  const suggestions = qualitySuggestions?.filter(
    (s) => s.platform === platformPrefix || s.platform.startsWith(platformPrefix + '.')
  ) ?? [];

  const constraints = qualityConstraints?.filter(
    (c) => c.platform === platformPrefix || c.platform.startsWith(platformPrefix + '.')
  ) ?? [];

  if (suggestions.length === 0 && constraints.length === 0) return undefined;

  const issues: QualityIssue[] = [
    ...suggestions.map((s): QualityIssue => ({
      platform: s.platform,
      category: s.category,
      priority: s.severity === 'high' ? 'required' : 'recommended',
      source: 'ai',
      issue: s.issue,
      suggestedFix: s.suggestedRewrite ?? s.explanation,
      context: s.currentText,
    })),
    ...constraints.map((c): QualityIssue => ({
      platform: c.platform,
      category: 'platform-format',
      priority: 'required',
      source: 'regex',
      issue: c.issue,
      suggestedFix: c.fixedText ?? 'Auto-enforced',
      originalText: c.currentText,
      fixedText: c.fixedText ?? undefined,
    })),
  ];

  return {
    platform: platformPrefix,
    issues,
    passed: issues.length === 0,
  };
}

/** undefined selectedPlatforms = all platforms (backward compat for old campaigns) */
function has(selected: PlatformId[] | undefined, platform: PlatformId): boolean {
  if (!selected) return true;
  return selected.includes(platform);
}

export function CampaignTabs({ campaign, onReplace, onRevert, onEditText, onRegenerate, regeneratingPlatform, qualitySuggestions, qualityConstraints, onApplySuggestion, onDismissSuggestion, onPhotosChange, userId }: CampaignTabsProps) {
  const agentResult = campaign.complianceResult;
  const photos = campaign.listing.photos;
  const listing = campaign.listing;
  const selected = campaign.selectedPlatforms;

  // Build platform text map for violation context extraction
  const platformTexts = new Map(extractPlatformTexts(campaign));

  // Hide entire category tab when 0 platforms in that category are selected
  const visibleCategories = CATEGORIES.filter((cat) =>
    cat.platforms.some((p) => has(selected, p))
  );

  // Strategy is always visible; default to first visible category
  const defaultTab = visibleCategories.length > 0 ? visibleCategories[0].value : 'strategy';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="flex overflow-x-auto flex-nowrap w-full">
        {onPhotosChange && userId && (
          <TabsTrigger value="photos" className="flex-shrink-0">Photos</TabsTrigger>
        )}
        {visibleCategories.map((cat) => (
          <TabsTrigger key={cat.value} value={cat.value} className="flex-shrink-0">{cat.label}</TabsTrigger>
        ))}
        <TabsTrigger value="strategy" className="flex-shrink-0">Strategy</TabsTrigger>
      </TabsList>

      {/* Photos */}
      {onPhotosChange && userId && (
        <TabsContent value="photos" className="mt-4">
          <PhotosTab photos={photos} onPhotosChange={onPhotosChange} userId={userId} />
        </TabsContent>
      )}

      {/* Social Media */}
      {visibleCategories.some((c) => c.value === 'social') && (
        <TabsContent value="social" className="flex flex-col gap-6 mt-4">
          {has(selected, 'instagram') && campaign.instagram && (
            <InstagramCard content={campaign.instagram} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'instagram')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'instagram')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
          {has(selected, 'facebook') && campaign.facebook && (
            <FacebookCard content={campaign.facebook} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'facebook')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'facebook')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
          {has(selected, 'twitter') && campaign.twitter && (
            <TwitterCard content={campaign.twitter} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'twitter')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'twitter')} onReplace={onReplace} onEditText={onEditText} />
          )}
        </TabsContent>
      )}

      {/* Paid Ads */}
      {visibleCategories.some((c) => c.value === 'paid') && (
        <TabsContent value="paid" className="flex flex-col gap-6 mt-4">
          {has(selected, 'googleAds') && campaign.googleAds && (
            <GoogleAdsCard ads={campaign.googleAds} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'googleAds')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'googleAds')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
          {has(selected, 'metaAd') && campaign.metaAd && (
            <MetaAdCard content={{ professional: campaign.metaAd }} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'metaAd')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'metaAd')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
        </TabsContent>
      )}

      {/* Print */}
      {visibleCategories.some((c) => c.value === 'print') && (
        <TabsContent value="print" className="flex flex-col gap-6 mt-4">
          {has(selected, 'magazineFullPage') && campaign.magazineFullPage && (
            <PrintAdCard title="Magazine — Full Page" content={campaign.magazineFullPage} photos={photos} listing={listing} variant="full-page" complianceResult={buildPlatformResult(agentResult, platformTexts, 'magazineFullPage')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'magazineFullPage')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
          {has(selected, 'magazineHalfPage') && campaign.magazineHalfPage && (
            <PrintAdCard title="Magazine — Half Page" content={campaign.magazineHalfPage} photos={photos} listing={listing} variant="half-page" complianceResult={buildPlatformResult(agentResult, platformTexts, 'magazineHalfPage')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'magazineHalfPage')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
          {has(selected, 'postcard') && campaign.postcard && (
            <PostcardCard content={campaign.postcard} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'postcard')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'postcard')} onReplace={onReplace} onRevert={onRevert} onEditText={onEditText} />
          )}
        </TabsContent>
      )}

      {/* Online Listings */}
      {visibleCategories.some((c) => c.value === 'listings') && (
        <TabsContent value="listings" className="flex flex-col gap-6 mt-4">
          {has(selected, 'zillow') && campaign.zillow && (
            <ZillowCard content={campaign.zillow} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'zillow')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'zillow')} onReplace={onReplace} onEditText={onEditText} />
          )}
          {has(selected, 'realtorCom') && campaign.realtorCom && (
            <RealtorCard content={campaign.realtorCom} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'realtorCom')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'realtorCom')} onReplace={onReplace} onEditText={onEditText} />
          )}
          {has(selected, 'homesComTrulia') && campaign.homesComTrulia && (
            <HomesTruliaCard content={campaign.homesComTrulia} photos={photos} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'homesComTrulia')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'homesComTrulia')} onReplace={onReplace} onEditText={onEditText} />
          )}
        </TabsContent>
      )}

      {/* MLS */}
      {visibleCategories.some((c) => c.value === 'mls') && (
        <TabsContent value="mls" className="mt-4">
          {has(selected, 'mlsDescription') && campaign.mlsDescription && (
            <MlsCard description={campaign.mlsDescription} listing={listing} complianceResult={buildPlatformResult(agentResult, platformTexts, 'mlsDescription')} qualityResult={buildPlatformQualityResult(qualitySuggestions, qualityConstraints, 'mlsDescription')} onReplace={onReplace} onEditText={onEditText} />
          )}
        </TabsContent>
      )}

      {/* Strategy — always visible */}
      <TabsContent value="strategy" className="mt-4">
        <MarketingCard
          sellingPoints={campaign.sellingPoints}
          hashtags={campaign.hashtags}
          callsToAction={campaign.callsToAction}
          targetingNotes={campaign.targetingNotes}
          complianceResults={{
            hashtags: buildPlatformResult(agentResult, platformTexts, 'hashtags'),
            callsToAction: buildPlatformResult(agentResult, platformTexts, 'callsToAction'),
            targetingNotes: buildPlatformResult(agentResult, platformTexts, 'targetingNotes'),
            sellingPoints: buildPlatformResult(agentResult, platformTexts, 'sellingPoints'),
          }}
          onReplace={onReplace}
        />
      </TabsContent>
    </Tabs>
  );
}
