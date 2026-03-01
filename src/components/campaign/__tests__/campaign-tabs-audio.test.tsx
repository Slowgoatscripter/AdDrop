import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignTabs } from '../campaign-tabs';
import type { CampaignKit, PlatformId, RadioAdsContent, AudioTone } from '@/lib/types';

// --- Helpers ---

function makeRadioAds(): RadioAdsContent {
  const tones: Record<AudioTone, { script: string; wordCount: number; estimatedDuration: number }> = {
    conversational: { script: 'Conversational radio script', wordCount: 8, estimatedDuration: 15 },
    authoritative: { script: 'Authoritative radio script', wordCount: 8, estimatedDuration: 15 },
    friendly: { script: 'Friendly radio script', wordCount: 8, estimatedDuration: 15 },
  };
  return {
    '15s': { ...tones },
    '30s': { ...tones },
    '60s': { ...tones },
  };
}

const baseListing = {
  url: 'https://example.com',
  address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  propertyType: 'Single Family' as const,
  features: ['Garage'],
  description: 'Nice home',
  photos: ['/photo1.jpg'],
  listingAgent: 'Jane Smith',
};

function makeCampaign(overrides: Partial<CampaignKit> = {}): CampaignKit {
  return {
    id: 'test-campaign-1',
    createdAt: '2026-02-27T00:00:00Z',
    listing: baseListing,
    radioAds: makeRadioAds(),
    mlsDescription: 'MLS description',
    sellingPoints: ['Great location'],
    hashtags: ['#realestate'],
    callsToAction: ['Call now'],
    targetingNotes: 'Target first-time buyers',
    complianceResult: {
      violations: [],
      autoFixes: [],
      platforms: [],
      overallVerdict: 'pass',
    },
    selectedPlatforms: ['mlsDescription', 'radioAds'] as PlatformId[],
    ...overrides,
  } as CampaignKit;
}

// --- Tests ---

describe('CampaignTabs — Audio / Radio tab', () => {
  test('shows "Audio / Radio" tab trigger when radioAds is in selectedPlatforms', () => {
    render(<CampaignTabs campaign={makeCampaign()} />);
    expect(screen.getByRole('tab', { name: /Audio \/ Radio/i })).toBeInTheDocument();
  });

  test('hides "Audio / Radio" tab trigger when radioAds is NOT in selectedPlatforms', () => {
    const campaign = makeCampaign({
      selectedPlatforms: ['mlsDescription'] as PlatformId[],
    });
    render(<CampaignTabs campaign={campaign} />);
    expect(screen.queryByRole('tab', { name: /Audio \/ Radio/i })).not.toBeInTheDocument();
  });

  test('Audio / Radio tab appears after MLS and before Strategy in tab order', () => {
    render(<CampaignTabs campaign={makeCampaign()} />);
    const tabs = screen.getAllByRole('tab');
    const tabLabels = tabs.map((t) => t.textContent ?? '');

    const mlsIndex = tabLabels.indexOf('MLS');
    const audioIndex = tabLabels.indexOf('Audio / Radio');
    const strategyIndex = tabLabels.indexOf('Strategy');

    expect(mlsIndex).toBeGreaterThanOrEqual(0);
    expect(audioIndex).toBeGreaterThanOrEqual(0);
    expect(strategyIndex).toBeGreaterThanOrEqual(0);
    expect(audioIndex).toBeGreaterThan(mlsIndex);
    expect(audioIndex).toBeLessThan(strategyIndex);
  });

  test('RadioAdsCard renders inside the audio tab when clicked', async () => {
    const user = userEvent.setup();
    render(<CampaignTabs campaign={makeCampaign()} />);
    const audioTab = screen.getByRole('tab', { name: /Audio \/ Radio/i });
    await user.click(audioTab);

    // RadioAdsCard renders the script content after clicking the audio tab
    expect(screen.getAllByText(/Conversational radio script/).length).toBeGreaterThanOrEqual(1);
  });
});
