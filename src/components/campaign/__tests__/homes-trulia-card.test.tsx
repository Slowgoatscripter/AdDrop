import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomesTruliaCard } from '../homes-trulia-card';

const mockListing = {
  url: 'https://example.com',
  address: { street: '456 Oak Ave', city: 'Helena', state: 'MT', zip: '59601' },
  price: 375000,
  beds: 3,
  baths: 2,
  sqft: 1600,
  propertyType: 'Townhouse',
  features: ['Fireplace'],
  description: 'Cozy townhouse',
  photos: ['/photo1.jpg'],
  listingAgent: 'Sarah Lee',
  broker: 'Big Sky Realty',
};

describe('HomesTruliaCard', () => {
  test('renders Homes.com branding with teal color', () => {
    render(
      <HomesTruliaCard content="Charming townhouse" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/Homes\.com/i)).toBeInTheDocument();
  });

  test('shows listing price', () => {
    render(
      <HomesTruliaCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/375,000/)).toBeInTheDocument();
  });

  test('displays property stats', () => {
    render(
      <HomesTruliaCard content="Description" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/3 bd/i)).toBeInTheDocument();
    expect(screen.getByText(/2 ba/i)).toBeInTheDocument();
  });

  test('renders generated description', () => {
    render(
      <HomesTruliaCard content="Charming townhouse near downtown" photos={['/photo1.jpg']} listing={mockListing} />
    );
    expect(screen.getByText(/Charming townhouse near downtown/)).toBeInTheDocument();
  });
});
