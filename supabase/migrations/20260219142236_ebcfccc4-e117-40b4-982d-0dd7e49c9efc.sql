
-- API Keys table for developer access
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL DEFAULT 'My API Key',
  requests_today integer NOT NULL DEFAULT 0,
  requests_total integer NOT NULL DEFAULT 0,
  rate_limit integer NOT NULL DEFAULT 100,
  last_request_at timestamp with time zone,
  last_reset_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API keys
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys (e.g., deactivate)
CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all API keys
CREATE POLICY "Admins can view all API keys"
  ON public.api_keys FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any API key
CREATE POLICY "Admins can update any API key"
  ON public.api_keys FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role needs to read/update keys for rate limiting (done via service role key in edge function)

-- Trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast key lookups by prefix
CREATE INDEX idx_api_keys_prefix ON public.api_keys (key_prefix) WHERE active = true;
