-- Supabase security advisor (lints 0028/0029): SECURITY DEFINER functions that guests or signed-in
-- users can call directly through /rest/v1/rpc. Functions get EXECUTE for PUBLIC when created, and
-- Supabase's default privileges add anon and authenticated, so each function here gets exactly the
-- callers it needs.
--
-- Some must stay callable by everyone: RLS policies that apply to all roles call has_role,
-- can_view_article, is_article_collaborator, is_friend, is_rw_member and is_shared_watchlist_member,
-- and a policy check fails with "permission denied" when the caller may not execute a function in it.
-- They also have to stay SECURITY DEFINER, because the tables they read are protected by policies
-- that call them. The polls and the ticket status page are public pages. The membership helpers now
-- only answer for the caller: before, anyone could ask whether two users are friends or who is in a
-- workspace. Policies and functions always pass auth.uid() as the user, so nothing else changes.

-- 1. Triggers and internal helpers: nobody calls these through the API. Triggers fire without an
--    EXECUTE check; cron, the email worker and the service role keep access.
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.auto_approve_api_application()',
    'public.cleanup_expired_otps()',
    'public.email_queue_wake()',
    'public.email_queue_dispatch()',
    'public.enforce_critic_review_flag()',
    'public.handle_new_user()',
    'public.protect_forum_community_privileged_fields()',
    'public.protect_forum_member_role()',
    'public.protect_press_privileged_fields()',
    'public.protect_profile_privileged_fields()',
    'public.protect_user_warning_fields()',
    'public.protect_forum_vote_counts()',
    -- No longer used by the site (the explore page reads tables directly) or by any function
    'public.explore_media_feed(integer, integer, text)',
    'public.safe_ban_reason(uuid, text)'
  ] LOOP
    -- protect_forum_vote_counts comes with 20261013120000; skip whatever does not exist
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    END IF;
  END LOOP;
END $$;

-- 2. Only for signed-in users: each of these needs auth.uid() and does nothing useful for a guest
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.accept_article_invite(text)',
    'public.accept_rw_invite(text)',
    'public.admin_list_ban_reasons()',
    'public.can_press_publish(uuid)',
    'public.claim_badges()',
    'public.create_rw_invite(uuid, text, text)',
    'public.create_rw_workspace(text)',
    'public.forum_vote(uuid, uuid, text, text)',
    'public.get_own_ban_info()',
    'public.recalculate_karma(uuid)',
    'public.sync_anilist_media(integer, jsonb)',
    -- Only in policies for authenticated and inside create_rw_invite
    'public.is_rw_role(uuid, uuid, text)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
    END IF;
  END LOOP;
END $$;

-- 3. Membership helpers answer only for the caller (same definitions as before plus that condition)
CREATE OR REPLACE FUNCTION public.is_friend(_user_id uuid, _friend_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() IN (_user_id, _friend_id)
    AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
        AND ((requester_id = _user_id AND addressee_id = _friend_id)
          OR (requester_id = _friend_id AND addressee_id = _user_id))
    )
$function$;

CREATE OR REPLACE FUNCTION public.is_shared_watchlist_member(_user_id uuid, _watchlist_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shared_watchlist_members
      WHERE watchlist_id = _watchlist_id AND user_id = _user_id
    )
$function$;

CREATE OR REPLACE FUNCTION public.is_rw_member(_user_id uuid, _workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.rw_members WHERE user_id = _user_id AND workspace_id = _workspace_id)
$function$;

CREATE OR REPLACE FUNCTION public.is_rw_role(_user_id uuid, _workspace_id uuid, _role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.rw_members WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role)
$function$;

CREATE OR REPLACE FUNCTION public.is_article_collaborator(_user_id uuid, _article_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.article_collaborators
      WHERE article_id = _article_id
        AND user_id = _user_id
        AND accepted = true
    )
$function$;
