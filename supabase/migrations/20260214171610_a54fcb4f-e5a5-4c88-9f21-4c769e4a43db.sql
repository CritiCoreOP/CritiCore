
-- Replace the overly permissive public SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
