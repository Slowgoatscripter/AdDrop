-- Create the property-images storage bucket (public read for marketing material)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users upload own property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can delete their own uploads
CREATE POLICY "Users delete own property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Public read access (property photos are marketing material)
CREATE POLICY "Public read property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');
