
-- ============================================
-- FIX 1: Restrict ban_reason column access
-- Use column-level privileges so PostgREST hides it from anon/authenticated.
-- Owners/admins read it via the get_own_ban_info() RPC and admin queries (service_role).
-- ============================================
REVOKE SELECT (ban_reason) ON public.profiles FROM anon, authenticated;

-- ============================================
-- FIX 2: User-scoped realtime channels for notifications & activity feed
-- ============================================
DROP POLICY IF EXISTS "Scoped realtime channel access" ON realtime.messages;

CREATE POLICY "Scoped realtime channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- User-scoped notification channels
  (topic = ('notifications-realtime-' || (auth.uid())::text))
  OR (topic = ('app-notifications-realtime-' || (auth.uid())::text))
  OR (topic = ('activity-feed-realtime-' || (auth.uid())::text))
  -- Forum post channels (public discussion)
  OR (topic LIKE 'forum-post-%')
  -- Redaim workspace channels — membership-gated
  OR ((topic LIKE 'rw-pages-%') AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-pages-', ''))::uuid))
  OR ((topic LIKE 'rw-presence-%') AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-presence-', ''))::uuid))
  OR ((topic LIKE 'rw-collab-%') AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-collab-', ''))::uuid))
  OR ((topic LIKE 'rw-live-%') AND public.is_rw_member(auth.uid(), (regexp_replace(topic, '^rw-live-', ''))::uuid))
);

-- ============================================
-- FIX 3: Enforce path ownership on storage uploads
-- Files must be uploaded under a folder named by the user's uuid: <uid>/filename
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can upload forum images" ON storage.objects;
CREATE POLICY "Users can upload forum images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Authenticated users can upload article images" ON storage.objects;
CREATE POLICY "Users can upload article images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'article-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Authenticated users can upload media images" ON storage.objects;
CREATE POLICY "Users can upload media images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
