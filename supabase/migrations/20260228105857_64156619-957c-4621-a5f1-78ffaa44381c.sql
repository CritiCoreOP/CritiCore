
-- Server-side API response cache
CREATE TABLE public.api_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text NOT NULL UNIQUE,
  response_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL
);

-- Index for fast lookups and cleanup
CREATE INDEX idx_api_cache_key ON public.api_cache (cache_key);
CREATE INDEX idx_api_cache_expires ON public.api_cache (expires_at);

-- Enable RLS but allow edge functions (service role) full access
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Public read so edge functions with anon key can read cached data
CREATE POLICY "Cache readable by everyone"
  ON public.api_cache FOR SELECT
  USING (true);

-- Only service role (edge functions) can insert/update/delete
CREATE POLICY "Service role can insert cache"
  ON public.api_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON public.api_cache FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete cache"
  ON public.api_cache FOR DELETE
  USING (true);
