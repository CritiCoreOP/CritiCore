-- Dashboard v2.0: which article went out on which social platform, so nothing is posted twice.
-- Readable and writable by the editorial team (press) and admins only.

CREATE TABLE IF NOT EXISTS public.social_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('x', 'instagram', 'bluesky', 'threads', 'facebook')),
  shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  shared_at timestamptz NOT NULL DEFAULT now(),
  post_url text CHECK (post_url IS NULL OR post_url ~ '^https://'),
  UNIQUE (article_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_shares_article ON public.social_shares(article_id);

ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads social shares"
  ON public.social_shares FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'press'));

CREATE POLICY "Team marks articles as shared"
  ON public.social_shares FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'press'))
    AND shared_by = auth.uid()
  );

CREATE POLICY "Team removes share marks"
  ON public.social_shares FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'press'));

-- The admin overview shows failed mails of the last day; until now only the service role could read the log
CREATE POLICY "Admins read send log"
  ON public.email_send_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
