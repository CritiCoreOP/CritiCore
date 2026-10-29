-- 1. article_collaborators: prevent invite_token exposure via public SELECT
DROP POLICY IF EXISTS "Public can view accepted collaborators" ON public.article_collaborators;
CREATE POLICY "Public can view accepted collaborators"
ON public.article_collaborators
FOR SELECT
USING (accepted = true AND invite_token IS NULL);

-- 2. profiles: hide ban_reason from public via column-level privileges
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, display_name, avatar_url, bio, status, created_at, updated_at,
  is_official, username, username_changed_at, display_name_changed_at,
  onboarding_completed_at, post_karma, comment_karma, forum_onboarded_at
) ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;