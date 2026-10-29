
CREATE TABLE public.article_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id, reaction_type)
);

ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Article reactions viewable by everyone" ON public.article_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON public.article_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.article_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
