import { buildGenerationPrompt } from '../prompt';
import { ListingData } from '@/lib/types';

describe('buildGenerationPrompt', () => {
  const mockListing: ListingData = {
    url: 'https://example.com/listing/123',
    address: {
      street: '123 Main St',
      city: 'Bozeman',
      state: 'MT',
      zip: '59715',
    },
    price: 450000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    lotSize: '0.25 acres',
    yearBuilt: 2015,
    propertyType: 'Single Family',
    features: ['Granite Countertops', 'Hardwood Floors', 'Mountain Views'],
    description: 'Beautiful home with stunning mountain views.',
    photos: ['https://example.com/photo1.jpg'],
    listingAgent: 'Jane Doe',
    broker: 'Montana Realty',
  };

  test('includes property address in prompt', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('123 Main St, Bozeman, MT, 59715');
  });

  test('includes property price formatted with commas', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('$450,000');
  });

  test('includes property details (beds, baths, sqft)', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('3');
    expect(prompt).toContain('2');
    expect(prompt).toContain('1,800');
  });

  test('includes optional fields when present', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('0.25 acres');
    expect(prompt).toContain('2015');
    expect(prompt).toContain('Jane Doe');
    expect(prompt).toContain('Montana Realty');
  });

  test('includes features list', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('Granite Countertops');
    expect(prompt).toContain('Hardwood Floors');
    expect(prompt).toContain('Mountain Views');
  });

  test('includes listing description', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('Beautiful home with stunning mountain views.');
  });

  test('includes MLS compliance rules', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('MLS');
    expect(prompt).toContain('prohibited');
    expect(prompt).toContain('compliance');
  });

  test('includes JSON output structure requirements', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('instagram');
    expect(prompt).toContain('facebook');
    expect(prompt).toContain('twitter');
    expect(prompt).toContain('googleAds');
    expect(prompt).toContain('metaAd');
    expect(prompt).toContain('mlsDescription');
  });

  test('handles missing optional fields gracefully', () => {
    const minimalListing: ListingData = {
      url: 'https://example.com/listing/456',
      address: {
        street: '456 Oak Ave',
        city: 'Missoula',
        state: 'MT',
        zip: '59801',
      },
      price: 350000,
      beds: 2,
      baths: 1,
      sqft: 1200,
      propertyType: 'Condo',
      features: [],
      description: '',
      photos: [],
    };

    expect(() => buildGenerationPrompt(minimalListing)).not.toThrow();
    const prompt = buildGenerationPrompt(minimalListing);
    expect(prompt).toContain('456 Oak Ave, Missoula, MT, 59801');
    expect(prompt).toContain('$350,000');
  });

  test('includes character limits for different platforms', () => {
    const prompt = buildGenerationPrompt(mockListing);
    expect(prompt).toContain('280');
    expect(prompt).toContain('2200');
    expect(prompt).toContain('90 chars');
    expect(prompt).toContain('30 chars');
  });
});
