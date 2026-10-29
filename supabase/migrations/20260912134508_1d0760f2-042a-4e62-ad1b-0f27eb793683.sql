DROP POLICY IF EXISTS "Press can insert translations" ON public.article_translations;
DROP POLICY IF EXISTS "Press can update translations" ON public.article_translations;

CREATE POLICY "Authorized press can insert translations"
ON public.article_translations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'press'::public.app_role)
    AND (
      EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_translations.article_id
          AND a.user_id = auth.uid()
      )
      OR public.is_article_collaborator(auth.uid(), article_translations.article_id)
    )
  )
);

CREATE POLICY "Authorized press can update translations"
ON public.article_translations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'press'::public.app_role)
    AND (
      EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_translations.article_id
          AND a.user_id = auth.uid()
      )
      OR public.is_article_collaborator(auth.uid(), article_translations.article_id)
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'press'::public.app_role)
    AND (
      EXISTS (
        SELECT 1
        FROM public.articles a
        WHERE a.id = article_translations.article_id
          AND a.user_id = auth.uid()
      )
      OR public.is_article_collaborator(auth.uid(), article_translations.article_id)
    )
  )
);