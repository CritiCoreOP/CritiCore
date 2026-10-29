
-- Add trusted column to press_profiles (trusted users can publish immediately)
ALTER TABLE public.press_profiles ADD COLUMN IF NOT EXISTS trusted boolean NOT NULL DEFAULT false;

-- Create a function to check if a press user can publish directly
-- Returns true if: admin, trusted press, or has 2+ approved (published) articles
CREATE OR REPLACE FUNCTION public.can_press_publish(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins always can
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR
    -- Trusted press can
    EXISTS (SELECT 1 FROM public.press_profiles WHERE user_id = _user_id AND verified = true AND trusted = true)
    OR
    -- Press with 2+ published articles can
    (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'press')
      AND (SELECT count(*) FROM public.articles WHERE user_id = _user_id AND published = true) >= 2
    )
$$;
