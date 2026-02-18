import { createClient } from '@/lib/supabase/server';
import { CampaignKit, GoogleAd, MetaAd, PrintAd } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from './copy-button';
import { DownloadButton } from './download-button';

// --- Expired / Invalid State ---

function ExpiredView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
      <p className="text-muted-foreground text-center">
        This campaign link has expired. Please contact the sender for a new link.
      </p>
    </div>
  );
}

// --- Section wrapper ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

// --- Text block with copy button ---

function TextBlock({ label, text }: { label?: string; text: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {label && <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>}
          <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        </div>
        <CopyButton text={text} className="shrink-0" />
      </div>
    </Card>
  );
}

// --- Tone-based content (Instagram, Facebook) ---

function ToneSection({ title, content }: { title: string; content: Record<string, string> }) {
  const tones = Object.entries(content);
  if (tones.length === 0) return null;

  return (
    <Section title={title}>
      <div className="space-y-2">
        {tones.map(([tone, text]) => (
          <TextBlock key={tone} label={tone.charAt(0).toUpperCase() + tone.slice(1)} text={text} />
        ))}
      </div>
    </Section>
  );
}

// --- Google Ads ---

function GoogleAdsSection({ ads }: { ads: GoogleAd[] }) {
  return (
    <Section title="Google Ads">
      <div className="space-y-2">
        {ads.map((ad, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">Ad {i + 1}</p>
                <p className="text-sm font-medium">{ad.headline}</p>
                <p className="text-sm text-muted-foreground mt-1">{ad.description}</p>
              </div>
              <CopyButton text={`${ad.headline}\n${ad.description}`} className="shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

// --- Meta Ad ---

function MetaAdSection({ ad }: { ad: MetaAd }) {
  const fullText = [ad.primaryText, ad.headline, ad.description].join('\n\n');
  return (
    <Section title="Meta Ad">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm whitespace-pre-wrap">{ad.primaryText}</p>
            <p className="text-sm font-semibold mt-2">{ad.headline}</p>
            <p className="text-sm text-muted-foreground mt-1">{ad.description}</p>
          </div>
          <CopyButton text={fullText} className="shrink-0" />
        </div>
      </Card>
    </Section>
  );
}

// --- Print Ad ---

function PrintAdSection({ title, content }: { title: string; content: Record<string, PrintAd> }) {
  const entries = Object.entries(content);
  if (entries.length === 0) return null;

  return (
    <Section title={title}>
      <div className="space-y-2">
        {entries.map(([tone, ad]) => {
          const fullText = [ad.headline, ad.body, ad.cta].join('\n\n');
          return (
            <Card key={tone} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </p>
                  <p className="text-sm font-semibold">{ad.headline}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{ad.body}</p>
                  <p className="text-sm font-medium text-primary mt-2">{ad.cta}</p>
                </div>
                <CopyButton text={fullText} className="shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

// --- Postcard ---

function PostcardSection({ content }: { content: Record<string, { front: PrintAd; back: string }> }) {
  const entries = Object.entries(content);
  if (entries.length === 0) return null;

  return (
    <Section title="Postcard">
      <div className="space-y-2">
        {entries.map(([tone, { front, back }]) => {
          const fullText = `Front:\n${front.headline}\n${front.body}\n${front.cta}\n\nBack:\n${back}`;
          return (
            <Card key={tone} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-2">Front</p>
                  <p className="text-sm font-semibold">{front.headline}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{front.body}</p>
                  <p className="text-sm font-medium text-primary mt-1">{front.cta}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-3">Back</p>
                  <p className="text-sm whitespace-pre-wrap">{back}</p>
                </div>
                <CopyButton text={fullText} className="shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

// --- Strategy Section ---

function StrategySection({ campaign }: { campaign: CampaignKit }) {
  return (
    <Section title="Strategy">
      <div className="space-y-3">
        {campaign.sellingPoints.length > 0 && (
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Selling Points</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {campaign.sellingPoints.map((sp, i) => (
                <li key={i}>{sp}</li>
              ))}
            </ul>
            <CopyButton
              text={campaign.sellingPoints.join('\n')}
              label="Copy"
              variant="outline"
              size="sm"
              className="mt-2"
            />
          </Card>
        )}
        {campaign.hashtags.length > 0 && (
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Hashtags</p>
            <p className="text-sm">{campaign.hashtags.join(' ')}</p>
            <CopyButton
              text={campaign.hashtags.join(' ')}
              label="Copy"
              variant="outline"
              size="sm"
              className="mt-2"
            />
          </Card>
        )}
        {campaign.callsToAction.length > 0 && (
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Calls to Action</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {campaign.callsToAction.map((cta, i) => (
                <li key={i}>{cta}</li>
              ))}
            </ul>
            <CopyButton
              text={campaign.callsToAction.join('\n')}
              label="Copy"
              variant="outline"
              size="sm"
              className="mt-2"
            />
          </Card>
        )}
        {campaign.targetingNotes && (
          <TextBlock label="Targeting Notes" text={campaign.targetingNotes} />
        )}
      </div>
    </Section>
  );
}

// --- Main Page ---

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('campaigns')
    .select('id, generated_ads, share_token')
    .eq('share_token', token)
    .gt('share_expires_at', new Date().toISOString())
    .single();

  if (error || !row || !row.generated_ads) {
    return <ExpiredView />;
  }

  const campaign = row.generated_ads as CampaignKit;
  const campaignId = row.id as string;
  const listing = campaign.listing;

  if (!listing) {
    return <ExpiredView />;
  }

  const addr = listing.address;
  const heroPhoto = listing.photos?.[0];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 bg-muted overflow-hidden">
        {heroPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroPhoto}
            alt={addr?.street || 'Property'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Photo Available
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
            {addr?.street || 'Property'}
          </h1>
          <p className="text-white/80 text-sm drop-shadow-md">
            {[addr?.city, addr?.state, addr?.zip].filter(Boolean).join(', ')}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md mt-1">
            ${listing.price?.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Property details bar */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {listing.beds != null && <Badge variant="secondary">{listing.beds} Beds</Badge>}
            {listing.baths != null && <Badge variant="secondary">{listing.baths} Baths</Badge>}
            {listing.sqft != null && <Badge variant="secondary">{listing.sqft.toLocaleString()} Sq Ft</Badge>}
          </div>
          <DownloadButton
            campaignId={campaignId}
            shareToken={token}
            addressStreet={addr?.street}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Social Media */}
        {campaign.instagram && (
          <ToneSection title="Instagram" content={campaign.instagram} />
        )}
        {campaign.facebook && (
          <ToneSection title="Facebook" content={campaign.facebook} />
        )}
        {campaign.twitter && (
          <Section title="Twitter / X">
            <TextBlock text={campaign.twitter} />
          </Section>
        )}

        {/* Paid Ads */}
        {campaign.googleAds && campaign.googleAds.length > 0 && (
          <GoogleAdsSection ads={campaign.googleAds} />
        )}
        {campaign.metaAd && (
          <MetaAdSection ad={campaign.metaAd} />
        )}

        {/* Print */}
        {campaign.magazineFullPage && (
          <PrintAdSection title="Magazine -- Full Page" content={campaign.magazineFullPage} />
        )}
        {campaign.magazineHalfPage && (
          <PrintAdSection title="Magazine -- Half Page" content={campaign.magazineHalfPage} />
        )}
        {campaign.postcard && (
          <PostcardSection content={campaign.postcard} />
        )}

        {/* Online Listings */}
        {campaign.zillow && (
          <Section title="Zillow">
            <TextBlock text={campaign.zillow} />
          </Section>
        )}
        {campaign.realtorCom && (
          <Section title="Realtor.com">
            <TextBlock text={campaign.realtorCom} />
          </Section>
        )}
        {campaign.homesComTrulia && (
          <Section title="Homes.com / Trulia">
            <TextBlock text={campaign.homesComTrulia} />
          </Section>
        )}

        {/* MLS */}
        {campaign.mlsDescription && (
          <Section title="MLS Description">
            <TextBlock text={campaign.mlsDescription} />
          </Section>
        )}

        {/* Strategy */}
        <StrategySection campaign={campaign} />
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Generated by RealEstate Ad Gen
      </footer>
    </main>
  );
}
