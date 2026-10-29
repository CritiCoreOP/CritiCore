
-- Add language and translation_group to articles
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS translation_group uuid DEFAULT NULL;

-- Index for finding translations of the same article
CREATE INDEX IF NOT EXISTS idx_articles_translation_group ON public.articles(translation_group) WHERE translation_group IS NOT NULL;
