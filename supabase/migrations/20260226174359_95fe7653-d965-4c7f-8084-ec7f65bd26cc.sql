
-- Drop the restrictive authenticated-only SELECT policy
DROP POLICY "Profiles viewable by authenticated users" ON public.profiles;

-- Create a public SELECT policy so author names show for all visitors
CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);
