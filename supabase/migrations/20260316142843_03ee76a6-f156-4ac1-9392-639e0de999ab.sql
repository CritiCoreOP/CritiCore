
-- Add status_icon_url to forum_communities for custom status images
ALTER TABLE public.forum_communities ADD COLUMN status_icon_url TEXT;
