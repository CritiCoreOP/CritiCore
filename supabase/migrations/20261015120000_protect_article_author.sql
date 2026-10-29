-- Who wrote an article (articles.user_id) may only be changed by an admin.
--
-- Admins can already update any article. But the policy "Collaborators can update articles" only
-- checks that the caller is a collaborator, before and after the update, so an invited co-author
-- could set user_id to themselves and take the article over. Authors cannot hand it away (their
-- policy checks user_id = auth.uid() after the update), collaborators could.
--
-- For requests from the site (anon/authenticated) that are not from an admin, user_id keeps its old
-- value; the rest of the update goes through, as with the other protect_* triggers. The SQL editor
-- and the service role are not touched.

CREATE OR REPLACE FUNCTION public.protect_article_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- A trigger function, never called through the API (see 20261013180000)
REVOKE EXECUTE ON FUNCTION public.protect_article_author() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_article_author() TO service_role;

DROP TRIGGER IF EXISTS protect_article_author ON public.articles;
CREATE TRIGGER protect_article_author
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.protect_article_author();
