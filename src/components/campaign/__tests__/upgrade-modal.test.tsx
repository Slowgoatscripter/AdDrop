import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UpgradeModal } from '../upgrade-modal';

describe('UpgradeModal', () => {
  test('renders modal content when open', () => {
    render(<UpgradeModal open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    expect(
      screen.getByText(/unlock radio ads/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view plans/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maybe later/i })).toBeInTheDocument();
  });

  test('does not render content when closed', () => {
    render(<UpgradeModal open={false} onOpenChange={() => {}} />);

    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
  });

  test('View Plans link navigates to /pricing', () => {
    render(<UpgradeModal open={true} onOpenChange={() => {}} />);

    const link = screen.getByRole('link', { name: /view plans/i });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  test('Maybe Later button calls onOpenChange with false', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<UpgradeModal open={true} onOpenChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: /maybe later/i }));

    expect(handleChange).toHaveBeenCalledWith(false);
  });

  test('displays feature list items', () => {
    render(<UpgradeModal open={true} onOpenChange={() => {}} />);

    // Should render feature list with Pro features
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThanOrEqual(3);
    // Check specific list item text (using exact match to avoid description overlap)
    expect(screen.getByText('Radio Ads — 15s, 30s & 60s scripts in 3 tones')).toBeInTheDocument();
    expect(screen.getByText('PDF exports & bundle downloads')).toBeInTheDocument();
  });
});
