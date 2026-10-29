-- Live blogs: an article becomes a live blog (live_status 'live', later 'ended') and gets short
-- updates that appear on the article page while it runs. Readers get new updates through Realtime
-- (postgres_changes, so RLS decides what reaches whom); the people who may edit the article post them.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS live_status text;
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_live_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_live_status_check CHECK (live_status IN ('live', 'ended'));

CREATE INDEX IF NOT EXISTS idx_articles_live ON public.articles (live_status) WHERE live_status = 'live';

CREATE TABLE IF NOT EXISTS public.article_live_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  -- Kept when the author deletes their account: the update belongs to the article
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  title text CHECK (char_length(title) <= 200),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  image_url text CHECK (image_url IS NULL OR (char_length(image_url) <= 1000 AND image_url ~ '^https://')),
  is_key boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_updates_article ON public.article_live_updates (article_id, created_at DESC);

ALTER TABLE public.article_live_updates ENABLE ROW LEVEL SECURITY;

-- Who may write to an article: its author, accepted collaborators and admins (as for the article itself)
CREATE OR REPLACE FUNCTION public.can_edit_article(_article_id uuid)
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
        a.user_id = auth.uid()
        OR public.is_article_collaborator(auth.uid(), a.id)
        OR public.has_role(auth.uid(), 'admin')
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_article(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_article(uuid) TO authenticated;

DROP POLICY IF EXISTS "Live updates of visible articles are readable" ON public.article_live_updates;
CREATE POLICY "Live updates of visible articles are readable"
  ON public.article_live_updates FOR SELECT
  TO anon, authenticated
  USING (public.can_view_article(article_id));

DROP POLICY IF EXISTS "Editors of the article post live updates" ON public.article_live_updates;
CREATE POLICY "Editors of the article post live updates"
  ON public.article_live_updates FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_edit_article(article_id));

DROP POLICY IF EXISTS "Editors of the article change live updates" ON public.article_live_updates;
CREATE POLICY "Editors of the article change live updates"
  ON public.article_live_updates FOR UPDATE
  TO authenticated
  USING (public.can_edit_article(article_id))
  WITH CHECK (public.can_edit_article(article_id));

DROP POLICY IF EXISTS "Editors of the article delete live updates" ON public.article_live_updates;
CREATE POLICY "Editors of the article delete live updates"
  ON public.article_live_updates FOR DELETE
  TO authenticated
  USING (public.can_edit_article(article_id));

-- An edit keeps who wrote the update, where and when; it only moves updated_at
CREATE OR REPLACE FUNCTION public.guard_live_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.article_id := OLD.article_id;
  NEW.author_id := OLD.author_id;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_live_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_live_update ON public.article_live_updates;
CREATE TRIGGER guard_live_update
  BEFORE UPDATE ON public.article_live_updates
  FOR EACH ROW EXECUTE FUNCTION public.guard_live_update();

-- A new update counts as a change of the article (sitemaps, dateModified, "updated" sorting)
CREATE OR REPLACE FUNCTION public.touch_article_on_live_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.articles SET updated_at = now() WHERE id = NEW.article_id;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_article_on_live_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS touch_article_on_live_update ON public.article_live_updates;
CREATE TRIGGER touch_article_on_live_update
  AFTER INSERT ON public.article_live_updates
  FOR EACH ROW EXECUTE FUNCTION public.touch_article_on_live_update();

-- Realtime: readers of a running live blog get inserts, edits and deletions pushed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'article_live_updates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.article_live_updates;
  END IF;
END;
$$;
