-- Create test_presets table for storing example listing data
CREATE TABLE test_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  listing_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE test_presets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow SELECT for admins only
CREATE POLICY "Admin users can view test presets"
  ON test_presets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Allow INSERT for admins only
CREATE POLICY "Admin users can create test presets"
  ON test_presets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Allow UPDATE for admins only
CREATE POLICY "Admin users can update test presets"
  ON test_presets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Allow DELETE for admins only
CREATE POLICY "Admin users can delete test presets"
  ON test_presets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert seed presets
INSERT INTO test_presets (name, listing_data) VALUES
(
  'Luxury Bozeman Home',
  '{
    "price": 850000,
    "beds": 4,
    "baths": 3,
    "sqft": 2800,
    "propertyType": "Single Family",
    "address": {
      "street": "2847 Bridger Hills Dr",
      "city": "Bozeman",
      "state": "MT",
      "zip": "59715",
      "neighborhood": "Bridger Hills"
    },
    "yearBuilt": 2019,
    "features": [
      "Mountain views",
      "Gourmet kitchen",
      "Heated 3-car garage",
      "Home office",
      "Stone fireplace",
      "Hardwood floors"
    ],
    "description": "Stunning custom-built home nestled in Bridger Hills with panoramic mountain views. Chef-grade kitchen with quartz countertops and Wolf appliances. Spacious primary suite with private balcony overlooking the Gallatin Valley. Heated three-car garage and professionally landscaped yard.",
    "photos": [
      "https://placehold.co/800x600?text=Luxury+Home+Front",
      "https://placehold.co/800x600?text=Kitchen",
      "https://placehold.co/800x600?text=Mountain+View"
    ],
    "sellingPoints": [
      "Unobstructed mountain views from every room",
      "Chef-grade Wolf/Sub-Zero kitchen",
      "Minutes from downtown Bozeman"
    ],
    "url": ""
  }'
),
(
  'Starter Condo in Missoula',
  '{
    "price": 275000,
    "beds": 2,
    "baths": 1,
    "sqft": 950,
    "propertyType": "Condo",
    "address": {
      "street": "415 River Rd Unit 204",
      "city": "Missoula",
      "state": "MT",
      "zip": "59801"
    },
    "yearBuilt": 2015,
    "features": [
      "Updated appliances",
      "Community pool",
      "In-unit laundry",
      "Covered parking",
      "Close to University of Montana"
    ],
    "description": "Move-in ready condo just minutes from the University of Montana campus and downtown Missoula. Updated stainless steel appliances, in-unit washer and dryer, and a private covered parking spot. Community amenities include pool and fitness center.",
    "photos": [
      "https://placehold.co/800x600?text=Condo+Exterior",
      "https://placehold.co/800x600?text=Living+Room"
    ],
    "sellingPoints": [
      "Walk to UM campus and downtown",
      "Low HOA with pool and gym",
      "Move-in ready"
    ],
    "url": ""
  }'
),
(
  'Rural Ranch in Helena',
  '{
    "price": 525000,
    "beds": 3,
    "baths": 2,
    "sqft": 1600,
    "propertyType": "Ranch",
    "address": {
      "street": "8901 Canyon Ferry Rd",
      "city": "Helena",
      "state": "MT",
      "zip": "59602"
    },
    "yearBuilt": 1998,
    "lotSize": "5 acres",
    "features": [
      "5 acres",
      "Horse-ready corrals",
      "Workshop/barn",
      "Well water",
      "Mountain backdrop",
      "Fenced pasture"
    ],
    "description": "Peaceful 5-acre ranch property with breathtaking mountain backdrop near Canyon Ferry Lake. Includes a 30x40 workshop/barn, horse-ready corrals, and fully fenced pasture. The home features an open floor plan, wood-burning stove, and wraparound deck perfect for taking in Montana sunsets.",
    "photos": [
      "https://placehold.co/800x600?text=Ranch+Home",
      "https://placehold.co/800x600?text=Barn",
      "https://placehold.co/800x600?text=Pasture"
    ],
    "sellingPoints": [
      "5 acres with horse-ready facilities",
      "30x40 workshop/barn included",
      "Minutes from Canyon Ferry Lake recreation"
    ],
    "url": ""
  }'
);
