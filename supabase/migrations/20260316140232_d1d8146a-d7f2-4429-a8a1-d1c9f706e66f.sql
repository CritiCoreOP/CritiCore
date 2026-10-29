
CREATE OR REPLACE FUNCTION public.forum_vote(p_user_id uuid, p_target_id uuid, p_target_type text, p_vote_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_existing_vote TEXT;
  v_target_id_text TEXT := p_target_id::TEXT;
  v_result JSONB;
BEGIN
  IF p_user_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT vote_type INTO v_existing_vote
  FROM forum_votes
  WHERE user_id = p_user_id AND target_id = v_target_id_text AND target_type = p_target_type;

  IF v_existing_vote IS NOT NULL THEN
    DELETE FROM forum_votes 
    WHERE user_id = p_user_id AND target_id = v_target_id_text AND target_type = p_target_type;
    
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

  IF v_existing_vote = p_vote_type THEN
    v_result := jsonb_build_object('action', 'removed', 'vote_type', null);
  ELSE
    INSERT INTO forum_votes (user_id, target_id, target_type, vote_type)
    VALUES (p_user_id, v_target_id_text, p_target_type, p_vote_type);
    
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
