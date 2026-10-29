
-- Create storage bucket for Redaim workspace images
INSERT INTO storage.buckets (id, name, public) VALUES ('rw-images', 'rw-images', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload rw images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rw-images' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Public can view rw images"
ON storage.objects FOR SELECT
USING (bucket_id = 'rw-images');

-- Allow owners to delete their uploads
CREATE POLICY "Users can delete own rw images"
ON storage.objects FOR DELETE
USING (bucket_id = 'rw-images' AND auth.uid()::text = (storage.foldername(name))[1]);
