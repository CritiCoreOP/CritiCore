-- Self-service account deletion: removes everything a person wrote or saved, before the
-- delete-account function deletes the login itself. Only the service role may call it;
-- the function checks who is asking.
--
-- Stays: editorial articles (they belong to the publication), shared spaces other people use
-- (shared watchlists, workspaces, forum communities) and moderation records.

CREATE OR REPLACE FUNCTION public.purge_user_data(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;

  DELETE FROM public.review_reactions WHERE user_id = _uid;
  DELETE FROM public.reviews WHERE user_id = _uid;
  DELETE FROM public.comments WHERE user_id = _uid;
  DELETE FROM public.article_reactions WHERE user_id = _uid;
  DELETE FROM public.forum_votes WHERE user_id = _uid;
  DELETE FROM public.forum_comments WHERE user_id = _uid;
  DELETE FROM public.forum_posts WHERE user_id = _uid;
  DELETE FROM public.forum_user_flair_assignments WHERE user_id = _uid;
  DELETE FROM public.forum_community_members WHERE user_id = _uid;
  DELETE FROM public.poll_votes WHERE user_id = _uid;
  DELETE FROM public.custom_lists WHERE user_id = _uid;
  DELETE FROM public.user_saves WHERE user_id = _uid;
  DELETE FROM public.user_watchlist WHERE user_id = _uid;
  DELETE FROM public.media_status WHERE user_id = _uid;
  DELETE FROM public.shared_watchlist_members WHERE user_id = _uid;
  DELETE FROM public.follows WHERE user_id = _uid;
  DELETE FROM public.friendships WHERE requester_id = _uid OR addressee_id = _uid;
  DELETE FROM public.notifications WHERE user_id = _uid;
  DELETE FROM public.activity_feed WHERE user_id = _uid;
  DELETE FROM public.release_subscriptions WHERE user_id = _uid;
  DELETE FROM public.newsletter_subscribers WHERE user_id = _uid;
  DELETE FROM public.user_badges WHERE user_id = _uid;
  DELETE FROM public.user_warnings WHERE user_id = _uid;
  DELETE FROM public.username_history WHERE user_id = _uid;
  DELETE FROM public.support_tickets WHERE user_id = _uid;
  DELETE FROM public.api_keys WHERE user_id = _uid;
  DELETE FROM public.api_applications WHERE user_id = _uid;
  DELETE FROM public.social_assets WHERE user_id = _uid;
  DELETE FROM public.rw_members WHERE user_id = _uid;
  DELETE FROM public.article_collaborators WHERE user_id = _uid;
  DELETE FROM public.press_profiles WHERE user_id = _uid;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE user_id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_data(uuid) TO service_role;
