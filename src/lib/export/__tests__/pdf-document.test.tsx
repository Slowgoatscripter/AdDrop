import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RadioTimeSlot, RadioTone, RadioScript, CampaignKit } from '@/lib/types';

// --- Mock @react-pdf/renderer to render plain HTML elements ---
jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-page">{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Image: ({ src }: { src: string }) => <img src={src} alt="" />,
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

// Import AFTER jest.mock so the mock is in place
import { CampaignPdf } from '../pdf-document';

// --- Test data helpers ---

function makeScript(overrides: Partial<RadioScript> = {}): RadioScript {
  return {
    script: 'Default test script text.',
    wordCount: 5,
    estimatedDuration: '3 seconds',
    ...overrides,
  };
}

function makeRadioAds(
  overrides?: Partial<Record<RadioTimeSlot, Record<RadioTone, RadioScript>>>
): Record<RadioTimeSlot, Record<RadioTone, RadioScript>> {
  return {
    '15s': {
      conversational: makeScript({ script: '15s conversational script.' }),
      authoritative: makeScript({ script: '15s authoritative script.' }),
      friendly: makeScript({ script: '15s friendly script.' }),
    },
    '30s': {
      conversational: makeScript({
        script: '30s conversational script.',
        voiceStyle: 'Warm and inviting',
        musicSuggestion: 'Soft acoustic guitar',
        notes: 'Emphasize mountain views',
      }),
      authoritative: makeScript({ script: '30s authoritative script.' }),
      friendly: makeScript({ script: '30s friendly script.' }),
    },
    '60s': {
      conversational: makeScript({
        script: '60s conversational script.',
        voiceStyle: 'Deep and resonant',
        musicSuggestion: 'Upbeat country music',
        notes: 'Include call to action at end',
      }),
      authoritative: makeScript({ script: '60s authoritative script.' }),
      friendly: makeScript({ script: '60s friendly script.' }),
    },
    ...overrides,
  };
}

const baseCampaign: CampaignKit = {
  id: 'test-campaign-1',
  listing: {
    url: 'https://example.com',
    address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
    price: 450000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    propertyType: 'Single Family',
    features: ['Garage'],
    description: 'Nice home',
    photos: ['https://example.com/photo1.jpg'],
    listingAgent: 'Jane Smith',
  },
  createdAt: '2026-02-27T00:00:00Z',
  complianceResult: { passed: true, violations: [], platformResults: {} },
  hashtags: ['realestate'],
  callsToAction: ['Call now'],
  targetingNotes: 'Target Bozeman area',
  sellingPoints: ['Mountain views'],
} as unknown as CampaignKit;

// --- Tests ---

describe('CampaignPdf — Radio Ads section', () => {
  test('renders Radio Ads page title when campaign.radioAds is present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    // "Radio Ads" appears as both the page title and the footer label
    expect(screen.getAllByText('Radio Ads').length).toBeGreaterThanOrEqual(1);
  });

  test('does NOT render Radio Ads page when campaign.radioAds is undefined', () => {
    render(<CampaignPdf campaign={baseCampaign} />);
    expect(screen.queryByText('Radio Ads')).not.toBeInTheDocument();
  });

  test('does NOT render Radio Ads page when campaign.radioAds is empty object', () => {
    const campaign = { ...baseCampaign, radioAds: {} as any };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.queryByText('Radio Ads')).not.toBeInTheDocument();
  });

  test('renders all three time slot headers', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('15 Second')).toBeInTheDocument();
    expect(screen.getByText('30 Second')).toBeInTheDocument();
    expect(screen.getByText('60 Second')).toBeInTheDocument();
  });

  test('renders tone labels for each time slot', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    // Each tone appears 3 times (once per time slot)
    expect(screen.getAllByText('conversational')).toHaveLength(3);
    expect(screen.getAllByText('authoritative')).toHaveLength(3);
    expect(screen.getAllByText('friendly')).toHaveLength(3);
  });

  test('renders script text for each variation', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('15s conversational script.')).toBeInTheDocument();
    expect(screen.getByText('30s authoritative script.')).toBeInTheDocument();
    expect(screen.getByText('60s friendly script.')).toBeInTheDocument();
  });

  test('renders word count and estimated duration for each script', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    // All 9 scripts use default 5 words / 3 seconds
    const metaTexts = screen.getAllByText('5 words · ~3 seconds');
    expect(metaTexts).toHaveLength(9);
  });

  test('renders optional voiceStyle when present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Warm and inviting')).toBeInTheDocument();
    expect(screen.getByText('Deep and resonant')).toBeInTheDocument();
  });

  test('renders optional musicSuggestion when present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Soft acoustic guitar')).toBeInTheDocument();
    expect(screen.getByText('Upbeat country music')).toBeInTheDocument();
  });

  test('renders optional notes when present', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Emphasize mountain views')).toBeInTheDocument();
    expect(screen.getByText('Include call to action at end')).toBeInTheDocument();
  });

  test('does NOT render Voice Style label when voiceStyle is absent', () => {
    const campaign = {
      ...baseCampaign,
      radioAds: {
        '15s': {
          conversational: makeScript({ script: 'Only script, no optional fields.' }),
        },
      } as any,
    };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.queryByText('Voice Style')).not.toBeInTheDocument();
    expect(screen.queryByText('Music Suggestion')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  test('renders only present time slots when some are missing', () => {
    const partialRadio = {
      '30s': {
        conversational: makeScript({ script: 'Only 30s script.' }),
      },
    } as any;
    const campaign = { ...baseCampaign, radioAds: partialRadio };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('30 Second')).toBeInTheDocument();
    expect(screen.queryByText('15 Second')).not.toBeInTheDocument();
    expect(screen.queryByText('60 Second')).not.toBeInTheDocument();
  });

  test('renders page subtitle', () => {
    const campaign = { ...baseCampaign, radioAds: makeRadioAds() };
    render(<CampaignPdf campaign={campaign} />);
    expect(screen.getByText('Scripts by time slot & tone')).toBeInTheDocument();
  });
});
