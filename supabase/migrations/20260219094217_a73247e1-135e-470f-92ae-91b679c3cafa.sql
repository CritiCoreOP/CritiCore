-- Add is_official column to profiles
ALTER TABLE public.profiles ADD COLUMN is_official boolean NOT NULL DEFAULT false;

-- Only admins can set the is_official flag
-- (existing update policies already cover user self-update and admin update)