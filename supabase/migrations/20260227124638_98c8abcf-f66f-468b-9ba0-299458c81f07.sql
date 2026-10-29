
-- Add username and change tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS username_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS display_name_changed_at timestamp with time zone;

-- Create username history table
CREATE TABLE public.username_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  old_username text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Username history viewable by everyone"
ON public.username_history FOR SELECT
USING (true);

CREATE POLICY "System can insert history"
ON public.username_history FOR INSERT
WITH CHECK (auth.uid() = user_id);
