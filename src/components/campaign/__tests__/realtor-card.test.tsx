import React from 'react';
import { render, screen } from '@testing-library/react';
import { RealtorCard } from '../realtor-card';

const mockListing = {
  url: 'https://example.com',
  address: { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715' },
  price: 525000,
  beds: 4,
  baths: 3,
  sqft: 2400,
  propertyType: 'Single Family',
  features: ['Pool'],
  description: 'Great home',
  photos: ['/photo1.jpg'],
  listingAgent: 'John Doe',
  broker: 'Summit Realty',
};

describe('RealtorCard', () => {
  test('renders realtor.com branding', () => {
    render(
      <RealtorCard content="Lovely home" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getAllByText(/realtor\.com/i).length).toBeGreaterThanOrEqual(1);
  });

  test('shows listing price', () => {
    render(
      <RealtorCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getAllByText(/525,000/).length).toBeGreaterThanOrEqual(1);
  });

  test('displays property stats', () => {
    render(
      <RealtorCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getAllByText(/4 bd/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/3 ba/i).length).toBeGreaterThanOrEqual(1);
  });

  test('renders generated description', () => {
    render(
      <RealtorCard content="Spacious family home" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getAllByText(/Spacious family home/).length).toBeGreaterThanOrEqual(1);
  });
});
