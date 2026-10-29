
-- Table for user-uploaded media images
CREATE TABLE public.media_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'series', 'game')),
  image_type text NOT NULL CHECK (image_type IN ('backdrop', 'poster', 'logo')),
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_images ENABLE ROW LEVEL SECURITY;

-- Everyone can see approved images
CREATE POLICY "Approved images viewable by everyone"
ON public.media_images FOR SELECT
USING (status = 'approved');

-- Users can see their own uploads (any status)
CREATE POLICY "Users can view own uploads"
ON public.media_images FOR SELECT
TO authenticated
USING (auth.uid() = uploaded_by);

-- Admins can see all images
CREATE POLICY "Admins can view all images"
ON public.media_images FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images"
ON public.media_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by AND status = 'pending');

-- Admins can update status
CREATE POLICY "Admins can update images"
ON public.media_images FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Users can delete their own pending uploads
CREATE POLICY "Users can delete own pending uploads"
ON public.media_images FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by AND status = 'pending');

-- Admins can delete any image
CREATE POLICY "Admins can delete any image"
ON public.media_images FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for media images
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-images', 'media-images', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload media images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-images');

CREATE POLICY "Media images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-images');

CREATE POLICY "Users can delete own media images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can delete any media image"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media-images' AND public.has_role(auth.uid(), 'admin'));
