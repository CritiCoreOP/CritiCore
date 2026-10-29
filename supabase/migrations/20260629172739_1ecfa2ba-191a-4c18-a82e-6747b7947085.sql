-- Fix 1: Restrict username_history SELECT to the owning user
DROP POLICY IF EXISTS "Username history viewable by everyone" ON public.username_history;

CREATE POLICY "Users can view their own username history"
ON public.username_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix 2: Prevent invite_token from being readable via SELECT by client roles.
-- Column-level security: revoke read on the sensitive token column while
-- leaving the rest of the row readable. service_role (backend) keeps full access.
REVOKE SELECT (invite_token) ON public.article_collaborators FROM anon, authenticated;