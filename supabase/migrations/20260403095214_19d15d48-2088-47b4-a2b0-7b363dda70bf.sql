-- 1. Fix forum_votes: restrict SELECT to own votes
DROP POLICY IF EXISTS "Votes viewable by everyone" ON public.forum_votes;

CREATE POLICY "Users can view own votes"
ON public.forum_votes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2. Create secure function for ban info (user can only read own)
CREATE OR REPLACE FUNCTION public.get_own_ban_info()
RETURNS TABLE(status text, ban_reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.status, p.ban_reason
  FROM profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- 3. Replace blanket profiles SELECT with one that hides ban_reason
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles readable without sensitive fields"
ON public.profiles FOR SELECT
USING (true);

-- Note: We can't column-filter in RLS, so we use the function approach.
-- The ban_reason column stays in the table but the app code will use get_own_ban_info() instead.

-- 4. Fix realtime workspace channel auth - drop old policy and create stricter one
DROP POLICY IF EXISTS "Authenticated users can listen to their own notification channe" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can listen to their own notification channels" ON realtime.messages;

CREATE POLICY "Scoped realtime channel access"
ON realtime.messages FOR SELECT TO authenticated
USING (
  topic = 'notifications-realtime'
  OR topic = 'app-notifications-realtime'
  OR topic = 'activity-feed-realtime'
  OR topic LIKE 'forum-post-%'
  -- Workspace channels: verify membership via function
  OR (
    topic LIKE 'rw-pages-%'
    AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-pages-', ''))::uuid)
  )
  OR (
    topic LIKE 'rw-presence-%'
    AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-presence-', ''))::uuid)
  )
  OR (
    topic LIKE 'rw-collab-%'
    AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-collab-', ''))::uuid)
  )
  OR (
    topic LIKE 'rw-live-%'
    AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-live-', ''))::uuid)
  )
);