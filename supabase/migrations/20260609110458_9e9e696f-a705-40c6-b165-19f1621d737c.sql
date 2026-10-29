
DROP POLICY IF EXISTS "Authenticated users can upload rw images" ON storage.objects;
CREATE POLICY "Authenticated users can upload rw images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rw-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
