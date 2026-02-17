import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstagramCard } from '../instagram-card';

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

describe('InstagramCard', () => {
  test('renders Instagram post layout with caption content', () => {
    render(
      <InstagramCard
        content={{ casual: 'My caption text here' }}
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getAllByText(/My caption text here/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders 2200-character badge', () => {
    render(
      <InstagramCard
        content={{ casual: 'Short caption' }}
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getAllByText(/\/ 2200 characters/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders EditableText for caption when onEditText is provided', async () => {
    const user = userEvent.setup();
    const onEditText = jest.fn();
    render(
      <InstagramCard
        content={{ casual: 'My caption' }}
        photos={['/photo1.jpg']}
        onEditText={onEditText}
      />
    );
    // Caption text should be clickable for editing (appears in both mobile and desktop + edit panel)
    const captions = screen.getAllByText(/My caption/);
    await user.click(captions[0]);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('does not render EditableText when onEditText is not provided', () => {
    render(
      <InstagramCard
        content={{ casual: 'My caption' }}
        photos={['/photo1.jpg']}
      />
    );
    // No pencil icon or edit affordance without onEditText
    expect(screen.queryByTestId('edit-pencil')).not.toBeInTheDocument();
  });

  test('calls onEditText with correct args when caption is saved', async () => {
    const user = userEvent.setup();
    const onEditText = jest.fn();
    render(
      <InstagramCard
        content={{ casual: 'Original caption' }}
        photos={['/photo1.jpg']}
        onEditText={onEditText}
        listing={mockListing}
      />
    );
    const captions = screen.getAllByText(/Original caption/);
    await user.click(captions[0]);
    const textbox = screen.getByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, 'Updated caption');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onEditText).toHaveBeenCalledWith('instagram', 'casual', 'Updated caption');
  });
});
