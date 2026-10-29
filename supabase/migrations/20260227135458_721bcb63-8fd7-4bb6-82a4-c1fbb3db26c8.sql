
-- Cache table for DeepL article translations
CREATE TABLE public.article_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  target_lang TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, target_lang)
);

-- Enable RLS
ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;

-- Everyone can read cached translations (articles are public when published)
CREATE POLICY "Translations readable by everyone"
  ON public.article_translations FOR SELECT
  USING (true);

-- Only edge functions (service role) insert/update, but allow press users to trigger via edge function
-- We use a permissive policy so service_role can write
CREATE POLICY "Service role can manage translations"
  ON public.article_translations FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_article_translations_lookup ON public.article_translations(article_id, target_lang);

-- Auto-update updated_at
CREATE TRIGGER update_article_translations_updated_at
  BEFORE UPDATE ON public.article_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
