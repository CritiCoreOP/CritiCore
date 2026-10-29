-- 1. Fix poll_votes: Replace public SELECT with own-votes-only policy
DROP POLICY IF EXISTS "Votes viewable by everyone" ON public.poll_votes;

CREATE POLICY "Users can view own votes"
ON public.poll_votes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2. Create aggregate function for vote counts (no user_id exposed)
CREATE OR REPLACE FUNCTION public.get_poll_vote_counts(p_poll_id uuid)
RETURNS TABLE(option_id uuid, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pv.option_id, COUNT(*)::bigint
  FROM poll_votes pv
  WHERE pv.poll_id = p_poll_id
  GROUP BY pv.option_id;
$$;

-- 3. Create function for aggregated reasons (no user_id exposed)
CREATE OR REPLACE FUNCTION public.get_poll_reasons(p_poll_id uuid)
RETURNS TABLE(reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pv.reason
  FROM poll_votes pv
  WHERE pv.poll_id = p_poll_id AND pv.reason IS NOT NULL AND pv.reason != '';
$$;

-- 4. Realtime channel authorization
-- (RLS auf realtime.messages ist bei Supabase schon aktiv)

CREATE POLICY "Authenticated users can listen to their own notification channels"
ON realtime.messages FOR SELECT TO authenticated
USING (
  topic = 'notifications-realtime'
  OR topic = 'app-notifications-realtime'
  OR topic = 'activity-feed-realtime'
  OR topic LIKE 'forum-post-%'
  OR topic LIKE 'rw-pages-%'
  OR topic LIKE 'rw-presence-%'
  OR topic LIKE 'rw-collab-%'
  OR topic LIKE 'rw-live-%'
);