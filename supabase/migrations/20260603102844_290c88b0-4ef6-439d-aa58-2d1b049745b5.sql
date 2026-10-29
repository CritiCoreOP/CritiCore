DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_feed;

CREATE POLICY "Users can insert own activity"
ON public.activity_feed
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND activity_type IN (
    'review',
    'review_like',
    'follow',
    'friend_accepted',
    'media_watched',
    'media_played',
    'media_status',
    'list_created',
    'badge_earned',
    'article_published',
    'poll_created'
  )
  AND length(title) > 0
  AND length(title) <= 300
  AND (description IS NULL OR length(description) <= 1000)
);