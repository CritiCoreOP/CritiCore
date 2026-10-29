-- 1. Allow admins to read newsletter subscribers (operational management)
CREATE POLICY "Admins can view subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Scope forum-post realtime channels to existing posts only
DROP POLICY IF EXISTS "Scoped realtime channel access" ON realtime.messages;

CREATE POLICY "Scoped realtime channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (topic = ('notifications-realtime-'::text || (auth.uid())::text))
  OR (topic = ('app-notifications-realtime-'::text || (auth.uid())::text))
  OR (topic = ('activity-feed-realtime-'::text || (auth.uid())::text))
  OR (
    (topic ~ '^forum-post-[0-9a-fA-F-]{36}$')
    AND EXISTS (
      SELECT 1 FROM public.forum_posts fp
      WHERE fp.id = (regexp_replace(topic, '^forum-post-'::text, ''::text))::uuid
    )
  )
  OR ((topic ~~ 'rw-pages-%'::text) AND is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-pages-'::text, ''::text))::uuid))
  OR ((topic ~~ 'rw-presence-%'::text) AND is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-presence-'::text, ''::text))::uuid))
  OR ((topic ~~ 'rw-collab-%'::text) AND is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-collab-'::text, ''::text))::uuid))
  OR ((topic ~~ 'rw-live-%'::text) AND is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-live-'::text, ''::text))::uuid))
);