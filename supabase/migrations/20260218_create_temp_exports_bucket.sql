-- Create temp-exports bucket (private — signed URL access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-exports', 'temp-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users upload own temp exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'temp-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can read their own temp exports
CREATE POLICY "Users read own temp exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can delete their own temp exports
CREATE POLICY "Users delete own temp exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'temp-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
