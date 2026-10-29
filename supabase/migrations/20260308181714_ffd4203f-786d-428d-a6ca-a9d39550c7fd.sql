
-- Add press_logo column to press_profiles for storing the logo key (e.g. 'ign', 'gamestar', 'tgn', etc.)
ALTER TABLE public.press_profiles ADD COLUMN press_logo text;
