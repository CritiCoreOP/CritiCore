-- Karma and vote counters could be set by hand: users may update their own profile and their own
-- forum posts and comments, and nothing stopped those requests from changing post_karma,
-- comment_karma, upvotes or downvotes (karma also unlocks badges in claim_badges).
--
-- These numbers are derived data. Whenever a user's own request (anon/authenticated, not an admin)
-- writes such a row, they are recalculated from the votes instead of taken from the request.
-- forum_vote() and recalculate_karma() run in the user's session too; they write the same numbers
-- the recalculation arrives at (the vote row is inserted or deleted before the counter changes), so
-- real voting works as before. The SQL editor and the service role are not touched.
-- Existing values stay as they are.

-- Distinct voters, so duplicate vote rows count once (forum_votes.target_id is a uuid)
CREATE OR REPLACE FUNCTION public.forum_vote_count(p_target_id uuid, p_target_type text, p_vote_type text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT user_id)::integer
  FROM public.forum_votes
  WHERE target_id = p_target_id AND target_type = p_target_type AND vote_type = p_vote_type;
$$;

REVOKE ALL ON FUNCTION public.forum_vote_count(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_forum_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_type text := CASE TG_TABLE_NAME WHEN 'forum_posts' THEN 'post' ELSE 'comment' END;
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A new post or comment has no votes yet
    NEW.upvotes := 0;
    NEW.downvotes := 0;
  ELSIF NEW.upvotes IS DISTINCT FROM OLD.upvotes OR NEW.downvotes IS DISTINCT FROM OLD.downvotes THEN
    NEW.upvotes := public.forum_vote_count(NEW.id, v_type, 'up');
    NEW.downvotes := public.forum_vote_count(NEW.id, v_type, 'down');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_forum_post_votes ON public.forum_posts;
CREATE TRIGGER protect_forum_post_votes
  BEFORE INSERT OR UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_forum_vote_counts();

DROP TRIGGER IF EXISTS protect_forum_comment_votes ON public.forum_comments;
CREATE TRIGGER protect_forum_comment_votes
  BEFORE INSERT OR UPDATE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.protect_forum_vote_counts();

-- Profile protection as in 20261003150000, plus karma recalculated from the vote counters
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins may set privileged fields freely
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'active';
    NEW.is_official := false;
    NEW.ban_reason := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.status := OLD.status;
    NEW.is_official := OLD.is_official;
    NEW.ban_reason := OLD.ban_reason;
  END IF;

  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    NEW.staff_roles := CASE WHEN TG_OP = 'UPDATE' THEN OLD.staff_roles ELSE '{}'::text[] END;
    -- Same sums as recalculate_karma()
    NEW.post_karma := (SELECT COALESCE(SUM(upvotes - downvotes), 0) FROM public.forum_posts WHERE user_id = NEW.user_id);
    NEW.comment_karma := (SELECT COALESCE(SUM(upvotes - downvotes), 0) FROM public.forum_comments WHERE user_id = NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;
