-- Add season/episode columns to reviews for granular series rating
ALTER TABLE public.reviews
ADD COLUMN season_number integer DEFAULT NULL,
ADD COLUMN episode_number integer DEFAULT NULL;

-- Index for efficient querying of season/episode reviews
CREATE INDEX idx_reviews_season_episode ON public.reviews (media_id, media_type, season_number, episode_number);

-- Add unique constraint to prevent duplicate reviews per user per target
CREATE UNIQUE INDEX idx_reviews_unique_target ON public.reviews (user_id, media_id, media_type, COALESCE(season_number, -1), COALESCE(episode_number, -1));