import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioAdsCard } from '../radioAds-card';
import type { RadioTimeSlot, RadioTone, RadioScript } from '@/lib/types';

function makeScript(overrides: Partial<RadioScript> = {}): RadioScript {
  return {
    script: 'Looking for your dream home in Bozeman?',
    wordCount: 8,
    estimatedDuration: '4 seconds',
    ...overrides,
  };
}

function makeContent(overrides?: Partial<Record<RadioTimeSlot, Record<RadioTone, RadioScript>>>) {
  const defaults: Record<RadioTimeSlot, Record<RadioTone, RadioScript>> = {
    '15s': {
      conversational: makeScript({ script: '15s conversational script text' }),
      authoritative: makeScript({ script: '15s authoritative script text' }),
      friendly: makeScript({ script: '15s friendly script text' }),
    },
    '30s': {
      conversational: makeScript({
        script: '30s conversational script text',
        voiceStyle: 'Warm and inviting',
        musicSuggestion: 'Soft acoustic guitar',
        notes: 'Emphasize the mountain views',
      }),
      authoritative: makeScript({ script: '30s authoritative script text' }),
      friendly: makeScript({ script: '30s friendly script text' }),
    },
    '60s': {
      conversational: makeScript({
        script: '60s conversational script text',
        voiceStyle: 'Deep and resonant',
        musicSuggestion: 'Upbeat country music',
        notes: 'Include the call to action at the end',
      }),
      authoritative: makeScript({ script: '60s authoritative script text' }),
      friendly: makeScript({ script: '60s friendly script text' }),
    },
  };
  return { ...defaults, ...overrides };
}

const mockListing = {
  url: 'https://example.com',
  address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  propertyType: 'Single Family',
  features: ['Garage'],
  description: 'Nice home',
  photos: ['/photo1.jpg'],
  listingAgent: 'Jane Smith',
};

describe('RadioAdsCard', () => {
  test('renders the default (first) script', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByText(/15s conversational script text/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders all three time-slot tabs', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByRole('tab', { name: /15 Second/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('tab', { name: /30 Second/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('tab', { name: /60 Second/ }).length).toBeGreaterThanOrEqual(1);
  });

  test('renders tone selector buttons', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByRole('radio', { name: /Conversational/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('radio', { name: /Authoritative/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('radio', { name: /Friendly/i }).length).toBeGreaterThanOrEqual(1);
  });

  test('switches script content when tone is changed', async () => {
    const user = userEvent.setup();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    const authButtons = screen.getAllByRole('radio', { name: /Authoritative/i });
    await user.click(authButtons[0]);
    expect(screen.getAllByText(/15s authoritative script text/).length).toBeGreaterThanOrEqual(1);
  });

  test('switches script content when time slot tab is changed', async () => {
    const user = userEvent.setup();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    const tabs30 = screen.getAllByRole('tab', { name: /30 Second/ });
    await user.click(tabs30[0]);
    expect(screen.getAllByText(/30s conversational script text/).length).toBeGreaterThanOrEqual(1);
  });

  test('displays word count and estimated duration', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.getAllByText(/8/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4 seconds/).length).toBeGreaterThanOrEqual(1);
  });

  test('displays optional voiceStyle, musicSuggestion, notes when present', async () => {
    const user = userEvent.setup();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    const tabs30 = screen.getAllByRole('tab', { name: /30 Second/ });
    await user.click(tabs30[0]);
    expect(screen.getAllByText(/Warm and inviting/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Soft acoustic guitar/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Emphasize the mountain views/).length).toBeGreaterThanOrEqual(1);
  });

  test('does not render optional field labels when they are absent', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    // 15s scripts have no voiceStyle/musicSuggestion/notes by default
    expect(screen.queryByText('Voice Style')).not.toBeInTheDocument();
    expect(screen.queryByText('Music')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  test('renders EditableText when onEditText is provided', async () => {
    const user = userEvent.setup();
    const onEditText = jest.fn();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} onEditText={onEditText} />);
    const scriptTexts = screen.getAllByText(/15s conversational script text/);
    await user.click(scriptTexts[0]);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('calls onEditText with correct platform and field args', async () => {
    const user = userEvent.setup();
    const onEditText = jest.fn();
    render(<RadioAdsCard content={makeContent()} listing={mockListing} onEditText={onEditText} />);
    const scriptTexts = screen.getAllByText(/15s conversational script text/);
    await user.click(scriptTexts[0]);
    const textbox = screen.getByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, 'Updated script');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onEditText).toHaveBeenCalledWith('radioAds', '15s.conversational.script', 'Updated script');
  });

  test('does not show edit pencil when onEditText is not provided', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} />);
    expect(screen.queryByTestId('edit-pencil')).not.toBeInTheDocument();
  });

  test('renders locked overlay when isLocked is true', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} isLocked={true} />);
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  test('does not render locked overlay when isLocked is false', () => {
    render(<RadioAdsCard content={makeContent()} listing={mockListing} isLocked={false} />);
    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
  });
});
