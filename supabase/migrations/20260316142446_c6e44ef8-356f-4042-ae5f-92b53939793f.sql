
-- Add icon_url to forum_flairs for custom images/GIFs
ALTER TABLE public.forum_flairs ADD COLUMN icon_url TEXT;

-- Add status_icon_url to forum_user_flair_assignments for user-uploaded status images
ALTER TABLE public.forum_user_flair_assignments ADD COLUMN status_icon_url TEXT;
