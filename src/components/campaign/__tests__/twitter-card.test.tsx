import React from 'react';
import { render, screen } from '@testing-library/react';
import { TwitterCard } from '../twitter-card';

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

describe('TwitterCard', () => {
  test('renders Twitter/X post layout with content', () => {
    render(
      <TwitterCard
        content="Just listed! Beautiful 3BR home in Bozeman."
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getAllByText(/Just listed/).length).toBeGreaterThanOrEqual(1);
  });

  test('shows X logo and profile section', () => {
    render(
      <TwitterCard
        content="Check out this property!"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
  });

  test('renders 280-character badge', () => {
    render(
      <TwitterCard
        content="Short tweet"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getAllByText(/\/ 280 characters/).length).toBeGreaterThanOrEqual(1);
  });

  test('wraps content in AdCardWrapper', () => {
    const { container } = render(
      <TwitterCard
        content="Test tweet"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(container.querySelector('.bg-card')).toBeInTheDocument();
  });
});
