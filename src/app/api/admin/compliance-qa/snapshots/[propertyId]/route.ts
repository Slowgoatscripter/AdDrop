import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth-helpers';
import { generateCampaign } from '@/lib/ai/generate';

// ---------------------------------------------------------------------------
// GET  — List all snapshots for a property (newest first)
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const { propertyId } = await params;

    const { data: snapshots, error: fetchError } = await supabase
      .from('compliance_test_snapshots')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch snapshots' },
        { status: 500 }
      );
    }

    return NextResponse.json({ snapshots: snapshots || [] });
  } catch (error) {
    console.error('Fetch snapshots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Generate a new snapshot for a property
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    const { propertyId } = await params;

    // Fetch the property
    const { data: property, error: propError } = await supabase
      .from('compliance_test_properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Generate campaign from the property's listing data
    const campaign = await generateCampaign(property.listing_data);

    // Extract platform texts (same logic as the run route)
    const generatedText: Record<string, string> = {};
    if (campaign.instagram) {
      if (campaign.instagram.casual) generatedText['instagram.casual'] = campaign.instagram.casual;
      if (campaign.instagram.professional) generatedText['instagram.professional'] = campaign.instagram.professional;
      if (campaign.instagram.luxury) generatedText['instagram.luxury'] = campaign.instagram.luxury;
    }
    if (campaign.facebook) {
      if (campaign.facebook.casual) generatedText['facebook.casual'] = campaign.facebook.casual;
      if (campaign.facebook.professional) generatedText['facebook.professional'] = campaign.facebook.professional;
      if (campaign.facebook.luxury) generatedText['facebook.luxury'] = campaign.facebook.luxury;
    }
    if (campaign.twitter) generatedText['twitter'] = campaign.twitter;
    if (campaign.googleAds) {
      generatedText['googleAds'] = campaign.googleAds.map(ad =>
        `${ad.headline} - ${ad.description}`
      ).join('\n');
    }
    if (campaign.metaAd) {
      generatedText['metaAd'] = `${campaign.metaAd.headline}\n${campaign.metaAd.primaryText}\n${campaign.metaAd.description}`;
    }
    if (campaign.magazineFullPage) {
      if (campaign.magazineFullPage.professional) {
        generatedText['magazineFullPage.professional'] = campaign.magazineFullPage.professional.body;
      }
      if (campaign.magazineFullPage.luxury) {
        generatedText['magazineFullPage.luxury'] = campaign.magazineFullPage.luxury.body;
      }
    }
    if (campaign.magazineHalfPage) {
      if (campaign.magazineHalfPage.professional) {
        generatedText['magazineHalfPage.professional'] = campaign.magazineHalfPage.professional.body;
      }
      if (campaign.magazineHalfPage.luxury) {
        generatedText['magazineHalfPage.luxury'] = campaign.magazineHalfPage.luxury.body;
      }
    }
    if (campaign.postcard) {
      if (campaign.postcard.professional) {
        generatedText['postcard.professional'] = campaign.postcard.professional.front.body;
      }
      if (campaign.postcard.casual) {
        generatedText['postcard.casual'] = campaign.postcard.casual.front.body;
      }
    }
    if (campaign.zillow) generatedText['zillow'] = campaign.zillow;
    if (campaign.realtorCom) generatedText['realtorCom'] = campaign.realtorCom;
    if (campaign.homesComTrulia) generatedText['homesComTrulia'] = campaign.homesComTrulia;
    if (campaign.mlsDescription) generatedText['mlsDescription'] = campaign.mlsDescription;

    // Insert the snapshot
    const { data: snapshot, error: insertError } = await supabase
      .from('compliance_test_snapshots')
      .insert({
        property_id: propertyId,
        generated_text: generatedText,
        approved: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save snapshot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Generate snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to generate snapshot' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — Approve or reject a snapshot
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { user, supabase, error } = await requireAuth();
    if (error) return error;

    // propertyId is available from the route but the body identifies the snapshot
    await params;

    const body = await request.json().catch(() => ({} as any));
    const { snapshotId, approved } = body;

    if (!snapshotId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'snapshotId (string) and approved (boolean) are required' },
        { status: 400 }
      );
    }

    const { data: snapshot, error: updateError } = await supabase
      .from('compliance_test_snapshots')
      .update({ approved })
      .eq('id', snapshotId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update snapshot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Update snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to update snapshot' },
      { status: 500 }
    );
  }
}
