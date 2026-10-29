
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Press profiles viewable by everyone" ON public.press_profiles;

-- Users can view their own press profile
CREATE POLICY "Users can view own press profile"
  ON public.press_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all press profiles
CREATE POLICY "Admins can view all press profiles"
  ON public.press_profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
