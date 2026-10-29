
-- Restrict write access to service_role only (edge functions use service_role key)
DROP POLICY "Service role can insert cache" ON public.api_cache;
DROP POLICY "Service role can update cache" ON public.api_cache;
DROP POLICY "Service role can delete cache" ON public.api_cache;

CREATE POLICY "Only service role can insert cache"
  ON public.api_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update cache"
  ON public.api_cache FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete cache"
  ON public.api_cache FOR DELETE
  USING (auth.role() = 'service_role');
