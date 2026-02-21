'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Home, Bed, Bath, Ruler, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoPipeline } from './demo-pipeline';
import { DemoPlatformCard } from './demo-platform-card';
import { DemoLockedCards } from './demo-locked-cards';
import { DemoComplianceDiff } from './demo-compliance-diff';
import { SAMPLE_PROPERTIES, DEMO_PLATFORMS } from '@/lib/demo/sample-properties';
import type { CampaignKit, AdTone, GoogleAd } from '@/lib/types/campaign';
import type { ComplianceAgentResult, ComplianceAutoFix } from '@/lib/types/compliance';
import type { CampaignQualityResult } from '@/lib/types/quality';
import Link from 'next/link';

type DemoState = 'idle' | 'loading' | 'animating' | 'revealed';

interface DemoData {
  campaign: CampaignKit;
  compliance: ComplianceAgentResult;
  quality: CampaignQualityResult | null;
  rawCampaign: CampaignKit;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

/** Extract the display text for a platform from the campaign kit */
function getPlatformContent(campaign: CampaignKit, platform: string): string {
  switch (platform) {
    case 'instagram':
    case 'facebook': {
      const data = campaign[platform as 'instagram' | 'facebook'];
      if (!data) return '';
      // data is Record<AdTone, string> — pick 'professional' for demo
      if (typeof data === 'string') return data;
      return (data as Record<AdTone, string>).professional ?? Object.values(data)[0] ?? '';
    }
    case 'googleAds': {
      const ads = campaign.googleAds;
      if (!ads || ads.length === 0) return '';
      const ad = ads[0] as GoogleAd;
      return `${ad.headline}\n${ad.description}`;
    }
    default:
      return '';
  }
}

/** Get compliance info for a specific platform */
function getPlatformCompliance(compliance: ComplianceAgentResult, platform: string) {
  const verdict = compliance.platforms?.find((p) => p.platform === platform);
  const fixCount = compliance.autoFixes?.filter((f) => f.platform === platform).length ?? 0;
  return {
    passed: verdict?.verdict === 'pass',
    fixCount,
  };
}

/** Get quality score (campaign-level, shared across platforms) */
function getQualityScore(quality: CampaignQualityResult | null): number | undefined {
  return quality?.overallScore ?? undefined;
}

export function InteractiveDemo() {
  const [state, setState] = useState<DemoState>('idle');
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [propertyIndex, setPropertyIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentProperty = SAMPLE_PROPERTIES[propertyIndex];

  const handleGenerate = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const res = await fetch('/api/demo');
      const data = await res.json();

      if (!data.available) {
        setError('Demo not available yet. Please try again later.');
        setState('idle');
        return;
      }

      setDemoData({
        campaign: data.campaign,
        compliance: data.compliance,
        quality: data.quality,
        rawCampaign: data.rawCampaign,
      });
      setState('animating');
    } catch {
      setError('Something went wrong. Please try again.');
      setState('idle');
    }
  }, []);

  const handlePipelineComplete = useCallback(() => {
    setState('revealed');
  }, []);

  const handleTryAnother = useCallback(async () => {
    setPropertyIndex((prev) => (prev + 1) % SAMPLE_PROPERTIES.length);
    setState('loading');
    setError(null);

    try {
      const res = await fetch('/api/demo');
      const data = await res.json();

      if (!data.available) {
        setError('Demo not available yet. Please try again later.');
        setState('idle');
        return;
      }

      setDemoData({
        campaign: data.campaign,
        compliance: data.compliance,
        quality: data.quality,
        rawCampaign: data.rawCampaign,
      });
      setState('animating');
    } catch {
      setError('Something went wrong. Please try again.');
      setState('idle');
    }
  }, []);

  const violationCount = demoData?.compliance?.totalAutoFixes ?? 0;
  const autoFixes: ComplianceAutoFix[] = demoData?.compliance?.autoFixes ?? [];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-4 text-cream">
          See It In Action
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Watch our AI generate compliant real estate ads in seconds — no signup required
        </p>

        <AnimatePresence mode="wait">
          {/* IDLE STATE */}
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Sample property card */}
              <div className="bg-surface border border-gold/10 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-5 h-5 text-gold" />
                  <span className="font-serif text-lg text-cream">Sample Property</span>
                </div>

                <p className="text-cream/90 font-medium text-lg">
                  {currentProperty.address.street}
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  {currentProperty.address.city}, {currentProperty.address.state} {currentProperty.address.zip}
                  {currentProperty.address.neighborhood && ` · ${currentProperty.address.neighborhood}`}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-cream/80 mb-4">
                  <span className="font-semibold text-gold text-lg">
                    {formatPrice(currentProperty.price)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4 text-muted-foreground" />
                    {currentProperty.beds} bd
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    {currentProperty.baths} ba
                  </span>
                  <span className="flex items-center gap-1">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    {currentProperty.sqft.toLocaleString()} sqft
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentProperty.features.slice(0, 4).map((feature) => (
                    <span
                      key={feature}
                      className="text-xs bg-gold/10 text-gold/80 px-2 py-1 rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                  {currentProperty.features.length > 4 && (
                    <span className="text-xs text-muted-foreground px-2 py-1">
                      +{currentProperty.features.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Generate button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className={cn(
                    'inline-flex items-center gap-2 px-8 py-3 rounded-lg',
                    'bg-gold text-background font-semibold text-lg',
                    'hover:bg-gold/90 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                  )}
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Sample Campaign
                </button>
              </div>

              {error && (
                <p className="text-center text-red-400 text-sm">{error}</p>
              )}
            </motion.div>
          )}

          {/* LOADING STATE */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center py-16"
            >
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                <span>Loading demo...</span>
              </div>
            </motion.div>
          )}

          {/* ANIMATING STATE */}
          {state === 'animating' && (
            <motion.div
              key="animating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <DemoPipeline
                violationCount={violationCount}
                onComplete={handlePipelineComplete}
              />
            </motion.div>
          )}

          {/* REVEALED STATE */}
          {state === 'revealed' && demoData && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-10"
            >
              {/* Platform cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEMO_PLATFORMS.map((platform, idx) => (
                  <DemoPlatformCard
                    key={platform}
                    platform={platform}
                    content={getPlatformContent(demoData.campaign, platform)}
                    hashtags={platform !== 'googleAds' ? demoData.campaign.hashtags?.slice(0, 5) : undefined}
                    compliance={getPlatformCompliance(demoData.compliance, platform)}
                    qualityScore={getQualityScore(demoData.quality)}
                    index={idx}
                  />
                ))}
              </div>

              {/* Compliance diff */}
              <div className="max-w-2xl mx-auto">
                <DemoComplianceDiff autoFixes={autoFixes} />
              </div>

              {/* Locked cards */}
              <DemoLockedCards unlockedPlatforms={[...DEMO_PLATFORMS]} />

              {/* CTAs */}
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-sm">
                  This is just 3 of 12+ platforms. Sign up free to generate for your own listings.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className={cn(
                      'inline-flex items-center gap-2 px-8 py-3 rounded-lg',
                      'bg-gold text-background font-semibold',
                      'hover:bg-gold/90 transition-colors',
                    )}
                  >
                    Create Your Own Campaign — Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleTryAnother}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-3 rounded-lg',
                      'border border-gold/20 text-cream text-sm',
                      'hover:bg-gold/5 transition-colors',
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try another property
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
