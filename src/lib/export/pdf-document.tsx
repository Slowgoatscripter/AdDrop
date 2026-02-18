import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { CampaignKit, PrintAd } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Colour Palette & Styles                                           */
/* ------------------------------------------------------------------ */

const COLORS = {
  primary: '#1e3a5f',
  accent: '#2563eb',
  muted: '#64748b',
  light: '#94a3b8',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
  black: '#0f172a',
};

const styles = StyleSheet.create({
  /* ---------- Page ---------- */
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.black,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    fontSize: 7,
    color: COLORS.light,
  },

  /* ---------- Cover ---------- */
  coverPage: {
    padding: 0,
    fontFamily: 'Helvetica',
  },
  heroImage: {
    width: '100%',
    height: 340,
    objectFit: 'cover' as const,
  },
  coverBody: {
    padding: 40,
  },
  coverAddress: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  coverSubaddress: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  coverPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 20,
  },
  coverStatsRow: {
    flexDirection: 'row' as const,
    gap: 24,
    marginBottom: 20,
  },
  coverStat: {
    fontSize: 12,
    color: COLORS.black,
  },
  coverStatLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textTransform: 'uppercase' as const,
  },
  coverAgent: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 8,
  },

  /* ---------- Sections ---------- */
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginVertical: 12,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    color: COLORS.light,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
    color: COLORS.black,
  },
  toneLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 2,
    textTransform: 'capitalize' as const,
  },
  adHeadline: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  ctaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  hashtagBlock: {
    fontSize: 10,
    color: COLORS.accent,
    lineHeight: 1.6,
  },
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface CampaignPdfProps {
  campaign: CampaignKit;
}

function Footer({ label }: { label: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>RealEstate Ad Gen — Campaign Kit</Text>
      <Text>{label}</Text>
    </View>
  );
}

function SectionDivider() {
  return <View style={styles.divider} />;
}

function PrintAdBlock({ label, ad }: { label: string; ad: PrintAd }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.toneLabel}>{label}</Text>
      <Text style={styles.label}>Headline</Text>
      <Text style={styles.adHeadline}>{ad.headline}</Text>
      <Text style={styles.label}>Body</Text>
      <Text style={styles.body}>{ad.body}</Text>
      <Text style={styles.label}>CTA</Text>
      <Text style={styles.ctaText}>{ad.cta}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Document                                                           */
/* ------------------------------------------------------------------ */

