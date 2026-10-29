
-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Article images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-images' AND auth.uid() IS NOT NULL);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own article images"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);
