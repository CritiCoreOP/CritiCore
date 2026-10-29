CREATE TABLE public.social_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  kind text NOT NULL DEFAULT 'image',
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_assets TO authenticated;
GRANT ALL ON public.social_assets TO service_role;

ALTER TABLE public.social_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own social assets select"
  ON public.social_assets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users manage own social assets insert"
  ON public.social_assets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own social assets update"
  ON public.social_assets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own social assets delete"
  ON public.social_assets FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_social_assets_user_created ON public.social_assets (user_id, created_at DESC);

CREATE POLICY "Social assets own read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Social assets own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Social assets own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Social assets own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'social-assets' AND auth.uid()::text = (storage.foldername(name))[1]);