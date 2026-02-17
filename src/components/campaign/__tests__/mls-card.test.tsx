import { render, screen } from '@testing-library/react';
import { MlsCard } from '../mls-card';

const mockListing = {
  url: 'https://example.com',
  address: { street: '789 Pine Rd', city: 'Missoula', state: 'MT', zip: '59801' },
  price: 620000,
  beds: 4,
  baths: 3,
  sqft: 2800,
  propertyType: 'Single Family',
  features: ['Mountain Views'],
  description: 'Mountain retreat',
  photos: ['/photo1.jpg'],
  listingAgent: 'Mike Ross',
  broker: 'Western Realty',
  mlsNumber: 'MLS-2026-1234',
  lotSize: '0.5 acres',
  yearBuilt: 2018,
};

describe('MlsCard', () => {
  test('renders MLS system header', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getByText(/MLS Listing Detail/i)).toBeInTheDocument();
  });

  test('shows MLS number badge', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getByText(/MLS-2026-1234/)).toBeInTheDocument();
  });

  test('renders structured property fields', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/620,000/)).toBeInTheDocument();
    expect(screen.getByText(/789 Pine Rd/)).toBeInTheDocument();
    expect(screen.getByText(/Single Family/)).toBeInTheDocument();
  });

  test('renders Public Remarks section with description in monospace', () => {
    render(
      <MlsCard description="Beautiful mountain retreat with panoramic views" listing={mockListing} />
    );
    expect(screen.getByText(/Public Remarks/i)).toBeInTheDocument();
    expect(screen.getByText(/Beautiful mountain retreat/)).toBeInTheDocument();
  });

  test('shows character count badge', () => {
    const desc = 'A'.repeat(500);
    render(
      <MlsCard description={desc} listing={mockListing} />
    );
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  test('wraps in AdCardWrapper', () => {
    const { container } = render(
      <MlsCard description="Test" listing={mockListing} />
    );
    expect(container.querySelector('.bg-card')).toBeInTheDocument();
  });
});
