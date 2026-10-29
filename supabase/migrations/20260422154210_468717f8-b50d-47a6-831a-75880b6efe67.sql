CREATE TABLE public.subtitles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_id text NOT NULL,
  media_type text NOT NULL,
  media_title text NOT NULL,
  media_poster text,
  language text NOT NULL,
  format text NOT NULL DEFAULT 'srt',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subtitles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subtitles_user_id ON public.subtitles(user_id);
CREATE INDEX idx_subtitles_media ON public.subtitles(media_type, media_id);
CREATE INDEX idx_subtitles_status ON public.subtitles(status);

CREATE TRIGGER update_subtitles_updated_at
BEFORE UPDATE ON public.subtitles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Approved subtitles are viewable by everyone"
ON public.subtitles
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Users can view own subtitles"
ON public.subtitles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subtitles"
ON public.subtitles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own subtitles"
ON public.subtitles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND length(media_id) BETWEEN 1 AND 120
  AND media_type IN ('movie', 'series', 'season', 'episode')
  AND length(media_title) BETWEEN 1 AND 300
  AND language IN ('de', 'en', 'fr', 'es', 'th')
  AND format IN ('srt', 'vtt', 'ass')
  AND status IN ('draft', 'pending')
  AND length(file_path) BETWEEN 1 AND 1000
  AND length(file_name) BETWEEN 1 AND 255
  AND (notes IS NULL OR length(notes) <= 2000)
);

CREATE POLICY "Users can update own non-approved subtitles"
ON public.subtitles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status <> 'approved')
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('draft', 'pending')
  AND media_type IN ('movie', 'series', 'season', 'episode')
  AND language IN ('de', 'en', 'fr', 'es', 'th')
  AND format IN ('srt', 'vtt', 'ass')
  AND (notes IS NULL OR length(notes) <= 2000)
);

CREATE POLICY "Admins can update all subtitles"
ON public.subtitles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own non-approved subtitles"
ON public.subtitles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status <> 'approved');

CREATE POLICY "Admins can delete all subtitles"
ON public.subtitles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('subtitle-files', 'subtitle-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own subtitle files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subtitle-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(storage.extension(name)) IN ('srt', 'vtt', 'ass')
);

CREATE POLICY "Users can view own subtitle files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subtitle-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all subtitle files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'subtitle-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own subtitle files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'subtitle-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'subtitle-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(storage.extension(name)) IN ('srt', 'vtt', 'ass')
);

CREATE POLICY "Users can delete own subtitle files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'subtitle-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all subtitle files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'subtitle-files' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'subtitle-files' AND public.has_role(auth.uid(), 'admin'));