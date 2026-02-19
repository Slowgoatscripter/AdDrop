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
    expect(screen.getAllByText(/MLS Listing/i).length).toBeGreaterThanOrEqual(1);
  });

  test('shows MLS number badge', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getAllByText(/MLS-2026-1234/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders structured property fields', () => {
    render(
      <MlsCard description="MLS description" listing={mockListing} />
    );
    expect(screen.getAllByText(/Active/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/620,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/789 Pine Rd/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Single Family/).length).toBeGreaterThanOrEqual(1);
  });

  test('renders Public Remarks section with description in monospace', () => {
    render(
      <MlsCard description="Beautiful mountain retreat with panoramic views" listing={mockListing} />
    );
    expect(screen.getAllByText(/Public Remarks/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Beautiful mountain retreat/).length).toBeGreaterThanOrEqual(1);
  });

  test('shows character count badge', () => {
    const desc = 'A'.repeat(500);
    render(
      <MlsCard description={desc} listing={mockListing} />
    );
    expect(screen.getAllByText(/500/).length).toBeGreaterThanOrEqual(1);
  });

  test('wraps in AdCardWrapper', () => {
    const { container } = render(
      <MlsCard description="Test" listing={mockListing} />
    );
    expect(container.querySelector('.bg-card')).toBeInTheDocument();
  });
});
