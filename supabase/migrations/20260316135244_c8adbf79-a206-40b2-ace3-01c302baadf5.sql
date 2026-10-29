
-- 1. Add edited_at and is_edited to forum_posts and forum_comments
ALTER TABLE public.forum_posts 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.forum_comments 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false;

-- 2. Add karma columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS post_karma INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_karma INTEGER NOT NULL DEFAULT 0;

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. Create atomic vote function
CREATE OR REPLACE FUNCTION public.forum_vote(
  p_user_id UUID,
  p_target_id UUID,
  p_target_type TEXT,
  p_vote_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_vote TEXT;
  v_result JSONB;
BEGIN
  -- Check auth
  IF p_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Get existing vote
  SELECT vote_type INTO v_existing_vote
  FROM forum_votes
  WHERE user_id = p_user_id AND target_id = p_target_id::TEXT AND target_type = p_target_type;

  IF v_existing_vote IS NOT NULL THEN
    -- Remove existing vote
    DELETE FROM forum_votes 
    WHERE user_id = p_user_id AND target_id = p_target_id::TEXT AND target_type = p_target_type;
    
    IF p_target_type = 'post' THEN
      IF v_existing_vote = 'up' THEN
        UPDATE forum_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = p_target_id;
      ELSE
        UPDATE forum_posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = p_target_id;
      END IF;
    ELSE
      IF v_existing_vote = 'up' THEN
        UPDATE forum_comments SET upvotes = GREATEST(0, upvotes - 1) WHERE id = p_target_id;
      ELSE
        UPDATE forum_comments SET downvotes = GREATEST(0, downvotes - 1) WHERE id = p_target_id;
      END IF;
    END IF;
  END IF;

  -- If toggling same vote, just remove (already done above)
  IF v_existing_vote = p_vote_type THEN
    v_result := jsonb_build_object('action', 'removed', 'vote_type', null);
  ELSE
    -- Insert new vote
    INSERT INTO forum_votes (user_id, target_id, target_type, vote_type)
    VALUES (p_user_id, p_target_id::TEXT, p_target_type, p_vote_type);
    
    IF p_target_type = 'post' THEN
      IF p_vote_type = 'up' THEN
        UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = p_target_id;
      ELSE
        UPDATE forum_posts SET downvotes = downvotes + 1 WHERE id = p_target_id;
      END IF;
    ELSE
      IF p_vote_type = 'up' THEN
        UPDATE forum_comments SET upvotes = upvotes + 1 WHERE id = p_target_id;
      ELSE
        UPDATE forum_comments SET downvotes = downvotes + 1 WHERE id = p_target_id;
      END IF;
    END IF;
    
    v_result := jsonb_build_object('action', 'voted', 'vote_type', p_vote_type);
  END IF;

  RETURN v_result;
END;
$$;

-- 5. Karma update function (recalculates from votes)
CREATE OR REPLACE FUNCTION public.recalculate_karma(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_karma INTEGER;
  v_comment_karma INTEGER;
BEGIN
  SELECT COALESCE(SUM(upvotes - downvotes), 0) INTO v_post_karma
  FROM forum_posts WHERE user_id = p_user_id;
  
  SELECT COALESCE(SUM(upvotes - downvotes), 0) INTO v_comment_karma
  FROM forum_comments WHERE user_id = p_user_id;
  
  UPDATE profiles 
  SET post_karma = v_post_karma, comment_karma = v_comment_karma
  WHERE user_id = p_user_id;
END;
$$;

-- 6. Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read, created_at DESC);

-- 7. Create index for full-text search on forum_posts
CREATE INDEX IF NOT EXISTS idx_forum_posts_search ON public.forum_posts 
  USING gin(to_tsvector('german', title || ' ' || content));

CREATE INDEX IF NOT EXISTS idx_forum_communities_search ON public.forum_communities 
  USING gin(to_tsvector('german', name || ' ' || COALESCE(description, '')));
