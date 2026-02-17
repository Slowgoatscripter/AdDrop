import { render, screen } from '@testing-library/react';
import { ZillowCard } from '../zillow-card';

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
  broker: 'Montana Realty',
};

describe('ZillowCard', () => {
  test('renders Zillow branding header', () => {
    render(
      <ZillowCard
        content="Beautiful home with mountain views"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getAllByText('Zillow').length).toBeGreaterThanOrEqual(1);
  });

  test('shows price from listing data', () => {
    render(
      <ZillowCard
        content="Description text"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/450,000/)).toBeInTheDocument();
  });

  test('displays beds, baths, sqft badges', () => {
    render(
      <ZillowCard
        content="Description text"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/3 bd/i)).toBeInTheDocument();
    expect(screen.getByText(/2 ba/i)).toBeInTheDocument();
    expect(screen.getByText(/1,800/)).toBeInTheDocument();
  });

  test('renders the generated description content', () => {
    render(
      <ZillowCard
        content="Stunning mountain retreat with panoramic views"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/Stunning mountain retreat/)).toBeInTheDocument();
  });

  test('shows agent info in footer', () => {
    render(
      <ZillowCard
        content="Description"
        photos={['/photo1.jpg']}
        listing={mockListing}
      />
    );
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
  });
});
