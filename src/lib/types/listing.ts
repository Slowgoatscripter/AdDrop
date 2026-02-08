export interface ListingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
}

export interface ListingData {
  url: string;
  address: ListingAddress;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSize?: string;
  yearBuilt?: number;
  propertyType: string;
  features: string[];
  description: string;
  photos: string[];
  listingAgent?: string;
  broker?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ListingData;
  error?: string;
  missingFields?: string[];
}
