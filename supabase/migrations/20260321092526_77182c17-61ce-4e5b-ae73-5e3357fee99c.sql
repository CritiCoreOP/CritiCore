
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_confirm_token ON public.newsletter_subscribers (confirm_token) WHERE confirm_token IS NOT NULL;
