-- ===== Article status pipeline =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
    CREATE TYPE public.article_status AS ENUM ('idea', 'research', 'writing', 'review', 'published');
  END IF;
END$$;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status public.article_status NOT NULL DEFAULT 'idea';

-- Backfill from existing published flag
UPDATE public.articles SET status = 'published' WHERE published = true AND status = 'idea';
UPDATE public.articles SET status = 'writing' WHERE published = false AND status = 'idea';

-- ===== Internal briefings =====
CREATE TABLE public.article_briefings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_briefings TO authenticated;
GRANT ALL ON public.article_briefings TO service_role;

ALTER TABLE public.article_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Briefings readable by team"
ON public.article_briefings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
  OR public.is_article_collaborator(auth.uid(), article_id)
);

CREATE POLICY "Briefings insertable by team"
ON public.article_briefings FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
    OR public.is_article_collaborator(auth.uid(), article_id)
  )
);

CREATE POLICY "Briefings updatable by team"
ON public.article_briefings FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
  OR public.is_article_collaborator(auth.uid(), article_id)
);

CREATE POLICY "Briefings deletable by author or owner"
ON public.article_briefings FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
);

CREATE TRIGGER update_article_briefings_updated_at
BEFORE UPDATE ON public.article_briefings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Inline editorial comments =====
CREATE TABLE public.article_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anchor_id text NOT NULL,
  quoted_text text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_comments TO authenticated;
GRANT ALL ON public.article_comments TO service_role;

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments readable by team"
ON public.article_comments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
  OR public.is_article_collaborator(auth.uid(), article_id)
);

CREATE POLICY "Comments insertable by team"
ON public.article_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
    OR public.is_article_collaborator(auth.uid(), article_id)
  )
);

CREATE POLICY "Comments updatable by team"
ON public.article_comments FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
  OR public.is_article_collaborator(auth.uid(), article_id)
);

CREATE POLICY "Comments deletable by author or owner"
ON public.article_comments FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.user_id = auth.uid())
);

CREATE TRIGGER update_article_comments_updated_at
BEFORE UPDATE ON public.article_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_article_briefings_article ON public.article_briefings(article_id);
CREATE INDEX idx_article_comments_article ON public.article_comments(article_id);