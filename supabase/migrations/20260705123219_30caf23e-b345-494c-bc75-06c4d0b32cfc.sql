-- Remove public read access to the API cache table.
-- Cached third-party API responses (which can embed external service keys in
-- pagination URLs) must never be readable by anonymous or authenticated users.
-- All reads/writes happen server-side via the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Cache readable by everyone" ON public.api_cache;

-- Revoke direct Data API read access from public-facing roles.
REVOKE SELECT ON public.api_cache FROM anon;
REVOKE SELECT ON public.api_cache FROM authenticated;

-- Explicit deny policy so any future/implicit access is blocked by default.
CREATE POLICY "No public read access to cache"
  ON public.api_cache FOR SELECT
  USING (false);