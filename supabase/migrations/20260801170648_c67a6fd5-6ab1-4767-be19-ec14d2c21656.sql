CREATE OR REPLACE FUNCTION public.can_view_article(_article_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = _article_id
      AND (
        a.published = true
        OR a.user_id = auth.uid()
        OR public.is_article_collaborator(auth.uid(), a.id)
        OR public.has_role(auth.uid(), 'admin')
      )
  )
$$;

DROP POLICY IF EXISTS "Translations readable by everyone" ON public.article_translations;
CREATE POLICY "Translations of visible articles are readable"
ON public.article_translations FOR SELECT
USING (public.can_view_article(article_id));

DROP POLICY IF EXISTS "Article media links viewable by everyone" ON public.article_media_links;
CREATE POLICY "Media links of visible articles are readable"
ON public.article_media_links FOR SELECT
USING (public.can_view_article(article_id));

DROP POLICY IF EXISTS "Article reactions viewable by everyone" ON public.article_reactions;
CREATE POLICY "Reactions of visible articles are readable"
ON public.article_reactions FOR SELECT
USING (public.can_view_article(article_id));