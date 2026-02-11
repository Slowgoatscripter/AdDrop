import type { ListingData } from './listing';

export interface TestPreset {
  id: string;
  name: string;
  listing_data: ListingData;
  created_by: string;
  created_at: string;
  updated_at: string;
}
