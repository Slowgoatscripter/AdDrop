import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CampaignKit } from '@/lib/types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#0f172a' },
  label: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 2 },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  statsRow: { flexDirection: 'row' as const, gap: 16, marginBottom: 12 },
  stat: { fontSize: 10, color: '#334155' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 12 },
  footer: { position: 'absolute' as const, bottom: 30, left: 40, right: 40, textAlign: 'center' as const, fontSize: 8, color: '#94a3b8' },
});

interface CampaignPdfProps {
  campaign: CampaignKit;
}

export function CampaignPdf({ campaign }: CampaignPdfProps) {
  const { listing: l } = campaign;
  const addr = [l.address.street, l.address.city, l.address.state, l.address.zip].filter(Boolean).join(', ');

  return (
    <Document>
      {/* Page 1: Overview + Social Media */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{l.address.street || 'Property'}</Text>
        <Text style={styles.subtitle}>{addr} — ${l.price.toLocaleString()}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{l.beds} Beds</Text>
          <Text style={styles.stat}>{l.baths} Baths</Text>
          <Text style={styles.stat}>{l.sqft.toLocaleString()} Sq Ft</Text>
          <Text style={styles.stat}>{l.propertyType}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instagram Caption (Professional)</Text>
          <Text style={styles.body}>{campaign.instagram.professional}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facebook Post (Professional)</Text>
          <Text style={styles.body}>{campaign.facebook.professional}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Twitter / X</Text>
          <Text style={styles.body}>{campaign.twitter}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>

      {/* Page 2: Paid Ads + Online Listings */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Paid Ads &amp; Online Listings</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Ads</Text>
          {campaign.googleAds.map((ad, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Variation {i + 1}</Text>
              <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{ad.headline}</Text>
              <Text style={styles.body}>{ad.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meta / Facebook Ad</Text>
          <Text style={styles.label}>Primary Text</Text>
          <Text style={styles.body}>{campaign.metaAd.primaryText}</Text>
          <Text style={styles.label}>Headline</Text>
          <Text style={styles.body}>{campaign.metaAd.headline}</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.body}>{campaign.metaAd.description}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zillow</Text>
          <Text style={styles.body}>{campaign.zillow}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Realtor.com</Text>
          <Text style={styles.body}>{campaign.realtorCom}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Homes.com / Trulia</Text>
          <Text style={styles.body}>{campaign.homesComTrulia}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>

      {/* Page 3: Print + MLS */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Print Ads &amp; MLS</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Magazine — Full Page (Professional)</Text>
          <Text style={styles.label}>Headline</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>{campaign.magazineFullPage.professional.headline}</Text>
          <Text style={styles.body}>{campaign.magazineFullPage.professional.body}</Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2563eb' }}>{campaign.magazineFullPage.professional.cta}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Magazine — Half Page (Professional)</Text>
          <Text style={styles.label}>Headline</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>{campaign.magazineHalfPage.professional.headline}</Text>
          <Text style={styles.body}>{campaign.magazineHalfPage.professional.body}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MLS Description (Montana)</Text>
          <Text style={styles.body}>{campaign.mlsDescription}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>

      {/* Page 4: Marketing Strategy */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Marketing Strategy</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Points</Text>
          {campaign.sellingPoints.map((point, i) => (
            <Text key={i} style={styles.body}>{i + 1}. {point}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hashtags</Text>
          <Text style={styles.body}>{campaign.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calls to Action</Text>
          {campaign.callsToAction.map((cta, i) => (
            <Text key={i} style={styles.body}>• {cta}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audience &amp; Geo Targeting</Text>
          <Text style={styles.body}>{campaign.targetingNotes}</Text>
        </View>

        <Text style={styles.footer}>RealEstate Ad Gen — Campaign Kit</Text>
      </Page>
    </Document>
  );
}
