
CREATE TABLE public.article_media_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'series', 'game')),
  media_title text NOT NULL,
  media_poster text,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, media_id, media_type)
);

ALTER TABLE public.article_media_links ENABLE ROW LEVEL SECURITY;

-- Everyone can view links for published articles
CREATE POLICY "Article media links viewable by everyone"
  ON public.article_media_links FOR SELECT
  USING (true);

-- Article authors can insert links
CREATE POLICY "Authors can add media links"
  ON public.article_media_links FOR INSERT
  WITH CHECK (
    auth.uid() = added_by AND (
      EXISTS (SELECT 1 FROM public.articles WHERE id = article_id AND user_id = auth.uid())
      OR is_article_collaborator(auth.uid(), article_id)
    )
  );

-- Article authors can delete links
CREATE POLICY "Authors can remove media links"
  ON public.article_media_links FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.articles WHERE id = article_id AND user_id = auth.uid())
    OR is_article_collaborator(auth.uid(), article_id)
  );

-- Admins can manage all links
CREATE POLICY "Admins can manage media links"
  ON public.article_media_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
