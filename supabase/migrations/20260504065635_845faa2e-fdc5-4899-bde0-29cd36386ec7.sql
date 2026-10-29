ALTER TABLE public.api_keys 
  ADD COLUMN IF NOT EXISTS api_version text NOT NULL DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_api_keys_version ON public.api_keys(api_version);

-- Normalize tier from existing rate_limit
UPDATE public.api_keys SET tier = CASE
  WHEN rate_limit >= 50000 THEN 'admin'
  WHEN rate_limit >= 5000 THEN 'pro'
  ELSE 'free'
END WHERE tier = 'free';