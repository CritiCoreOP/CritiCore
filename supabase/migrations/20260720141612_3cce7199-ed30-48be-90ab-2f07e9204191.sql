
CREATE TABLE public.media_enrichment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie','tv','game')),
  source_id TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  description_de TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_type, source_id)
);

CREATE INDEX idx_media_enrichment_tags ON public.media_enrichment USING GIN (tags);
CREATE INDEX idx_media_enrichment_categories ON public.media_enrichment USING GIN (categories);
CREATE INDEX idx_media_enrichment_type ON public.media_enrichment (media_type);

GRANT SELECT ON public.media_enrichment TO anon, authenticated;
GRANT ALL ON public.media_enrichment TO service_role;

ALTER TABLE public.media_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_enrichment public read"
  ON public.media_enrichment FOR SELECT
  USING (true);

CREATE POLICY "media_enrichment service write"
  ON public.media_enrichment FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
