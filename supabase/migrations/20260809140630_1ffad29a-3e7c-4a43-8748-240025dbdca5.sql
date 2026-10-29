DROP POLICY IF EXISTS "Public can view accepted collaborators" ON public.article_collaborators;
CREATE POLICY "Public can view accepted collaborators"
ON public.article_collaborators FOR SELECT
USING (accepted = true AND invite_token IS NULL AND public.can_view_article(article_id));

DROP POLICY IF EXISTS "Users can view own moderation logs" ON public.moderation_logs;
CREATE POLICY "Users can view own moderation logs"
ON public.moderation_logs FOR SELECT
TO authenticated
USING (target_type = 'user' AND target_id = (auth.uid())::text);