export function CampaignPdf({ campaign }: CampaignPdfProps) {
  const { listing: l } = campaign;
  const street = l.address.street || 'Property';
  const cityStateZip = [l.address.city, l.address.state, l.address.zip]
    .filter(Boolean)
    .join(', ');
  const mlsState =
    campaign.listing?.address?.state?.trim() ||
    campaign.stateCode ||
    'Unknown State';
  const heroPhoto = l.photos?.[0] || null;

  return (
    <Document>
      {/* ============================================================ */}
      {/* COVER PAGE                                                    */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.coverPage}>
        {heroPhoto && (
          <Image style={styles.heroImage} src={heroPhoto} />
        )}

        <View style={styles.coverBody}>
          <Text style={styles.coverAddress}>{street}</Text>
          <Text style={styles.coverSubaddress}>{cityStateZip}</Text>
          <Text style={styles.coverPrice}>
            ${l.price.toLocaleString()}
          </Text>

          <View style={styles.coverStatsRow}>
            <View>
              <Text style={styles.coverStat}>{l.beds}</Text>
              <Text style={styles.coverStatLabel}>Bedrooms</Text>
            </View>
            <View>
              <Text style={styles.coverStat}>{l.baths}</Text>
              <Text style={styles.coverStatLabel}>Bathrooms</Text>
            </View>
            <View>
              <Text style={styles.coverStat}>
                {l.sqft.toLocaleString()}
              </Text>
              <Text style={styles.coverStatLabel}>Sq Ft</Text>
            </View>
            <View>
              <Text style={styles.coverStat}>{l.propertyType}</Text>
              <Text style={styles.coverStatLabel}>Type</Text>
            </View>
          </View>

          {(l.listingAgent || l.broker) && (
            <View>
              {l.listingAgent && (
                <Text style={styles.coverAgent}>
                  Agent: {l.listingAgent}
                </Text>
              )}
              {l.broker && (
                <Text style={styles.coverAgent}>
                  Broker: {l.broker}
                </Text>
              )}
            </View>
          )}
          {l.mlsNumber && (
            <Text style={styles.coverAgent}>MLS# {l.mlsNumber}</Text>
          )}
        </View>

        <Footer label="Cover" />
      </Page>

      {/* ============================================================ */}
      {/* SOCIAL MEDIA                                                  */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Social Media</Text>
        <Text style={styles.pageSubtitle}>
          Instagram, Facebook, Twitter &amp; Hashtags
        </Text>
        <SectionDivider />

        {/* Instagram — all tones */}
        {campaign.instagram && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instagram Captions</Text>
            {(
              Object.entries(campaign.instagram) as [string, string][]
            ).map(([tone, text]) => (
              <View key={tone} style={{ marginBottom: 6 }}>
                <Text style={styles.toneLabel}>{tone}</Text>
                <Text style={styles.body}>{text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Facebook — all tones */}
        {campaign.facebook && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facebook Posts</Text>
            {(
              Object.entries(campaign.facebook) as [string, string][]
            ).map(([tone, text]) => (
              <View key={tone} style={{ marginBottom: 6 }}>
                <Text style={styles.toneLabel}>{tone}</Text>
                <Text style={styles.body}>{text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Twitter */}
        {campaign.twitter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Twitter / X</Text>
            <Text style={styles.body}>{campaign.twitter}</Text>
          </View>
        )}

        {/* Hashtags */}
        {campaign.hashtags?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hashtags</Text>
            <Text style={styles.hashtagBlock}>
              {campaign.hashtags
                .map((h) => (h.startsWith('#') ? h : `#${h}`))
                .join('  ')}
            </Text>
          </View>
        )}

        <Footer label="Social Media" />
      </Page>

      {/* ============================================================ */}
      {/* PAID ADS                                                      */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Paid Advertising</Text>
        <Text style={styles.pageSubtitle}>
          Google Ads &amp; Meta / Facebook Ad
        </Text>
        <SectionDivider />

        {/* Google Ads */}
        {campaign.googleAds && campaign.googleAds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Google Ads</Text>
            {campaign.googleAds.map((ad, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <Text style={styles.label}>Variation {i + 1}</Text>
                <Text style={styles.adHeadline}>{ad.headline}</Text>
                <Text style={styles.body}>{ad.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meta Ad */}
        {campaign.metaAd && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Meta / Facebook Ad
            </Text>
            <Text style={styles.label}>Primary Text</Text>
            <Text style={styles.body}>
              {campaign.metaAd.primaryText}
            </Text>
            <Text style={styles.label}>Headline</Text>
            <Text style={styles.body}>
              {campaign.metaAd.headline}
            </Text>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.body}>
              {campaign.metaAd.description}
            </Text>
          </View>
        )}

        <Footer label="Paid Ads" />
      </Page>

      {/* ============================================================ */}
      {/* ONLINE LISTINGS                                               */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Online Listings</Text>
        <Text style={styles.pageSubtitle}>
          Zillow, Realtor.com, Homes/Trulia &amp; MLS
        </Text>
        <SectionDivider />

        {campaign.zillow && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zillow</Text>
            <Text style={styles.body}>{campaign.zillow}</Text>
          </View>
        )}

        {campaign.realtorCom && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Realtor.com</Text>
            <Text style={styles.body}>{campaign.realtorCom}</Text>
          </View>
        )}

        {campaign.homesComTrulia && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Homes.com / Trulia
            </Text>
            <Text style={styles.body}>
              {campaign.homesComTrulia}
            </Text>
          </View>
        )}

        {campaign.mlsDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {`MLS Description (${mlsState})`}
            </Text>
            <Text style={styles.body}>
              {campaign.mlsDescription}
            </Text>
          </View>
        )}

        <Footer label="Listings" />
      </Page>

      {/* ============================================================ */}
      {/* PRINT — POSTCARD                                              */}
      {/* ============================================================ */}
      {campaign.postcard && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.pageTitle}>Postcard</Text>
          <Text style={styles.pageSubtitle}>
            Direct mail — front &amp; back
          </Text>
          <SectionDivider />

          {(
            Object.entries(campaign.postcard) as [
              string,
              { front: PrintAd; back: string },
            ][]
          ).map(([tone, card]) => (
            <View key={tone} style={styles.section}>
              <Text style={styles.subsectionTitle}>
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </Text>

              <Text style={styles.label}>Front — Headline</Text>
              <Text style={styles.adHeadline}>
                {card.front.headline}
              </Text>
              <Text style={styles.label}>Front — Body</Text>
              <Text style={styles.body}>{card.front.body}</Text>
              <Text style={styles.label}>Front — CTA</Text>
              <Text style={styles.ctaText}>{card.front.cta}</Text>

              <Text style={styles.label}>Back</Text>
              <Text style={styles.body}>{card.back}</Text>
            </View>
          ))}

          <Footer label="Postcard" />
        </Page>
      )}

      {/* ============================================================ */}
      {/* PRINT — MAGAZINE                                              */}
      {/* ============================================================ */}
      {(campaign.magazineFullPage || campaign.magazineHalfPage) && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.pageTitle}>Magazine Ads</Text>
          <Text style={styles.pageSubtitle}>
            Full page &amp; half page layouts
          </Text>
          <SectionDivider />

          {/* Full Page — all tones */}
          {campaign.magazineFullPage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Magazine — Full Page
              </Text>
              {(
                Object.entries(campaign.magazineFullPage) as [
                  string,
                  PrintAd,
                ][]
              ).map(([tone, ad]) => (
                <PrintAdBlock
                  key={tone}
                  label={tone}
                  ad={ad}
                />
              ))}
            </View>
          )}

          {/* Half Page — all tones */}
          {campaign.magazineHalfPage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Magazine — Half Page
              </Text>
              {(
                Object.entries(campaign.magazineHalfPage) as [
                  string,
                  PrintAd,
                ][]
              ).map(([tone, ad]) => (
                <PrintAdBlock
                  key={tone}
                  label={tone}
                  ad={ad}
                />
              ))}
            </View>
          )}

          <Footer label="Magazine" />
        </Page>
      )}

      {/* ============================================================ */}
      {/* MARKETING STRATEGY                                            */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Marketing Strategy</Text>
        <Text style={styles.pageSubtitle}>
          Selling points, calls to action &amp; targeting
        </Text>
        <SectionDivider />

        {campaign.sellingPoints?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Top Selling Points
            </Text>
            {campaign.sellingPoints.map((point, i) => (
              <Text key={i} style={styles.bullet}>
                {i + 1}. {point}
              </Text>
            ))}
          </View>
        )}

        {campaign.callsToAction?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calls to Action</Text>
            {campaign.callsToAction.map((cta, i) => (
              <Text key={i} style={styles.bullet}>
                • {cta}
              </Text>
            ))}
          </View>
        )}

        {campaign.targetingNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Audience &amp; Geo Targeting
            </Text>
            <Text style={styles.body}>
              {campaign.targetingNotes}
            </Text>
          </View>
        )}

        <Footer label="Strategy" />
      </Page>
    </Document>
  );
}
