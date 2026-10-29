-- Admins can update, delete and hand over any article, and the Redaktion, the content admin and the
-- press dashboard list every article for them. Reading was the one thing missing: the only SELECT
-- policies are "published or own" and "collaborator", so admins got an empty list of other people's
-- drafts, could not open them in the editor, and a draft they had just given to another author
-- vanished for them. can_view_article() (translations, collaborators) already lets admins see drafts.
-- Public lists filter on published = true themselves and are unaffected.
DROP POLICY IF EXISTS "Admins can view all articles" ON public.articles;
CREATE POLICY "Admins can view all articles"
  ON public.articles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
